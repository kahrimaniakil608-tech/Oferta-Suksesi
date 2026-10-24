-- Lifecycle reconciliation can update records that were already soft-deleted.
-- Keep search synchronization, but do not notify customers about deleted ads.
CREATE OR REPLACE FUNCTION oferta_listing_events() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_id text; event_topic text;
BEGIN
  row_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  IF TG_OP <> 'UPDATE' OR (to_jsonb(NEW) - ARRAY['views_count','contact_clicks','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['views_count','contact_clicks','updated_at']) THEN
    INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',row_id));
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.deleted_at IS NULL AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    event_topic := CASE NEW.status WHEN 'PUBLISHED' THEN 'listing.approved' WHEN 'REJECTED' THEN 'listing.rejected' WHEN 'EXPIRED' THEN 'listing.expired' END;
    IF event_topic IS NOT NULL THEN
      INSERT INTO outbox_events(id,topic,payload) VALUES (gen_random_uuid()::text,event_topic,jsonb_build_object('listingId',NEW.id,'userId',NEW.user_id,'title',NEW.title,'slug',NEW.slug,'isGuestListing',NEW.is_guest_listing));
    END IF;
  END IF;
  RETURN NULL;
END $$;
