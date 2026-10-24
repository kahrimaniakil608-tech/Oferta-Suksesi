import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminListingsService } from './admin-listings.service';
import { SocialMediaService } from '../social/social-media.service';
import { AdminUpdateListingDto } from './dto/admin-update-listing.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { CreateAdminListingDto } from './dto/create-admin-listing.dto';
import { ListAdminListingsDto } from './dto/list-listings.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { PublishSocialDto } from '../social/dto/publish-social.dto';

@ApiTags('admin / listings')
@Controller('admin/listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@ApiBearerAuth()
export class AdminListingsController {
  constructor(
    private readonly service: AdminListingsService,
    private readonly socialMediaService: SocialMediaService,
  ) {}

  // ─── Stats — must be before /:id ──────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Listing statistics dashboard' })
  @ApiResponse({ status: 200, description: 'Aggregate listing stats' })
  getStats() {
    return this.service.getStats();
  }

  // ─── Moderation queue — must be before /:id ───────────────────────────────

  @Get('moderation-queue')
  @ApiOperation({
    summary: 'Moderation queue',
    description:
      'Returns PENDING_REVIEW listings with pagination. Supports sort by newest, oldest, or spam score.',
  })
  getModerationQueue(
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
    @Query('sort')  sort?: string,
  ) {
    return this.service.getModerationQueue(
      page  ? parseInt(page, 10)  : 1,
      limit ? parseInt(limit, 10) : 20,
      (sort as 'newest' | 'oldest' | 'spam') ?? 'newest',
    );
  }

  // ─── Bulk actions — must be before /:id ───────────────────────────────────

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk actions on listings',
    description:
      'Apply approve | reject | delete | feature | unfeature | archive to multiple listing IDs. Each action is logged individually.',
  })
  @ApiResponse({ status: 200, description: 'Bulk result with per-listing success/failure' })
  bulkAction(
    @Body() dto: BulkActionDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.bulkAction(dto, req.user.id);
  }

  // ─── Manual Create ────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Manually create a listing (admin)',
    description:
      'Creates a listing on behalf of an existing user and immediately publishes it. Records the source channel (WhatsApp, Viber, SMS, Facebook, Phone, Other) in the moderation log.',
  })
  @ApiResponse({ status: 201, description: 'Created listing with full detail' })
  createManual(
    @Body() dto: CreateAdminListingDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createManual(dto, req.user.id);
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all listings (admin)',
    description:
      'Supports search, status filter (comma-separated), category/city slug, userId, companyId, isFeatured, isUrgent, hasImages, sort, dateFrom/dateTo, isDeleted.',
  })
  findAll(@Query() dto: ListAdminListingsDto) {
    return this.service.findAll(dto);
  }

  // ─── Empty Trash — must be before /:id ────────────────────────────────────

  @Delete('trash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Empty trash — permanently delete all soft-deleted listings',
    description:
      'Permanently removes all listings where deletedAt is set. This action cannot be undone.',
  })
  @ApiResponse({ status: 200, description: 'Count of permanently deleted listings' })
  emptyTrash(@Req() req: { user: { id: string } }) {
    return this.service.emptyTrash(req.user.id);
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Full listing detail (admin)',
    description:
      'All fields + all images + user info + full moderation history + contact stats.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Admin edit any listing',
    description:
      'Can update title, description, attributes, categoryId, cityId, isFeatured, isUrgent, status, expiresAt. Change is logged in moderation_logs.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateListingDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete listing',
    description:
      'Sets deletedAt. Listing is kept in DB but hidden from all public endpoints. Pass optional reason in body.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  softDelete(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.softDelete(id, req.user.id, reason);
  }

  // ─── Permanent Delete ─────────────────────────────────────────────────────

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete a listing',
    description:
      'Permanently removes a soft-deleted or ARCHIVED listing and all associated data. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing permanently deleted' })
  permanentDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.permanentDelete(id, req.user.id);
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore soft-deleted listing',
    description:
      'Clears deletedAt and sets status to PUBLISHED (or PENDING_REVIEW if passed in body as { status }).',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  restore(
    @Param('id') id: string,
    @Body('status') status: string | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.restore(id, req.user.id, status as any);
  }

  // ─── Approve ──────────────────────────────────────────────────────────────

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve pending listing',
    description:
      'Sets status to PUBLISHED. Increments user trustScore by 3 (or 10 for first published listing). Publishes listing.approved event.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  approve(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.approve(id, req.user.id);
  }

  // ─── Reject ───────────────────────────────────────────────────────────────

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject listing',
    description:
      'Sets status to REJECTED. Decrements user trustScore by 10. Publishes listing.rejected event with reason.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 400, description: 'Listing is already rejected or archived' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.reject(id, dto, req.user.id);
  }

  // ─── Feature toggle ───────────────────────────────────────────────────────

  @Post(':id/feature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle isFeatured on a listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  toggleFeature(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.toggleFeature(id, req.user.id);
  }

  // ─── Urgent toggle ────────────────────────────────────────────────────────

  @Post(':id/urgent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle isUrgent on a listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  toggleUrgent(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.toggleUrgent(id, req.user.id);
  }

  // ─── Assign guest listing to user ──────────────────────────────────────────

  @Post(':id/assign-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign a guest listing to a registered user',
    description:
      'Converts a guest listing to a user-owned listing. Clears guest fields and sets the userId. Useful when a guest later creates an account.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  assignGuestToUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.assignGuestToUser(id, userId, req.user.id);
  }

  // ─── Delete single image ─────────────────────────────────────────────────

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a single image from a listing',
    description: 'Removes the image and re-numbers remaining positions. First image becomes primary.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiParam({ name: 'imageId', description: 'Image ID' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.deleteImage(id, imageId, req.user.id);
  }

  // ─── Reorder images ────────────────────────────────────────────────────────

  @Patch(':id/images/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder listing images',
    description: 'Accepts an ordered array of image IDs. First becomes primary.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  reorderImages(
    @Param('id') id: string,
    @Body('imageIds') imageIds: string[],
    @Req() req: { user: { id: string } },
  ) {
    return this.service.reorderImages(id, imageIds, req.user.id);
  }

  // ─── Add images to existing listing ─────────────────────────────────────────

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add images to an existing listing',
    description: 'Appends pre-uploaded images to the listing. Images should be uploaded to image-service first.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  addImages(
    @Param('id') id: string,
    @Body('images') images: { url: string; thumbUrl: string; mediumUrl: string }[],
    @Req() req: { user: { id: string } },
  ) {
    return this.service.addImages(id, images, req.user.id);
  }

  // ─── Admin bump to top ────────────────────────────────────────────────────

  @Post(':id/bump')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bump listing to top (admin)',
    description: 'Sets bumpedAt to now, making the listing appear at the top of search results. No cooldown for admins.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  adminBump(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.adminBump(id, req.user.id);
  }

  // ─── Publish to social media ────────────────────────────────────────────

  @Post(':id/publish-social')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Publish listing to social media',
    description:
      'Posts the listing to selected platforms (Facebook, Twitter/X, Instagram). For Instagram, generates a 1080x1080 image with the listing photo, title, and logo.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Per-platform results' })
  publishToSocial(
    @Param('id') id: string,
    @Body() dto: PublishSocialDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.socialMediaService.publishToSocial(id, dto.platforms, req.user.id);
  }
}
