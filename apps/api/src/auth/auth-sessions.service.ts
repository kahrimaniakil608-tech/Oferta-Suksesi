import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface SessionPayload {
  sub: string;
  sid: string;
  version: number;
  kind: "access" | "refresh";
  jti: string;
}

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function assertActiveAccount(
  user: {
    deletedAt: Date | null;
    suspendedAt: Date | null;
    suspendedUntil?: Date | null;
  } | null,
): asserts user is NonNullable<typeof user> {
  if (
    !user ||
    user.deletedAt ||
    (user.suspendedAt &&
      (!user.suspendedUntil || user.suspendedUntil > new Date()))
  )
    throw new UnauthorizedException("Account is unavailable");
}

export function safeAuthUser(user: User) {
  const { passwordHash: _password, authVersion: _version, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthSessionsService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.get<string>("JWT_SECRET") ?? "";
    this.refreshSecret = config.get<string>("JWT_REFRESH_SECRET") ?? "";
    if (!this.accessSecret || !this.refreshSecret)
      throw new Error("JWT_SECRET and JWT_REFRESH_SECRET are required");
  }

  private tokens(user: User, sid: string) {
    const claims = { sub: user.id, sid, version: user.authVersion };
    return {
      accessToken: this.jwt.sign(
        { ...claims, kind: "access", jti: randomUUID() },
        {
          secret: this.accessSecret,
          algorithm: "HS256",
          expiresIn: "8h",
        },
      ),
      refreshToken: this.jwt.sign(
        { ...claims, kind: "refresh", jti: randomUUID() },
        {
          secret: this.refreshSecret,
          algorithm: "HS256",
          expiresIn: "7d",
        },
      ),
      user: safeAuthUser(user),
    };
  }

  private validPayload(payload: SessionPayload, kind: SessionPayload["kind"]) {
    return (
      payload &&
      payload.kind === kind &&
      typeof payload.sub === "string" &&
      !!payload.sub &&
      typeof payload.sid === "string" &&
      /^[0-9a-f-]{36}$/i.test(payload.sid) &&
      Number.isSafeInteger(payload.version) &&
      payload.version >= 0 &&
      typeof payload.jti === "string" &&
      !!payload.jti
    );
  }

  private verify(
    token: string,
    kind: SessionPayload["kind"],
    ignoreExpiration = false,
  ): SessionPayload {
    try {
      const payload = this.jwt.verify<SessionPayload>(token, {
        secret: kind === "access" ? this.accessSecret : this.refreshSecret,
        algorithms: ["HS256"],
        ignoreExpiration,
      });
      if (!this.validPayload(payload, kind))
        throw new Error("Invalid session claims");
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired session");
    }
  }

  async create(user: User) {
    assertActiveAccount(user);
    const sid = randomUUID();
    const result = this.tokens(user, sid);
    await this.prisma.authSession.create({
      data: {
        id: sid,
        userId: user.id,
        refreshTokenHash: tokenHash(result.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });
    return result;
  }

  async refresh(token: string) {
    const payload = this.verify(token, "refresh");
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Session has expired or been revoked");
    }
    assertActiveAccount(session.user);
    if (session.user.authVersion !== payload.version)
      throw new UnauthorizedException("Session has been revoked");

    const currentHash = tokenHash(token);
    if (session.refreshTokenHash !== currentHash) {
      await this.revoke(payload.sid, payload.sub);
      throw new UnauthorizedException(
        "Refresh token reuse detected. Sign in again.",
      );
    }
    const result = this.tokens(session.user, payload.sid);
    // The conditional update has one winner even across API instances. Account changes also invalidate it.
    const rotated = await this.prisma.authSession.updateMany({
      where: {
        id: payload.sid,
        userId: payload.sub,
        refreshTokenHash: currentHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: {
          authVersion: payload.version,
          deletedAt: null,
          OR: [{ suspendedAt: null }, { suspendedUntil: { lte: new Date() } }],
        },
      },
      data: {
        refreshTokenHash: tokenHash(result.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });
    if (rotated.count !== 1) {
      await this.revoke(payload.sid, payload.sub);
      throw new UnauthorizedException(
        "Session changed or refresh token was reused. Sign in again.",
      );
    }
    return result;
  }

  async validateAccess(payload: SessionPayload) {
    if (!this.validPayload(payload, "access"))
      throw new UnauthorizedException("Sign in again");
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
            deletedAt: true,
            suspendedAt: true,
            suspendedUntil: true,
            authVersion: true,
          },
        },
      },
    });
    const user = session?.user;
    assertActiveAccount(user ?? null);
    if (!user || user.authVersion !== payload.version)
      throw new UnauthorizedException("Session has been revoked");
    const {
      deletedAt: _deleted,
      suspendedAt: _suspended,
      authVersion: _version,
      ...safe
    } = user;
    return safe;
  }

  private revoke(id: string, userId: string) {
    return this.prisma.authSession.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logout(accessToken?: string, refreshToken?: string) {
    for (const [token, kind] of [
      [accessToken, "access"],
      [refreshToken, "refresh"],
    ] as const) {
      if (!token) continue;
      let payload: SessionPayload;
      try {
        payload = this.verify(token, kind, true);
      } catch {
        continue;
      }
      await this.revoke(payload.sid, payload.sub);
    }
  }
}
