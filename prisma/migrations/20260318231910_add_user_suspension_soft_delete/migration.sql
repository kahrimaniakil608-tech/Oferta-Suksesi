-- AlterTable
ALTER TABLE "moderation_logs" ALTER COLUMN "listing_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_until" TIMESTAMP(3);
