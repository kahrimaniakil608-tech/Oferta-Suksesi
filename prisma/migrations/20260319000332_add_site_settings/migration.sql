-- AlterTable
ALTER TABLE "ad_zones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "advertisements" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);
