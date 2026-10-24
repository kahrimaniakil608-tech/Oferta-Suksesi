-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('IMAGE_BANNER', 'COMPANY_SPOTLIGHT', 'LISTING_BOOST');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HEADER_SLIDER', 'SIDEBAR', 'FOOTER', 'INLINE', 'COMPANY_SPOTLIGHT', 'SEARCH_TOP');

-- AlterTable ad_zones: add timestamps + description, migrate placement to enum
ALTER TABLE "ad_zones"
  ADD COLUMN "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "description" TEXT;

-- Migrate placement column: add new enum column, copy cast, drop old
ALTER TABLE "ad_zones" ADD COLUMN "placement_new" "AdPlacement";
UPDATE "ad_zones"
  SET "placement_new" = CASE "placement"
    WHEN 'HEADER_SLIDER'     THEN 'HEADER_SLIDER'::"AdPlacement"
    WHEN 'SIDEBAR'           THEN 'SIDEBAR'::"AdPlacement"
    WHEN 'FOOTER'            THEN 'FOOTER'::"AdPlacement"
    WHEN 'INLINE'            THEN 'INLINE'::"AdPlacement"
    WHEN 'COMPANY_SPOTLIGHT' THEN 'COMPANY_SPOTLIGHT'::"AdPlacement"
    WHEN 'SEARCH_TOP'        THEN 'SEARCH_TOP'::"AdPlacement"
    ELSE 'SIDEBAR'::"AdPlacement"
  END;
ALTER TABLE "ad_zones" DROP COLUMN "placement";
ALTER TABLE "ad_zones" RENAME COLUMN "placement_new" TO "placement";
ALTER TABLE "ad_zones" ALTER COLUMN "placement" SET NOT NULL;

-- AlterTable advertisements: add new columns + make image_url nullable
ALTER TABLE "advertisements"
  ADD COLUMN "ad_type"    "AdType"      NOT NULL DEFAULT 'IMAGE_BANNER',
  ADD COLUMN "created_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ALTER COLUMN "image_url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_ad_click_ad_created" ON "ad_clicks"("ad_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ad_zone_active" ON "advertisements"("zone_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_ad_dates" ON "advertisements"("starts_at", "ends_at");
