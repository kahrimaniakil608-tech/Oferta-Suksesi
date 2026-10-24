import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ImagesService } from './images.service';
import { AuthorizedImageRequest, ImageOperation, UploadPermitGuard } from './upload-permit.guard';

@ApiTags('images')
@Controller('images')
@UseGuards(UploadPermitGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService, private readonly authorization: UploadPermitGuard) {}

  private async completeUpload(resourceId: string, files: string[]) {
    try { await this.authorization.registerFiles(resourceId, files); }
    catch (error) {
      const keys = files.map(file => /^https?:\/\//.test(file) ? new URL(file).pathname.replace(/^\/uploads\//, '') : file.replace(/^\/?uploads\//, ''));
      await this.imagesService.deleteStoredFiles(resourceId, keys);
      throw error;
    }
  }

  @Post('upload/:listingId')
  @ImageOperation('listing')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload up to 8 images for a listing' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'listingId', example: 'clxyz123abc' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Images processed and saved. Returns array of URLs.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url:       { type: 'string', example: 'http://localhost:4001/uploads/listings/abc/original/1234.webp' },
          thumbUrl:  { type: 'string', example: 'http://localhost:4001/uploads/listings/abc/thumb/1234.webp' },
          mediumUrl: { type: 'string', example: 'http://localhost:4001/uploads/listings/abc/medium/1234.webp' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid file type, exceeds 5MB, or more than 8 files' })
  async uploadForListing(
    @Param('listingId') listingId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: AuthorizedImageRequest,
  ) {
    if ((files?.length ?? 0) > request.uploadPermit.fileCount) throw new BadRequestException('Upload exceeds the permitted file count');
    this.imagesService.validateFiles(files);
    const images = await this.imagesService.processAndSave(files, listingId);
    await this.completeUpload(listingId, images.flatMap(image => [image.url, image.thumbUrl, image.mediumUrl]));
    return images;
  }

  // ─── Company logo ─────────────────────────────────────────────────────────

  @Post('company/:companyId/logo')
  @ImageOperation('company-logo')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload company logo (400x400 crop)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'companyId', example: 'temp-abc123' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadCompanyLogo(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const logoPath = await this.imagesService.processCompanyLogo(file, companyId);
    await this.completeUpload(companyId, [logoPath]);
    return { path: logoPath };
  }

  // ─── Company cover ────────────────────────────────────────────────────────

  @Post('company/:companyId/cover')
  @ImageOperation('company-cover')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload company cover/banner (1200x400 crop)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'companyId', example: 'temp-abc123' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadCompanyCover(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const coverPath = await this.imagesService.processCompanyCover(file, companyId);
    await this.completeUpload(companyId, [coverPath]);
    return { path: coverPath };
  }

  // ─── Ad banner ──────────────────────────────────────────────────────────

  @Post('ad/:adId/banner')
  @ImageOperation('ad-banner')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload ad banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'adId', example: 'temp-abc123' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, width: { type: 'number' }, height: { type: 'number' } } } })
  async uploadAdBanner(
    @Param('adId') adId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const url = await this.imagesService.processAdBanner(file, adId);
    await this.completeUpload(adId, [url]);
    return { url };
  }

  @Post('delete/:batchId')
  @ImageOperation('delete')
  async deleteFiles(@Param('batchId') batchId: string, @Body() body: { files: string[] }) {
    return this.imagesService.deleteStoredFiles(batchId, body.files);
  }

  // ─── Social image generation ─────────────────────────────────────────────

  @Post('social/:listingId')
  @ImageOperation('social')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a 1080x1080 social media image for Instagram' })
  @ApiParam({ name: 'listingId', example: 'clxyz123abc' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imagePath', 'title'],
      properties: {
        imagePath: { type: 'string', description: 'Path or URL to the listing primary image' },
        title: { type: 'string', description: 'Listing title to overlay' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Social image generated', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  async generateSocialImage(
    @Param('listingId') listingId: string,
    @Body() body: { imagePath: string; title: string },
  ) {
    if (!body.imagePath || !body.title) {
      throw new BadRequestException('imagePath and title are required');
    }
    const url = await this.imagesService.generateSocialImage(listingId, body.imagePath, body.title);
    return { url };
  }

}
