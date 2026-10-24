import { sealPayload } from '../workflows/private-payload';
import { runtimeSettings } from '../admin/settings/admin-settings.service';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { AuthSessionsService, assertActiveAccount, tokenHash } from './auth-sessions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
// Event channel constants (match @oferta/shared events)
const EVENT_USER_REGISTERED = 'user.registered';
const EVENT_USER_PASSWORD_RESET = 'user.password_reset';

const RESET_TTL = 60 * 60; // 1 hour in seconds

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AuthSessionsService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private static readonly ALBANIAN_MAP: Record<string, string> = {
    ë: 'e', Ë: 'e', ç: 'c', Ç: 'c',
    ä: 'a', ö: 'o', ü: 'u', ß: 'ss',
    š: 's', ž: 'z', đ: 'd', ć: 'c', č: 'c',
  };

  private slugify(text: string): string {
    return text
      .split('')
      .map((c) => AuthService.ALBANIAN_MAP[c] ?? c)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUserSlug(name: string): Promise<string> {
    const base = this.slugify(name) || 'user';
    let slug = base;
    let attempt = 0;
    while (await this.prisma.user.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    if ((await runtimeSettings(this.prisma)).allow_registration !== 'true') throw new BadRequestException('Registration is currently closed');
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const slug = await this.generateUserSlug(dto.name);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        slug,
        phone: dto.phone,
        passwordHash,
        role: 'USER',
      },
    });

    return this.sessions.create(user);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    assertActiveAccount(user);

    return this.sessions.create(user);
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    return this.sessions.refresh(refreshToken);
  }

  logout(accessToken?: string, refreshToken?: string) {
    return this.sessions.logout(accessToken, refreshToken);
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || user.deletedAt || (user.suspendedAt && (!user.suspendedUntil || user.suspendedUntil > new Date()))) return { message: 'If that email exists, a reset link has been sent.' };

    const token = randomUUID();
    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/auth/rivendos-fjalekalimin?token=${token}`;
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.create({ data: {
        tokenHash: tokenHash(token), userId: user.id, authVersion: user.authVersion,
        expiresAt: new Date(Date.now() + RESET_TTL * 1000),
      } }),
      this.prisma.outboxEvent.create({ data: { topic: EVENT_USER_PASSWORD_RESET, payload: sealPayload({ userId: user.id, email, resetUrl }, this.config.get<string>('OUTBOX_SECRET') || this.config.get<string>('JWT_SECRET', '')) } }),
    ]);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async verifyResetToken(token: string): Promise<boolean> {
    if (typeof token !== 'string' || !token) return false;
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
    return !!reset && reset.expiresAt > new Date() && !reset.user.deletedAt && (!reset.user.suspendedAt || !!reset.user.suspendedUntil && reset.user.suspendedUntil <= new Date())
      && reset.authVersion === reset.user.authVersion;
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = tokenHash(token);
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    if (!reset || reset.expiresAt <= new Date()) throw new BadRequestException('Invalid or expired reset token');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction(async tx => {
      const updated = await tx.user.updateMany({
        where: { id: reset.userId, authVersion: reset.authVersion, deletedAt: null, OR: [{ suspendedAt: null }, { suspendedUntil: { lte: new Date() } }] },
        data: { passwordHash, authVersion: { increment: 1 } },
      });
      if (updated.count !== 1) throw new BadRequestException('Invalid or expired reset token');
      const consumed = await tx.passwordResetToken.deleteMany({ where: { tokenHash: hash, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new BadRequestException('Invalid or expired reset token');
      await tx.authSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId } });
    });
    return { message: 'Password updated successfully. Sign in again.' };
  }
}
