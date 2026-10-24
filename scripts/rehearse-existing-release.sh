#!/usr/bin/env bash
# Run only migration/proxy checks against an isolated restore; no live writes.
set -euo pipefail
umask 077
oferta_release=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$oferta_release"
oferta_commit=$(git rev-parse HEAD)
oferta_backup=${1:-$(cat /root/oferta-backups/latest-path)}
[ -s "$oferta_backup/database.dump" ]
[ -s .nginx.candidate.conf ]
python3 - "$oferta_commit" <<'PY'
from pathlib import Path
import sys
settings = dict(line.split('=', 1) for line in Path('.release.env').read_text().splitlines())
if settings.get('OFERTA_RELEASE_TAG') != sys.argv[1]:
    raise SystemExit('Release metadata does not match this checkout.')
PY
oferta_nginx_image=$(docker inspect --format '{{.Image}}' oferta_nginx)
docker run --rm --pull=never --network none \
  --add-host api:127.0.0.1 --add-host web:127.0.0.1 --add-host image-service:127.0.0.1 \
  --mount "type=bind,src=$oferta_release/.nginx.candidate.conf,dst=/etc/nginx/conf.d/default.conf,readonly" \
  --mount type=bind,src=/etc/ssl/cloudflare,dst=/etc/ssl/cloudflare,readonly \
  --entrypoint nginx "$oferta_nginx_image" -t < /dev/null
printf '\nNGINX_CANDIDATE_OK\n'
oferta_check="oferta-migration-check-$(date -u +%Y%m%dT%H%M%SZ)-$$"
oferta_pg_image=$(docker inspect --format '{{.Image}}' oferta_postgres)
oferta_api_image=$(docker image inspect --format '{{.Id}}' "ofertasuksesi-api:$oferta_commit")
docker run --pull=never --rm -d --name "$oferta_check" --network none \
  --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_USER=oferta_restore -e POSTGRES_DB=oferta_restore \
  -e POSTGRES_PASSWORD=temporary_restore_check_only "$oferta_pg_image" > /dev/null
trap 'docker rm -f "$oferta_check" > /dev/null 2>&1 || true' EXIT
oferta_ready=no
for attempt in {1..30}; do
  if docker exec "$oferta_check" pg_isready -h 127.0.0.1 -U oferta_restore -d oferta_restore > /dev/null 2>&1; then
    oferta_ready=yes
    break
  fi
  sleep 1
done
[ "$oferta_ready" = yes ]
docker exec -i "$oferta_check" pg_restore --clean --if-exists --exit-on-error --no-owner --no-privileges \
  -U oferta_restore -d oferta_restore < "$oferta_backup/database.dump"
oferta_psql() {
  docker exec "$oferta_check" psql -X -v ON_ERROR_STOP=1 -U oferta_restore -d oferta_restore "$@"
}
oferta_counts_sql="SELECT 'users',count(*) FROM users UNION ALL SELECT 'listings',count(*) FROM listings UNION ALL SELECT 'companies',count(*) FROM companies UNION ALL SELECT 'listing_images',count(*) FROM listing_images UNION ALL SELECT 'advertisements',count(*) FROM advertisements UNION ALL SELECT 'payments',count(*) FROM payments UNION ALL SELECT 'ad_daily_stats',count(*) FROM ad_daily_stats ORDER BY 1;"
oferta_before=$(oferta_psql -Atc "$oferta_counts_sql")
for oferta_action in deploy status; do
  docker run --rm --pull=never --network "container:$oferta_check" \
    -e DATABASE_URL=postgresql://oferta_restore:temporary_restore_check_only@127.0.0.1:5432/oferta_restore \
    --entrypoint node "$oferta_api_image" node_modules/prisma/build/index.js migrate "$oferta_action" < /dev/null
done
[ "$(oferta_psql -Atc "SELECT count(*) FROM _prisma_migrations WHERE migration_name='20261019160000_preserve_legacy_listing_images' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;")" = 1 ]
[ "$(oferta_psql -Atc "SELECT count(*) FROM _prisma_migrations WHERE migration_name='20261019170000_skip_deleted_listing_notifications' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;")" = 1 ]
# Exercise real legacy rows, then roll back every rehearsal edit and queued event.
docker exec -i "$oferta_check" psql -X -v ON_ERROR_STOP=1 -U oferta_restore -d oferta_restore -P pager=off <<'SQL'
BEGIN;
CREATE TEMP TABLE legacy_photo_listings ON COMMIT DROP AS
SELECT l.id FROM listings l JOIN listing_images i ON i.listing_id=l.id
WHERE l.deleted_at IS NULL GROUP BY l.id
HAVING count(*) > COALESCE((SELECT value::integer FROM site_settings WHERE key='max_images_per_listing'),8);
SELECT count(*) AS legacy_photo_collections FROM legacy_photo_listings;
UPDATE listings SET title='Migration compatibility rehearsal' WHERE id IN (SELECT id FROM legacy_photo_listings);
UPDATE listing_images SET position=position WHERE listing_id IN (SELECT id FROM legacy_photo_listings);
UPDATE listings SET status='EXPIRED' WHERE status='PUBLISHED' AND expires_at<=now();
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM outbox_events e JOIN listings l ON l.id=e.payload->>'listingId'
    WHERE l.deleted_at IS NOT NULL AND e.topic IN ('listing.approved','listing.rejected','listing.expired')
  ) THEN RAISE EXCEPTION 'Deleted listing generated a customer notification'; END IF;
END $$;
SELECT count(*) AS expiry_notifications_for_non_deleted_listings
FROM outbox_events WHERE topic='listing.expired';
ROLLBACK;
SQL
oferta_after=$(oferta_psql -Atc "$oferta_counts_sql")
if [ "$oferta_before" != "$oferta_after" ]; then
  printf 'Record counts changed. Before:\n%s\nAfter:\n%s\n' "$oferta_before" "$oferta_after"
  exit 1
fi
[ "$(oferta_psql -Atc "SELECT count(*) FROM outbox_events WHERE topic <> 'search.listing';")" = 0 ]
printf '\nPreserved record counts:\n%s\n' "$oferta_after"
oferta_psql -P pager=off -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL AND migration_name LIKE '202610%' ORDER BY migration_name; SELECT topic,count(*) FROM outbox_events GROUP BY topic;"
printf '\nMIGRATION_REHEARSAL_OK %s\n' "$oferta_commit"
