import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class AppService {
  async processImage(file: Express.Multer.File) {
    const metadata = await sharp(file.buffer).metadata();
    return {
      originalSize: file.size,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  }
}
