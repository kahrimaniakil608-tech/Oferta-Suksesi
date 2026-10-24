-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('AUTO_PUBLISH', 'REQUIRES_APPROVAL');

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'RENEWAL_BUMP';

-- AlterTable: User — add postingStatus
ALTER TABLE "users" ADD COLUMN "posting_status" "PostingStatus" NOT NULL DEFAULT 'AUTO_PUBLISH';

-- AlterTable: Listing — make user_id nullable, add guest fields and bump fields
ALTER TABLE "listings" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "listings" ADD COLUMN "is_guest_listing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN "guest_name" TEXT;
ALTER TABLE "listings" ADD COLUMN "guest_phone" TEXT;
ALTER TABLE "listings" ADD COLUMN "guest_email" TEXT;
ALTER TABLE "listings" ADD COLUMN "bumped_at" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "renewal_count" INTEGER NOT NULL DEFAULT 0;

-- DropForeignKey (to recreate as optional)
ALTER TABLE "listings" DROP CONSTRAINT "listings_user_id_fkey";

-- AddForeignKey (optional relation)
ALTER TABLE "listings" ADD CONSTRAINT "listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for guest listings in moderation queue
CREATE INDEX "idx_listing_guest" ON "listings"("is_guest_listing") WHERE "is_guest_listing" = true;

-- Index for bump sorting
CREATE INDEX "idx_listing_bumped_at" ON "listings"("bumped_at" DESC NULLS LAST);
