import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, ListingStatus } from '@prisma/client';
// User management has moved to admin/users/ (AdminUsersController)

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard stats ───────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  async stats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalListings,
      pendingListings,
      publishedListings,
      rejectedListings,
      totalUsers,
      todayListings,
      totalCompanies,
    ] = await this.prisma.$transaction([
      this.prisma.listing.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW, deletedAt: null } }),
      this.prisma.listing.count({ where: { status: ListingStatus.PUBLISHED, deletedAt: null } }),
      this.prisma.listing.count({ where: { status: ListingStatus.REJECTED, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
      this.prisma.company.count(),
    ]);

    return {
      totalListings,
      pendingListings,
      publishedListings,
      rejectedListings,
      totalUsers,
      todayListings,
      totalCompanies,
    };
  }

  // ─── NOTE: Listings are handled by AdminListingsController ─────────────────

  // ─── Pages (by id) ─────────────────────────────────────────────────────────

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get page by id (admin)' })
  async pageById(@Param('id') id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

}
