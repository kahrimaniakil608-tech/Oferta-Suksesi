import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
export interface Job {
  id: string;
  topic: string;
  payload: Prisma.JsonValue;
  attempts: number;
  lockToken: string;
}
export async function claimJobs(
  db: PrismaClient,
  topics: string[],
): Promise<Job[]> {
  const token = randomUUID();
  return db.$queryRaw<
    Job[]
  >`UPDATE outbox_events SET lock_token=${token}, locked_until=now()+interval '5 minutes', attempts=attempts+1
    WHERE id IN (SELECT id FROM outbox_events WHERE topic IN (${Prisma.join(topics)}) AND completed_at IS NULL AND attempts<8 AND available_at<=now()
      AND (locked_until IS NULL OR locked_until<now()) ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 10)
    RETURNING id, topic, payload, attempts, lock_token AS "lockToken"`;
}
export async function finishJob(db: PrismaClient, job: Job, error?: unknown) {
  await db.outboxEvent.updateMany({
    where: { id: job.id, lockToken: job.lockToken },
    data: error
      ? {
          lockedUntil: null,
          lockToken: null,
          lastError: String(error).slice(0, 1000),
          availableAt: new Date(
            Date.now() + Math.min(3600000, 1000 * 2 ** job.attempts),
          ),
        }
      : {
          completedAt: new Date(),
          lockedUntil: null,
          lockToken: null,
          lastError: null,
          ...(job.topic === "user.password_reset" && {
            payload: { redacted: true },
          }),
        },
  });
}
