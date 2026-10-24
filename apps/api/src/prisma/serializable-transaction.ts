import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

/** Only retry database conflicts; callbacks must not perform external side effects. */
export async function serializableTransaction<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const result = await work(tx);
          // Prisma 5 may not surface a deferred trigger failure at COMMIT. Check it while the callback can still reject.
          await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const failure = error as {
        code?: string;
        meta?: { code?: string };
        message?: string;
      };
      const retryable =
        failure.code === "P2034" ||
        (failure.code === "P2010" &&
          ["40001", "40P01"].includes(failure.meta?.code ?? "")) ||
        /code: "(?:40001|40P01)"/.test(failure.message ?? "");
      if (!retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
  throw new ConflictException(
    "The record changed during this operation. Reload and try again.",
  );
}
