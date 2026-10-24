import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 8 * * 1') // Every Monday at 8:00 AM
  async generateWeeklyReport() {
    this.logger.log('Generating weekly report...');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [newListings, newUsers, pendingModeration, payments] =
      await Promise.all([
        this.prisma.listing.count({
          where: { createdAt: { gte: weekAgo } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: weekAgo } },
        }),
        this.prisma.listing.count({
          where: { status: 'PENDING_REVIEW' },
        }),
        this.prisma.payment.findMany({
          where: { createdAt: { gte: weekAgo }, status: 'COMPLETED' },
          select: { amount: true },
        }),
      ]);

    const totalRevenue = payments.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    this.logger.log(
      `Weekly Report: ${newListings} new listings, ${newUsers} new users, ` +
        `${pendingModeration} pending moderation, EUR${totalRevenue.toFixed(2)} revenue`,
    );

    // TODO: Send email to admin users via notification service
    // The report data is available for the admin to download via GET /admin/exports/weekly-report.pdf
  }
}
