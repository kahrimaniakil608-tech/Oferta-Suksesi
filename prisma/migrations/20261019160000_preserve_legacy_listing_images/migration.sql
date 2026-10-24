-- Existing listings may predate the configured image limit. Preserve their
-- photos and allow metadata/lifecycle changes, reorder and removal. Enforce
-- the current limit on newly inserted photos, moves to another listing, new
-- listings and restoration from soft deletion. Required-photo checks remain.
CREATE OR REPLACE FUNCTION oferta_listing_policy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row listings%ROWTYPE;
  image_count integer;
  maximum integer;
  require_image boolean;
  enforce_maximum boolean;
BEGIN
  IF TG_TABLE_NAME='listings' THEN
    IF TG_OP='UPDATE' THEN
      IF (to_jsonb(NEW)-ARRAY['views_count','contact_clicks','updated_at']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['views_count','contact_clicks','updated_at']) THEN RETURN NULL; END IF;
      enforce_maximum := OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL;
    ELSE
      enforce_maximum := true;
    END IF;
    SELECT * INTO row FROM listings WHERE id=NEW.id;
  ELSE
    enforce_maximum := TG_OP='INSERT';
    IF TG_OP='UPDATE' THEN
      enforce_maximum := NEW.listing_id IS DISTINCT FROM OLD.listing_id;
    END IF;
    SELECT * INTO row FROM listings WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END;
  END IF;
  IF NOT FOUND OR row.deleted_at IS NOT NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO image_count FROM listing_images WHERE listing_id=row.id;
  maximum:=COALESCE((SELECT value::integer FROM site_settings WHERE key='max_images_per_listing'),8);
  require_image:=COALESCE((SELECT value='true' FROM site_settings WHERE key='require_image_to_publish'),false);
  IF (enforce_maximum AND image_count>maximum) OR (row.status='PUBLISHED' AND require_image AND image_count=0) THEN
    RAISE EXCEPTION 'Listing image policy is not satisfied' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
