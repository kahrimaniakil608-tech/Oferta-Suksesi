import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { serializableTransaction } from "../prisma/serializable-transaction";
import { MediaService } from "./media.service";
import { claimJobs, finishJob } from "../workflows/outbox";
@Injectable()
export class MediaCleanupService {
  constructor(
    private readonly db: PrismaService,
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}
  @Cron("0 30 * * * *")
  async queueUnused() {
    let cursor: string | undefined;
    const cutoff = new Date(Date.now() - 86400000);
    while (true) {
      const batches = await this.db.uploadBatch.findMany({
        where: { deletedAt: null, createdAt: { lt: cutoff } },
        orderBy: { id: "asc" },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        take: 100,
      });
      for (const batch of batches)
        await serializableTransaction(this.db, async (tx) => {
          const current = await tx.uploadBatch.findUnique({
            where: { id: batch.id },
          });
          if (
            !current ||
            current.deletedAt ||
            (current.attachedAt &&
              current.attachedAt > new Date(Date.now() - 86400000))
          )
            return;
          const files = (current.files as string[]) ?? [];
          const unused: string[] = [];
          for (const key of files) {
            // All supported stored representations refer to the same authoritative upload key.
            const where = { contains: key };
            const used =
              (await tx.listingImage.count({
                where: {
                  OR: [
                    { url: where },
                    { thumbUrl: where },
                    { mediumUrl: where },
                  ],
                },
              })) +
              (await tx.company.count({
                where: { OR: [{ logoUrl: where }, { coverUrl: where }] },
              })) +
              (await tx.advertisement.count({
                where: { imageUrl: where, deletedAt: null },
              }));
            if (!used) unused.push(key);
          }
          if (!unused.length && files.length) return;
          await tx.uploadBatch.update({
            where: { id: batch.id },
            data: {
              files: files.filter((file) => !unused.includes(file)),
              ...(unused.length === files.length && { deletedAt: new Date() }),
            },
          });
          if (unused.length)
            await tx.outboxEvent.create({
              data: {
                topic: "media.delete",
                payload: { batchId: batch.id, files: unused },
              },
            });
        });
      if (batches.length < 100) break;
      cursor = batches[batches.length - 1].id;
    }
  }
  @Cron("*/10 * * * * *")
  async removeFiles() {
    for (const job of await claimJobs(this.db, ["media.delete"])) {
      try {
        const { batchId, files } = job.payload as {
          batchId: string;
          files: string[];
        };
        const token = await this.media.issueDeletion(batchId, files);
        const base = this.config
          .get<string>("IMAGE_SERVICE_URL", "http://localhost:4001")
          .replace(/\/$/, "");
        const response = await fetch(`${base}/images/delete/${batchId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`Image deletion failed (${response.status})`);
        await finishJob(this.db, job);
      } catch (error) {
        await finishJob(this.db, job, error);
      }
    }
  }
}
