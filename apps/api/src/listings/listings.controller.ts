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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TurnstileGuard } from '../common/guards/turnstile.guard';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateGuestListingDto } from './dto/create-guest-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { ReportListingDto } from './dto/report-listing.dto';
import { ContactListingDto } from './dto/contact-listing.dto';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ─── GET /listings ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Paginated listing search with filters' })
  @ApiOkResponse({ description: 'Paginated listings with meta' })
  findAll(@Query() query: ListingQueryDto) {
    return this.listingsService.findAll(query);
  }

  // ─── GET /listings/sitemap ────────────────────────────────────────────────

  @Get('sitemap')
  @ApiOperation({ summary: 'Listing IDs for sitemap generation (public)' })
  @ApiOkResponse({ description: 'Paginated listing IDs with updatedAt' })
  sitemap(@Query('page') page?: string) {
    return this.listingsService.findForSitemap(Number(page) || 1);
  }

  // ─── GET /listings/:id ────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get full listing details' })
  @ApiOkResponse({ description: 'Listing with images, category, city, user' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Get(':id/manage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get private listing details for the owner or staff' })
  findForManagement(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.findForManagement(id, user.id, user.role);
  }

  // ─── POST /listings/guest ─────────────────────────────────────────────────

  @Post('guest')
  @UseGuards(TurnstileGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a listing as a guest (no login required)',
    description:
      'Guest listings always go to moderation queue (PENDING_REVIEW). Rate limited to 7 per day per IP.',
  })
  @ApiCreatedResponse({ description: 'Guest listing created and sent to moderation' })
  createGuest(@Body() dto: CreateGuestListingDto, @Req() req: Request) {
    const ip = req.ip ?? '';
    return this.listingsService.createGuest(dto, ip);
  }

  // ─── POST /listings ───────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new listing (authenticated)' })
  @ApiCreatedResponse({ description: 'Listing created' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  create(@Body() dto: CreateListingDto, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.create(dto, user.id);
  }

  // ─── PATCH /listings/:id ──────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing (owner only)' })
  @ApiOkResponse({ description: 'Listing updated' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  @ApiForbiddenResponse({ description: 'Not the owner' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.listingsService.update(id, dto, user.id, user.role);
  }

  // ─── DELETE /listings/:id ─────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a listing (owner or admin)' })
  @ApiOkResponse({ description: 'Listing archived' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.remove(id, user.id, user.role);
  }

  // ─── DELETE /listings/:id/permanent ──────────────────────────────────────

  @Delete(':id/permanent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete an archived listing (owner only)',
    description:
      'Permanently removes an ARCHIVED listing while retaining payment records. This action cannot be undone.',
  })
  @ApiOkResponse({ description: 'Listing permanently deleted' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  @ApiForbiddenResponse({ description: 'Not the owner' })
  permanentDelete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.permanentDelete(id, user.id);
  }

  // ─── POST /listings/:id/restore ──────────────────────────────────────────

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived listing back to DRAFT' })
  @ApiOkResponse({ description: 'Listing restored to DRAFT' })
  restore(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.restore(id, user.id, user.role);
  }

  // ─── POST /listings/:id/renew ─────────────────────────────────────────────

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew listing expiry by 30 days (owner only)' })
  @ApiOkResponse({ description: 'expiresAt reset to 30 days from now' })
  @ApiForbiddenResponse({ description: 'Not the owner' })
  renew(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.listingsService.renew(id, user.id);
  }

  // ─── POST /listings/:id/report ────────────────────────────────────────────

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a listing (authenticated)' })
  @ApiOkResponse({ description: 'Report recorded' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  report(
    @Param('id') id: string,
    @Body() dto: ReportListingDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.listingsService.report(id, dto, user.id);
  }

  // ─── POST /listings/:id/contact ───────────────────────────────────────────

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  view(@Param('id') id: string, @Req() req: Request) { return this.listingsService.view(id, req.ip ?? ''); }

  @Post(':id/contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a contact event (public)' })
  @ApiOkResponse({ description: 'Contact event recorded' })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  contact(
    @Param('id') id: string,
    @Body() dto: ContactListingDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '';
    return this.listingsService.contact(id, dto, ip);
  }
}
