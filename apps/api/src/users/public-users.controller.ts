import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { publicListingWhere } from '../listings/listing-visibility';

@ApiTags('users')
@Controller('users')
export class PublicUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':idOrSlug/profile')
  @ApiOperation({ summary: 'Get public user profile by ID or slug' })
  async publicProfile(
    @Param('idOrSlug') idOrSlug: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
  ) {
    // Try slug first, then fall back to id
    const userSelect = {
      id: true, name: true, slug: true, avatarUrl: true, trustScore: true,
      isVerified: true, createdAt: true,
      badges: {
        include: { badge: true },
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      },
      _count: { select: { listings: { where: publicListingWhere() } } },
    };
    const user =
      (await this.prisma.user.findUnique({ where: { slug: idOrSlug }, select: userSelect })) ??
      (await this.prisma.user.findUnique({ where: { id: idOrSlug }, select: userSelect }));

    if (!user) throw new NotFoundException('User not found');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [listings, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where: { ...publicListingWhere(), userId: user.id },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          city: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.listing.count({ where: { ...publicListingWhere(), userId: user.id } }),
    ]);

    return {
      user,
      listings: {
        data: listings,
        meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
      },
    };
  }
}
