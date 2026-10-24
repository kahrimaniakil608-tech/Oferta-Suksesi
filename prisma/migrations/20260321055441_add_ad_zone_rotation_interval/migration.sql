-- DropIndex
DROP INDEX "idx_listing_bumped_at";

-- AlterTable
ALTER TABLE "ad_zones" ADD COLUMN     "rotation_interval" INTEGER NOT NULL DEFAULT 5;
