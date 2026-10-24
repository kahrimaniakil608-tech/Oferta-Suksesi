import { PrismaService } from "../prisma/prisma.service";
import { assetKey } from "./asset-ownership";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { RedisService } from "../redis/redis.service";

export type UploadOperation =
  | "listing"
  | "company-logo"
  | "company-cover"
  | "ad-banner";
export interface UploadPermit {
  operation: UploadOperation | "social" | "delete";
  files?: string[];
  resourceId: string;
  fileCount: number;
  imagePath?: string;
  title?: string;
}

@Injectable()
export class MediaService {
  private readonly serviceCredential: string;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      config.get<string>("IMAGE_SERVICE_SECRET") ||
      config.get<string>("JWT_SECRET");
    if (!secret)
      throw new Error(
        "IMAGE_SERVICE_SECRET or JWT_SECRET is required for media authorization",
      );
    this.serviceCredential = createHmac("sha256", secret)
      .update("oferta:image-service:consume:v1")
      .digest("hex");
  }

  assertServiceCredential(authorization?: string) {
    const received = Buffer.from(authorization ?? "");
    const expected = Buffer.from(`Bearer ${this.serviceCredential}`);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException("Invalid image service credential");
    }
  }

  async issueUpload(
    operation: UploadOperation,
    fileCount: number,
    actor: { id: string; role: string } | null,
    ip: string,
  ) {
    if (!actor && operation !== "listing")
      throw new ForbiddenException("Sign in to upload these images");
    if (operation === "ad-banner" && actor?.role !== "ADMIN")
      throw new ForbiddenException("Administrator access required");
    if (operation !== "listing" && fileCount !== 1)
      throw new BadRequestException("A single image is required");
    const identity = actor
      ? `user:${actor.id}`
      : `guest:${createHash("sha256").update(ip).digest("hex")}`;
    const allowed = await this.redis.reserveQuota(
      `media:quota:${identity}`,
      fileCount,
      actor ? 200 : 40,
      86400,
    );
    if (!allowed)
      throw new BadRequestException(
        "Keni arritur limitin ditor të ngarkimit të fotove.",
      );

    // A caller can only upload to a newly allocated folder, never overwrite another resource.
    const resourceId = `upload-${randomUUID()}`;
    const claimToken = randomBytes(32).toString("hex");
    await this.prisma.uploadBatch.create({
      data: {
        id: resourceId,
        ownerId: actor?.id ?? null,
        operation,
        claimHash: createHash("sha256").update(claimToken).digest("hex"),
      },
    });
    const token = await this.storePermit({ operation, resourceId, fileCount });
    const uploadPath =
      operation === "listing"
        ? `/images/upload/${resourceId}`
        : operation === "ad-banner"
          ? `/images/ad/${resourceId}/banner`
          : `/images/company/${resourceId}/${operation === "company-logo" ? "logo" : "cover"}`;
    return { token, uploadPath, claimToken, expiresIn: 300 };
  }

  async registerFiles(resourceId: string, files: string[]) {
    const keys = files.map(assetKey);
    if (
      !keys.length ||
      keys.length > 24 ||
      keys.some((key) => !key.split("/").includes(resourceId))
    )
      throw new BadRequestException("Files do not match this upload");
    const changed = await this.prisma.uploadBatch.updateMany({
      where: { id: resourceId, deletedAt: null, attachedAt: null },
      data: { files: keys },
    });
    if (changed.count !== 1)
      throw new BadRequestException("Upload is no longer available");
    return { registered: true };
  }
  issueDeletion(resourceId: string, files: string[]) {
    return this.storePermit({
      operation: "delete",
      resourceId,
      fileCount: 0,
      files,
    });
  }

  issueSocialPermit(resourceId: string, imagePath: string, title: string) {
    return this.storePermit({
      operation: "social",
      resourceId,
      fileCount: 0,
      imagePath,
      title,
    });
  }

  private async storePermit(permit: UploadPermit) {
    const token = randomBytes(32).toString("hex");
    await this.redis.set(this.permitKey(token), JSON.stringify(permit), 300);
    return token;
  }

  async consume(
    token: string,
    operation: string,
    resourceId: string,
  ): Promise<UploadPermit> {
    const raw = await this.redis.consumeUploadPermit(
      this.permitKey(token),
      operation,
      resourceId,
    );
    if (!raw)
      throw new UnauthorizedException(
        "Upload permission expired, invalid, or already used",
      );
    return JSON.parse(raw) as UploadPermit;
  }

  private permitKey(token: string) {
    return `media:permit:${createHash("sha256").update(token).digest("hex")}`;
  }
}
