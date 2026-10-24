import { MediaCleanupService } from "./media-cleanup.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ImageServiceGuard, MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, ImageServiceGuard, MediaCleanupService],
  exports: [MediaService],
})
export class MediaModule {}
