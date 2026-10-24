#!/usr/bin/env bash
set -euo pipefail
: "${SMOKE_API_URL:=http://localhost:3001/api/v1}"
: "${SMOKE_ADMIN_EMAIL:?Set the synthetic admin email}"
: "${SMOKE_ADMIN_PASSWORD:?Set the synthetic admin password}"
export SMOKE_ADMIN_EMAIL SMOKE_ADMIN_PASSWORD
smoke_dir=$(mktemp -d)
trap 'rm -rf "$smoke_dir"' EXIT
python3 -c 'import os,json; print(json.dumps({"email": os.environ["SMOKE_ADMIN_EMAIL"], "password": os.environ["SMOKE_ADMIN_PASSWORD"]}))' > "$smoke_dir/login.json"
curl --fail --silent --show-error -c "$smoke_dir/cookies" -H 'Content-Type: application/json' --data-binary "@$smoke_dir/login.json" "$SMOKE_API_URL/auth/login" -o "$smoke_dir/user.json"
curl --fail --silent --show-error -b "$smoke_dir/cookies" "$SMOKE_API_URL/admin/listings?page=1&limit=1" -o "$smoke_dir/listings.json"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert "statusCounts" in d["meta"]; print("PASS: cookie login and authenticated admin listing metadata")' "$smoke_dir/listings.json"
curl --fail --silent --show-error -b "$smoke_dir/cookies" -c "$smoke_dir/cookies" -X POST "$SMOKE_API_URL/auth/logout" -o /dev/null
