import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { createHmac } from "crypto";

export const ImageOperation = (operation: string) =>
  SetMetadata("imageOperation", operation);
export interface AuthorizedImageRequest {
  headers: { authorization?: string };
  params: {
    batchId?: string;
    listingId?: string;
    companyId?: string;
    adId?: string;
  };
  body?: { imagePath?: string; title?: string; files?: string[] };
  uploadPermit: { fileCount: number };
}

@Injectable()
export class UploadPermitGuard implements CanActivate {
  private readonly api: string;
  private readonly serviceCredential: string;

  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.api = (
      config.get<string>("IMAGE_AUTH_API_URL") || "http://localhost:3001/api/v1"
    ).replace(/\/$/, "");
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

  async registerFiles(resourceId: string, files: string[]) {
    const response = await fetch(`${this.api}/media/register-files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.serviceCredential}`,
      },
      body: JSON.stringify({ resourceId, files }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new ServiceUnavailableException(
        "Image registration failed. Retry the upload.",
      );
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthorizedImageRequest>();
    const operation = this.reflector.get<string>(
      "imageOperation",
      context.getHandler(),
    );
    const resourceId =
      request.params.batchId ??
      request.params.listingId ??
      request.params.companyId ??
      request.params.adId;
    const token = request.headers.authorization?.match(
      /^Bearer ([a-f0-9]{64})$/,
    )?.[1];
    if (
      !operation ||
      !token ||
      !resourceId ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(resourceId)
    ) {
      throw new UnauthorizedException("A valid upload permission is required");
    }

    let response: Response;
    try {
      response = await fetch(`${this.api}/media/consume-upload-permit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.serviceCredential}`,
        },
        body: JSON.stringify({ token, operation, resourceId }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Image authorization is temporarily unavailable",
      );
    }
    if (!response.ok) {
      if (response.status >= 500)
        throw new ServiceUnavailableException(
          "Image authorization is temporarily unavailable",
        );
      throw new UnauthorizedException(
        "Upload permission expired, invalid, or already used",
      );
    }
    const permit = (await response.json()) as {
      fileCount: number;
      files?: string[];
      imagePath?: string;
      title?: string;
    };
    if (
      operation === "social" &&
      (permit.imagePath !== request.body?.imagePath ||
        permit.title !== request.body?.title)
    ) {
      throw new UnauthorizedException(
        "Social image permission does not match this request",
      );
    }
    if (
      operation === "delete" &&
      JSON.stringify(permit.files) !== JSON.stringify(request.body?.files)
    )
      throw new UnauthorizedException(
        "Deletion permit does not match the stored keys",
      );
    request.uploadPermit = { fileCount: permit.fileCount };
    return true;
  }
}
