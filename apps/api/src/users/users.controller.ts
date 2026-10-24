import { BadRequestException } from '@nestjs/common';
import { publicListingWhere } from '../listings/listing-visibility';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcryptjs';

class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Req() req: Request) {
    const user = req.user as any;
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, name: true, slug: true, phone: true,
        role: true, trustScore: true, isVerified: true,
        avatarUrl: true, notificationPrefs: true,
        companyId: true, createdAt: true,
        _count: { select: { listings: true, favourites: true } },
      },
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as any;
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true },
    });
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as any).id;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new NotFoundException('Fjalëkalimi aktual është i gabuar');
    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async tx => {
      const updated = await tx.user.updateMany({
        where: { id: userId, passwordHash: user.passwordHash, authVersion: user.authVersion, deletedAt: null, suspendedAt: null },
        data: { passwordHash: hash, authVersion: { increment: 1 } },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Session changed. Sign in again.');
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
    });
    return { message: 'Fjalëkalimi u ndryshua. Kyçuni përsëri.' };
  }

  // ─── My Listings ──────────────────────────────────────────────────────────

  @Get('me/listings/counts')
  @ApiOperation({ summary: 'Get listing counts grouped by status' })
  async myListingCounts(@Req() req: Request) {
    const userId = (req.user as any).id;
    const rows = await this.prisma.listing.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      counts[r.status] = r._count._all;
      total += r._count._all;
    }
    return { counts, total };
  }

  @Get('me/listings')
  @ApiOperation({ summary: 'Get my listings with optional status filter' })
  async myListings(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = (req.user as any).id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { userId };
    if (status && !['DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','EXPIRED','ARCHIVED'].includes(status)) throw new BadRequestException('Invalid listing status');
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: {
          moderationLogs: { where: { action: 'REJECTED', moderatorId: { not: null } }, orderBy: [{createdAt: 'desc'}, {id: 'desc'}], take: 1, select: { reason: true } },
          category: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data: data.map(({moderationLogs, ...listing}) => ({...listing, rejectionReason: listing.status === 'REJECTED' ? moderationLogs[0]?.reason ?? 'Shpallja kërkon korrigjim. Kontrolloni përmbajtjen dhe kontaktoni mbështetjen për sqarim.' : null})),
      meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  // ─── Favourites ───────────────────────────────────────────────────────────

  @Get('me/favourites')
  @ApiOperation({ summary: 'Get my favourite listings' })
  async myFavourites(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = (req.user as any).id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.favourite.findMany({
        where: { userId, listing: publicListingWhere() },
        include: {
          listing: {
            include: {
              category: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.favourite.count({ where: { userId, listing: publicListingWhere() } }),
    ]);

    return {
      data: data.map((f) => f.listing),
      meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  // ─── Favourite toggle ─────────────────────────────────────────────────────

  @Post('me/favourites/:listingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favourite (add or remove)' })
  async toggleFavourite(
    @Req() req: Request,
    @Param('listingId') listingId: string,
  ) {
    const userId = (req.user as any).id;
    const existing = await this.prisma.favourite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });

    if (existing) {
      await this.prisma.favourite.delete({
        where: { userId_listingId: { userId, listingId } },
      });
      return { favourited: false };
    }

    const listing = await this.prisma.listing.findFirst({ where: { ...publicListingWhere(), id: listingId }, select: { id: true } });
    if (!listing) throw new NotFoundException('Listing not found');
    await this.prisma.favourite.create({ data: { userId, listingId } });
    return { favourited: true };
  }

  @Get('me/favourites/:listingId/status')
  @ApiOperation({ summary: 'Check if listing is favourited' })
  async favouriteStatus(
    @Req() req: Request,
    @Param('listingId') listingId: string,
  ) {
    const userId = (req.user as any).id;
    const existing = await this.prisma.favourite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    return { favourited: !!existing };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @Get('me/notifications')
  @ApiOperation({ summary: 'Get in-app notifications' })
  async notifications(
    @Req() req: Request,
    @Query('page') page = '1',
  ) {
    const userId = (req.user as any).id;
    const skip = (parseInt(page) - 1) * 20;

    const [data, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: 20,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, unreadCount };
  }

  @Patch('me/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  @Patch('me/notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() req: Request) {
    const userId = (req.user as any).id;
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  // ─── Notification preferences ─────────────────────────────────────────────

  @Get('me/notification-prefs')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPrefs(@Req() req: Request) {
    const userId = (req.user as any).id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return user?.notificationPrefs ?? {};
  }

  @Patch('me/notification-prefs')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePrefs(@Req() req: Request, @Body() body: Record<string, boolean>) {
    const supported = ['listing_approved','listing_rejected','listing_expired','listing_expiring_soon'];
    if (!body || Object.entries(body).some(([key,value]) => !supported.includes(key) || typeof value !== 'boolean')) throw new BadRequestException('Unsupported notification preference');
    const userId = (req.user as any).id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const current = (user?.notificationPrefs as Record<string, boolean>) ?? {};
    const merged = { ...current, ...body };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged },
    });
    return merged;
  }

  @Get('me/payments')
  async payments(@Req() req: Request, @Query('page') page = '1') {
    const userId = (req.user as any).id;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where: { userId }, include: { listing: { select: { id: true, title: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (Number(page)-1)*20, take: 20 }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { data, total };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get('me/analytics')
  @ApiOperation({ summary: 'Get my listing analytics summary' })
  async analytics(@Req() req: Request) {
    const userId = (req.user as any).id;

    const listings = await this.prisma.listing.findMany({
      where: { userId },
      select: {
        id: true, slug: true, title: true, viewsCount: true, contactClicks: true,
        status: true, createdAt: true, isFeatured: true,
        images: { where: { isPrimary: true }, take: 1, select: { thumbUrl: true } },
      },
      orderBy: { viewsCount: 'desc' },
    });

    const totalViews    = listings.reduce((s, l) => s + l.viewsCount, 0);
    const totalContacts = listings.reduce((s, l) => s + l.contactClicks, 0);

    return {
      totalViews,
      totalContacts,
      totalListings: listings.length,
      listings,
    };
  }
}
