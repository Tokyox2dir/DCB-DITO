#!/usr/bin/env bash
# Build the panel and publish it to the private staging server (reachable over Tailscale only).
# Staging talks only to dito-api, the mock API on the same server, so nothing touches real Redpay data.
# Usage: scripts/deploy-staging.sh            -> http://100.88.239.67:8080 (API http://100.88.239.67:8080/api, proxied to dito-api)
#        STAGING_HOST=noc@other-host scripts/deploy-staging.sh
# Works from a laptop (rsync over SSH) and on the staging server itself (local copy).
set -euo pipefail

HOST="${STAGING_HOST:-noc@100.88.239.67}"
DEST="${STAGING_DIR:-staging/dcb-dito/html}"

API_URL="${STAGING_API_URL:-http://${HOST#*@}:8080/api}"

cd "$(dirname "$0")/.."

VITE_API_URL="$API_URL" npm run build

# --delete removes files from older builds; the nginx container serves the folder as is.
# On the staging server itself the folder is local, so copy straight into it.
if [ -d "$HOME/$DEST" ]; then
  rsync -a --delete dist/ "$HOME/$DEST/"
else
  rsync -az --delete dist/ "$HOST:$DEST/"
fi

echo "Staging updated: http://${HOST#*@}:8080 -> API $API_URL ($(git rev-parse --short HEAD)$(git diff --quiet || echo ', with uncommitted changes'))"
