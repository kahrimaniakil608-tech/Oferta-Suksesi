#!/usr/bin/env bash
set -euo pipefail
oferta_release_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [ ! -f "$oferta_release_dir/.release.env" ]; then
  echo 'Run scripts/prepare-existing-release.py first.' >&2
  exit 1
fi
exec docker compose \
  --project-name ofertasuksesi \
  --project-directory "$oferta_release_dir" \
  --env-file "$oferta_release_dir/.env" \
  --env-file "$oferta_release_dir/.release.env" \
  -f "$oferta_release_dir/docker-compose.yml" \
  -f "$oferta_release_dir/docker-compose.existing-network.yml" "$@"
