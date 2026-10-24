/*
  Warnings:

  - You are about to drop the column `category_id` on the `advertisements` table. All the data in the column will be lost.
  - You are about to drop the column `city_id` on the `advertisements` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "advertisements" DROP COLUMN "category_id",
DROP COLUMN "city_id";

-- CreateTable
CREATE TABLE "ad_target_categories" (
    "ad_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "ad_target_categories_pkey" PRIMARY KEY ("ad_id","category_id")
);

-- CreateTable
CREATE TABLE "ad_target_cities" (
    "ad_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "ad_target_cities_pkey" PRIMARY KEY ("ad_id","city_id")
);

-- CreateIndex
CREATE INDEX "idx_ad_target_category" ON "ad_target_categories"("category_id");

-- CreateIndex
CREATE INDEX "idx_ad_target_city" ON "ad_target_cities"("city_id");

-- AddForeignKey
ALTER TABLE "ad_target_categories" ADD CONSTRAINT "ad_target_categories_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_target_cities" ADD CONSTRAINT "ad_target_cities_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
