-- AlterTable: add slug column (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "slug" TEXT;

-- Backfill: generate unique slugs from name
WITH cleaned AS (
  SELECT
    id,
    REGEXP_REPLACE(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[ëË]', 'e', 'g'), '[çÇ]', 'c', 'g')),
          '[^a-z0-9]+', '-', 'g')
      ),
      '-+', '-', 'g'
    ) AS base_slug,
    "created_at"
  FROM "users"
),
numbered AS (
  SELECT
    id,
    CASE WHEN base_slug = '' OR base_slug IS NULL THEN 'user' ELSE base_slug END AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY CASE WHEN base_slug = '' OR base_slug IS NULL THEN 'user' ELSE base_slug END
      ORDER BY "created_at"
    ) AS rn
  FROM cleaned
)
UPDATE "users" u
SET "slug" = CASE
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn
END
FROM numbered n
WHERE u.id = n.id;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "users" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");
