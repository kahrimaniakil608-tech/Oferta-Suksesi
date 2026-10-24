import { ListingStatus, Prisma } from "@prisma/client";

/** Use the same visibility rule for every public listing surface. */
export function publicListingWhere(now = new Date()): Prisma.ListingWhereInput {
  return {
    status: ListingStatus.PUBLISHED,
    deletedAt: null,
    AND: [{ expiresAt: { gt: now } }],
  };
}

export function isPublicListing(
  listing: {
    status: string;
    deletedAt: Date | null;
    expiresAt: Date | null;
  },
  now = new Date(),
): boolean {
  return (
    listing.status === ListingStatus.PUBLISHED &&
    !listing.deletedAt &&
    (!listing.expiresAt || listing.expiresAt > now)
  );
}
