import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import {
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TurnstileGuard } from "../common/guards/turnstile.guard";
import { MediaService, UploadOperation } from "./media.service";

class UploadPermitDto {
  @IsIn(["listing", "company-logo", "company-cover", "ad-banner"])
  operation!: UploadOperation;
  @IsInt() @Min(1) @Max(8) fileCount!: number;
}

class ConsumePermitDto {
  @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsIn([
    "listing",
    "company-logo",
    "company-cover",
    "ad-banner",
    "social",
    "delete",
  ])
  operation!: string;
  @IsString() @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/) resourceId!: string;
}

class RegisterFilesDto {
  @IsString() @Matches(/^upload-[a-f0-9-]{36}$/) resourceId!: string;
  @IsArray() @ArrayMaxSize(24) @IsString({ each: true }) files!: string[];
}

@Injectable()
export class ImageServiceGuard implements CanActivate {
  constructor(private readonly media: MediaService) {}
  canActivate(context: ExecutionContext) {
    this.media.assertServiceCredential(
      context.switchToHttp().getRequest<Request>().headers.authorization,
    );
    return true;
  }
}

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("upload-permits")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  issue(@Body() dto: UploadPermitDto, @Req() req: Request) {
    return this.media.issueUpload(
      dto.operation,
      dto.fileCount,
      req.user as { id: string; role: string },
      req.ip ?? "unknown",
    );
  }

  @Post("guest-upload-permits")
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  issueGuest(@Body() dto: UploadPermitDto, @Req() req: Request) {
    return this.media.issueUpload(
      dto.operation,
      dto.fileCount,
      null,
      req.ip ?? "unknown",
    );
  }

  @Post("register-files")
  @UseGuards(ImageServiceGuard)
  @SkipThrottle()
  registerFiles(@Body() dto: RegisterFilesDto) {
    return this.media.registerFiles(dto.resourceId, dto.files);
  }

  @Post("consume-upload-permit")
  @UseGuards(ImageServiceGuard)
  @SkipThrottle()
  consume(@Body() dto: ConsumePermitDto) {
    return this.media.consume(dto.token, dto.operation, dto.resourceId);
  }
}
