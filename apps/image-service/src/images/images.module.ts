import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { UploadPermitGuard } from './upload-permit.guard';

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, UploadPermitGuard],
})
export class ImagesModule {}
