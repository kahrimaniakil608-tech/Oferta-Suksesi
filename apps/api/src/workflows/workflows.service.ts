import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";
import { publicListingWhere } from "../listings/listing-visibility";
import { claimJobs, finishJob } from "./outbox";
@Injectable()
export class WorkflowsService {
  private busy = false;
  private readonly logger = new Logger(WorkflowsService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly search: SearchService,
  ) {}
  @Cron("*/5 * * * * *")
  async indexChanges() {
    if (this.busy) return;
    this.busy = true;
    try {
      const jobs = await claimJobs(this.db, ["search.listing"]);
      await Promise.all(
        jobs.map(async (job) => {
          try {
            const id = String((job.payload as any).listingId);
            const listing = await this.db.listing.findFirst({
              where: { ...publicListingWhere(), id },
              include: { category: true, city: true, images: true },
            });
            if (listing) await this.search.indexListing(listing);
            else await this.search.removeListing(id);
            await finishJob(this.db, job);
          } catch (error) {
            await finishJob(this.db, job, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error("Search delivery failed", error);
    } finally {
      this.busy = false;
    }
  }
  @Cron("0 * * * * *")
  async reconcileLifecycle() {
    const now = new Date();
    await this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1948201)`;
        await tx.listing.updateMany({
          where: { status: "PUBLISHED", expiresAt: { lte: now } },
          data: { status: "EXPIRED" },
        });
        await tx.listing.updateMany({
          where: { isFeatured: true, featuredUntil: { lte: now } },
          data: { isFeatured: false },
        });
        await tx.listing.updateMany({
          where: { isUrgent: true, urgentUntil: { lte: now } },
          data: { isUrgent: false },
        });
        const users = await tx.user.findMany({
          where: { suspendedAt: { not: null }, suspendedUntil: { lte: now } },
          select: { id: true },
        });
        if (users.length) {
          const ids = users.map((u) => u.id);
          await tx.user.updateMany({
            where: { id: { in: ids } },
            data: { suspendedAt: null, suspendedUntil: null },
          });
          await tx.userBadge.deleteMany({
            where: { userId: { in: ids }, badge: { name: "suspended" } },
          });
        }
        const expiring = await tx.listing.findMany({
          where: {
            ...publicListingWhere(now),
            expiresAt: { gt: now, lte: new Date(now.getTime() + 3 * 86400000) },
          },
          select: { id: true, userId: true, title: true, expiresAt: true },
        });
        for (const l of expiring)
          await tx.outboxEvent.upsert({
            where: { dedupeKey: `expiry:${l.id}:${l.expiresAt.toISOString()}` },
            update: {},
            create: {
              topic: "listing.expiring_soon",
              dedupeKey: `expiry:${l.id}:${l.expiresAt.toISOString()}`,
              payload: {
                listingId: l.id,
                userId: l.userId,
                title: l.title,
                expiresAt: l.expiresAt.toISOString(),
              },
            },
          });
        await tx.eventClaim.deleteMany({ where: { expiresAt: { lt: now } } });
      },
      { timeout: 30000 },
    );
  }
  @Cron("0 15 * * * *")
  async reconcileSearch() {
    // Re-enqueue current state; replaying a job always reads the latest database row.
    await this.db
      .$executeRaw`INSERT INTO outbox_events(id,topic,payload,dedupe_key)
      SELECT gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',id), 'reindex:'||id||':'||date_trunc('hour',now())::text FROM listings
      ON CONFLICT (dedupe_key) DO NOTHING`;
    await this.search.pruneOrphans();
  }
}
