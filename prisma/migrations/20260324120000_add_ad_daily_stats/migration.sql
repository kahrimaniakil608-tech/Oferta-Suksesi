-- CreateTable
CREATE TABLE "ad_daily_stats" (
    "id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "unique_ips" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ad_daily_stat_date" ON "ad_daily_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ad_daily_stat" ON "ad_daily_stats"("ad_id", "date");

-- AddForeignKey
ALTER TABLE "ad_daily_stats" ADD CONSTRAINT "ad_daily_stats_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
