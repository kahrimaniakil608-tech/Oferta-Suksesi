import { Prisma } from "@prisma/client";

export { serializableTransaction as deletionTransaction } from "../prisma/serializable-transaction";

/** Keep financial records and a detached snapshot linking payments to their former listing. */
export async function deleteListingsPreservingPayments(
  tx: Prisma.TransactionClient,
  listings: { id: string; title: string; userId: string | null }[],
  actorId: string,
) {
  if (!listings.length) return { count: 0 };
  const ids = listings.map((listing) => listing.id);
  const payments = await tx.payment.findMany({
    where: { listingId: { in: ids } },
    select: { id: true, listingId: true },
  });
  const paymentsByListing = new Map<string, string[]>();
  for (const payment of payments) {
    if (!payment.listingId) continue;
    const paymentIds = paymentsByListing.get(payment.listingId) ?? [];
    paymentIds.push(payment.id);
    paymentsByListing.set(payment.listingId, paymentIds);
  }
  await tx.moderationLog.createMany({
    data: listings.map((listing) => ({
      action: "LISTING_PERMANENT_DELETE",
      moderatorId: actorId,
      // listingId stays null so the deletion audit survives the listing's cascade.
      reason: JSON.stringify({
        id: listing.id,
        title: listing.title,
        userId: listing.userId,
        paymentIds: paymentsByListing.get(listing.id) ?? [],
      }),
    })),
  });
  await tx.payment.updateMany({
    where: { listingId: { in: ids } },
    data: { listingId: null },
  });
  await tx.$executeRaw`UPDATE moderation_logs SET reason=jsonb_build_object('listingId',listing_id,'reason',reason)::text, listing_id=NULL WHERE listing_id IN (${Prisma.join(ids)})`;
  return tx.listing.deleteMany({ where: { id: { in: ids } } });
}
