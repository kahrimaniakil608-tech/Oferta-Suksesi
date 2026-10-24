-- Complete the previously untracked embed schema on fresh databases, preserving existing installations.
ALTER TYPE "AdType" ADD VALUE IF NOT EXISTS 'EMBED_CODE';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS embed_code TEXT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "featured_until" TIMESTAMP(3),
ADD COLUMN     "numeric_price" DECIMAL(20,2),
ADD COLUMN     "spam_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "urgent_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "moderation_logs" ADD COLUMN     "subject_user_id" TEXT;

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "lock_token" TEXT,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_reports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "resolved_by" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_claims" (
    "key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_claims_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT,
    "claim_hash" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attached_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "promotion_grants" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "granted_by" TEXT,
    "payment_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_events_topic_completed_at_available_at_idx" ON "outbox_events"("topic", "completed_at", "available_at");

-- CreateIndex
CREATE INDEX "listing_reports_status_created_at_idx" ON "listing_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "listing_reports_listing_id_reporter_id_key" ON "listing_reports"("listing_id", "reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_messages_request_key_key" ON "support_messages"("request_key");

-- CreateIndex
CREATE INDEX "support_messages_status_created_at_idx" ON "support_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "event_claims_expires_at_idx" ON "event_claims"("expires_at");

-- CreateIndex
CREATE INDEX "upload_batches_created_at_deleted_at_idx" ON "upload_batches"("created_at", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_grants_payment_id_key" ON "promotion_grants"("payment_id");

-- CreateIndex
CREATE INDEX "promotion_grants_listing_id_expires_at_idx" ON "promotion_grants"("listing_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_event_id_key" ON "email_logs"("event_id");


-- All writers (including admin tools) enqueue search changes atomically with the row.
CREATE FUNCTION oferta_listing_values() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE days integer;
BEGIN
  NEW.numeric_price := CASE WHEN NEW.attributes->>'price' ~ '^[0-9]{1,16}(\.[0-9]{1,2})?$' THEN (NEW.attributes->>'price')::numeric ELSE NULL END;
  IF NEW.status = 'PUBLISHED' AND (TG_OP = 'INSERT' OR OLD.status <> 'PUBLISHED') THEN
    SELECT COALESCE((SELECT value::integer FROM site_settings WHERE key = 'listing_expiry_days'), 30) INTO days;
    NEW.expires_at := CURRENT_TIMESTAMP + make_interval(days => days);
  END IF;
  IF NEW.is_featured AND (TG_OP='INSERT' OR NOT OLD.is_featured) THEN NEW.featured_until:=CURRENT_TIMESTAMP+interval '7 days'; END IF;
  IF NEW.is_urgent AND (TG_OP='INSERT' OR NOT OLD.is_urgent) THEN NEW.urgent_until:=CURRENT_TIMESTAMP+interval '7 days'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER listing_values BEFORE INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION oferta_listing_values();
UPDATE listings SET numeric_price = CASE WHEN attributes->>'price' ~ '^[0-9]{1,16}(\.[0-9]{1,2})?$' THEN (attributes->>'price')::numeric ELSE NULL END;
CREATE INDEX idx_listing_price ON listings(numeric_price, id);

CREATE FUNCTION oferta_listing_events() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_id text; event_topic text;
BEGIN
  row_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  IF TG_OP <> 'UPDATE' OR (to_jsonb(NEW) - ARRAY['views_count','contact_clicks','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['views_count','contact_clicks','updated_at']) THEN
    INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',row_id));
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    event_topic := CASE NEW.status WHEN 'PUBLISHED' THEN 'listing.approved' WHEN 'REJECTED' THEN 'listing.rejected' WHEN 'EXPIRED' THEN 'listing.expired' END;
    IF event_topic IS NOT NULL THEN
      INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,event_topic,jsonb_build_object('listingId',NEW.id,'userId',NEW.user_id,'title',NEW.title,'slug',NEW.slug,'isGuestListing',NEW.is_guest_listing));
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER listing_events AFTER INSERT OR UPDATE OR DELETE ON listings FOR EACH ROW EXECUTE FUNCTION oferta_listing_events();

CREATE FUNCTION oferta_image_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END));
  RETURN NULL;
END $$;
CREATE TRIGGER image_events AFTER INSERT OR UPDATE OR DELETE ON listing_images FOR EACH ROW EXECUTE FUNCTION oferta_image_events();

CREATE FUNCTION oferta_user_registered() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,'user.registered',jsonb_build_object('userId',NEW.id,'name',NEW.name,'email',NEW.email));
  RETURN NULL;
END $$;
CREATE TRIGGER user_registered AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION oferta_user_registered();

CREATE FUNCTION oferta_spam_score() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action='AUTO_SPAM_SCORED' THEN UPDATE listings SET spam_score=NEW.spam_score WHERE id=NEW.listing_id; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER spam_score AFTER INSERT ON moderation_logs FOR EACH ROW EXECUTE FUNCTION oferta_spam_score();
UPDATE listings l SET spam_score = COALESCE((SELECT spam_score FROM moderation_logs m WHERE m.listing_id=l.id AND m.action='AUTO_SPAM_SCORED' ORDER BY m.created_at DESC LIMIT 1),0);
-- Existing manual promotions receive a bounded migration grant rather than becoming permanent.
UPDATE listings SET featured_until=CURRENT_TIMESTAMP+interval '7 days' WHERE is_featured;
UPDATE listings SET urgent_until=CURRENT_TIMESTAMP+interval '7 days' WHERE is_urgent;
INSERT INTO outbox_events(id,topic,payload) SELECT gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',id) FROM listings;

ALTER TABLE ad_impressions ADD COLUMN aggregated boolean NOT NULL DEFAULT false;
ALTER TABLE ad_clicks ADD COLUMN aggregated boolean NOT NULL DEFAULT false;
-- Historical rows already represented by daily aggregates must not be added again.
UPDATE ad_impressions r SET aggregated=true WHERE EXISTS(SELECT 1 FROM ad_daily_stats s WHERE s.ad_id=r.ad_id AND s.date=r.created_at::date);
UPDATE ad_clicks r SET aggregated=true WHERE EXISTS(SELECT 1 FROM ad_daily_stats s WHERE s.ad_id=r.ad_id AND s.date=r.created_at::date);

-- max_ads is simultaneous booking inventory. End timestamps are exclusive.
CREATE FUNCTION oferta_ad_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capacity integer; peak integer;
BEGIN
  IF NEW.ends_at<=NEW.starts_at THEN RAISE EXCEPTION 'Campaign end must follow start' USING ERRCODE='23514'; END IF;
  IF NOT NEW.is_active OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  SELECT max_ads INTO capacity FROM ad_zones WHERE id=NEW.zone_id FOR NO KEY UPDATE;
  WITH intervals AS (
    SELECT starts_at s,ends_at e FROM advertisements WHERE zone_id=NEW.zone_id AND id<>NEW.id AND is_active AND deleted_at IS NULL AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at
    UNION ALL SELECT NEW.starts_at,NEW.ends_at
  ), points AS (SELECT s t,1 delta FROM intervals UNION ALL SELECT e,-1 FROM intervals), grouped AS (SELECT t,sum(delta) delta FROM points GROUP BY t), running AS (SELECT sum(delta) OVER(ORDER BY t) n FROM grouped)
  SELECT max(n) INTO peak FROM running;
  IF peak>capacity THEN RAISE EXCEPTION 'Zone capacity exceeded for the requested dates' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ad_capacity BEFORE INSERT OR UPDATE ON advertisements FOR EACH ROW EXECUTE FUNCTION oferta_ad_capacity();

CREATE FUNCTION oferta_listing_policy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row listings%ROWTYPE; image_count integer; maximum integer; require_image boolean;
BEGIN
  IF TG_TABLE_NAME='listings' AND TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-ARRAY['views_count','contact_clicks','updated_at']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['views_count','contact_clicks','updated_at']) THEN RETURN NULL; END IF;
  END IF;
  IF TG_TABLE_NAME='listings' THEN SELECT * INTO row FROM listings WHERE id=NEW.id;
  ELSE SELECT * INTO row FROM listings WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END; END IF;
  IF NOT FOUND OR row.deleted_at IS NOT NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO image_count FROM listing_images WHERE listing_id=row.id;
  maximum:=COALESCE((SELECT value::integer FROM site_settings WHERE key='max_images_per_listing'),8);
  require_image:=COALESCE((SELECT value='true' FROM site_settings WHERE key='require_image_to_publish'),false);
  IF image_count>maximum OR (row.status='PUBLISHED' AND require_image AND image_count=0) THEN RAISE EXCEPTION 'Listing image policy is not satisfied' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER listing_image_policy AFTER INSERT OR UPDATE ON listings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION oferta_listing_policy();
CREATE CONSTRAINT TRIGGER image_count_policy AFTER INSERT OR UPDATE OR DELETE ON listing_images DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION oferta_listing_policy();

CREATE FUNCTION oferta_listing_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE maximum integer; total integer;
BEGIN
  IF NEW.user_id IS NULL OR NEW.deleted_at IS NOT NULL OR NEW.status NOT IN ('DRAFT','PENDING_REVIEW','PUBLISHED') THEN RETURN NULL; END IF;
  IF TG_OP='UPDATE' AND OLD.user_id=NEW.user_id AND OLD.deleted_at IS NULL AND OLD.status IN ('DRAFT','PENDING_REVIEW','PUBLISHED') THEN RETURN NULL; END IF;
  PERFORM id FROM users WHERE id=NEW.user_id FOR NO KEY UPDATE;
  maximum:=COALESCE((SELECT value::integer FROM site_settings WHERE key='max_listings_per_user'),20);
  SELECT count(*) INTO total FROM listings WHERE user_id=NEW.user_id AND deleted_at IS NULL AND status IN ('DRAFT','PENDING_REVIEW','PUBLISHED');
  IF total>maximum THEN RAISE EXCEPTION 'Active listing limit exceeded' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER listing_quota AFTER INSERT OR UPDATE ON listings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION oferta_listing_quota();

CREATE FUNCTION oferta_promotion_grant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_featured AND (TG_OP='INSERT' OR NOT OLD.is_featured) THEN
    INSERT INTO promotion_grants(id,listing_id,kind,source,granted_by,expires_at) VALUES(gen_random_uuid()::text,NEW.id,'FEATURED','MANUAL',nullif(current_setting('oferta.actor_id',true),''),NEW.featured_until);
  END IF;
  IF NEW.is_urgent AND (TG_OP='INSERT' OR NOT OLD.is_urgent) THEN
    INSERT INTO promotion_grants(id,listing_id,kind,source,granted_by,expires_at) VALUES(gen_random_uuid()::text,NEW.id,'URGENT','MANUAL',nullif(current_setting('oferta.actor_id',true),''),NEW.urgent_until);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER promotion_grant AFTER INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION oferta_promotion_grant();

INSERT INTO promotion_grants(id,listing_id,kind,source,expires_at)
SELECT gen_random_uuid()::text,id,'FEATURED','LEGACY_MANUAL',featured_until FROM listings WHERE is_featured;
INSERT INTO promotion_grants(id,listing_id,kind,source,expires_at)
SELECT gen_random_uuid()::text,id,'URGENT','LEGACY_MANUAL',urgent_until FROM listings WHERE is_urgent;

CREATE FUNCTION oferta_zone_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE peak integer;
BEGIN
  IF NEW.max_ads=OLD.max_ads THEN RETURN NEW; END IF;
  WITH points AS (
    SELECT greatest(starts_at,CURRENT_TIMESTAMP) t,1 delta FROM advertisements WHERE zone_id=NEW.id AND is_active AND deleted_at IS NULL AND ends_at>CURRENT_TIMESTAMP
    UNION ALL SELECT ends_at,-1 FROM advertisements WHERE zone_id=NEW.id AND is_active AND deleted_at IS NULL AND ends_at>CURRENT_TIMESTAMP
  ), grouped AS (SELECT t,sum(delta) delta FROM points GROUP BY t), running AS (SELECT sum(delta) OVER(ORDER BY t) n FROM grouped)
  SELECT max(n) INTO peak FROM running;
  IF NEW.max_ads<1 OR peak>NEW.max_ads THEN RAISE EXCEPTION 'Zone capacity conflicts with existing bookings' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zone_capacity BEFORE UPDATE ON ad_zones FOR EACH ROW EXECUTE FUNCTION oferta_zone_capacity();
