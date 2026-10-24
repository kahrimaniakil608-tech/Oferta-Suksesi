import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every day at 3:00 AM.
   *
   * 1. Aggregate raw ad_impressions/ad_clicks older than 7 days into ad_daily_stats,
   *    then delete the raw rows.
   * 2. Delete read notifications older than 90 days.
   * 3. Delete email logs older than 180 days.
   * 4. Delete listing contact logs older than 365 days.
   * 5. Retain moderation history; delete expired authentication and deduplication records.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('Starting daily cleanup...');

    const results = await Promise.allSettled([
      this.backfillAndPruneAdEvents(),
      this.pruneNotifications(),
      this.pruneEmailLogs(),
      this.pruneListingContacts(),
      // Administrative audit history is retained; never silently aged out.
      this.pruneAuthRecords(),
    ]);

    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.error(`Cleanup task ${i} failed: ${result.reason}`);
      }
    }

    this.logger.log('Daily cleanup finished.');
  }

  private async pruneAuthRecords() {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
  }

  // ─── Ad impressions: backfill into daily stats then prune ──────────────────

  async backfillAndPruneAdEvents() {
    const cutoff = new Date(); cutoff.setUTCHours(0,0,0,0); cutoff.setUTCDate(cutoff.getUTCDate()-7);
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1948202)`;
      await tx.$executeRaw`WITH consumed AS (
        DELETE FROM ad_impressions WHERE created_at<${cutoff} RETURNING *
      ) INSERT INTO ad_daily_stats(id,ad_id,date,impressions,clicks,unique_ips)
        SELECT gen_random_uuid()::text,ad_id,created_at::date,count(*)::integer,0,count(DISTINCT ip_hash)::integer FROM consumed WHERE NOT aggregated GROUP BY ad_id,created_at::date
        ON CONFLICT(ad_id,date) DO UPDATE SET impressions=ad_daily_stats.impressions+EXCLUDED.impressions,unique_ips=ad_daily_stats.unique_ips+EXCLUDED.unique_ips`;
      await tx.$executeRaw`WITH consumed AS (
        DELETE FROM ad_clicks WHERE created_at<${cutoff} RETURNING *
      ) INSERT INTO ad_daily_stats(id,ad_id,date,impressions,clicks,unique_ips)
        SELECT gen_random_uuid()::text,ad_id,created_at::date,0,count(*)::integer,0 FROM consumed WHERE NOT aggregated GROUP BY ad_id,created_at::date
        ON CONFLICT(ad_id,date) DO UPDATE SET clicks=ad_daily_stats.clicks+EXCLUDED.clicks`;
    }, { timeout: 30000 });
  }

  private async pruneNotifications() {
    const cutoff = this.daysAgo(90);
    const deleted = await this.prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoff } },
    });
    this.logger.log(`Pruned ${deleted.count} old read notifications.`);
  }

  // ─── Email logs: delete older than 180 days ────────────────────────────────

  private async pruneEmailLogs() {
    const cutoff = this.daysAgo(180);
    const deleted = await this.prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`Pruned ${deleted.count} old email logs.`);
  }

  // ─── Listing contacts: delete older than 365 days ──────────────────────────

  private async pruneListingContacts() {
    const cutoff = this.daysAgo(365);
    const deleted = await this.prisma.listingContact.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`Pruned ${deleted.count} old listing contact logs.`);
  }

  // ─── Moderation logs: delete older than 365 days ───────────────────────────


  private daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  }
}
