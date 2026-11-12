#!/usr/bin/env bash
# One-time (re)setup of the staging server: nginx for the panel and dito-api (mock API) behind it.
# Both listen on the server's Tailscale IP only. Safe to run again; data in ~/staging/dito-api-data is kept.
# Usage: scripts/staging-server-setup.sh   (then scripts/deploy-staging.sh)
set -euo pipefail

HOST="${STAGING_HOST:-noc@100.88.239.67}"
IP="${HOST#*@}"

cd "$(dirname "$0")/.."
rsync -az mock-api/ "$HOST:staging/dito-api/"

ssh "$HOST" IP="$IP" 'bash -s' <<'REMOTE'
set -euo pipefail
mkdir -p ~/staging/dcb-dito/html ~/staging/dito-api-data
cat > ~/staging/dcb-dito/nginx.conf <<"EOF"
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # The mock API (dito-api container) on the same origin, so the panel needs no CORS.
  location /api/ {
    proxy_pass http://dito-api:8081;
    proxy_set_header Host $host;
    proxy_read_timeout 120s;
  }
  # Single-page app: every route falls back to index.html.
  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
  }
  # Hashed build assets never change, so they can be cached for good.
  location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
EOF
[ -f ~/staging/dcb-dito/html/index.html ] || echo "<h1>DCB staging: no build yet</h1>" > ~/staging/dcb-dito/html/index.html

docker network create dcb-staging-net >/dev/null 2>&1 || true
docker rm -f dito-api dcb-staging >/dev/null 2>&1 || true
docker run -d --name dito-api --restart unless-stopped --network dcb-staging-net \
  -e TZ=Asia/Jakarta \
  -v ~/staging/dito-api:/app:ro -v ~/staging/dito-api-data:/data \
  node:22-alpine node /app/server.mjs >/dev/null
docker run -d --name dcb-staging --restart unless-stopped --network dcb-staging-net \
  -p "$IP:8080:80" \
  -v ~/staging/dcb-dito/html:/usr/share/nginx/html:ro \
  -v ~/staging/dcb-dito/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:1.27-alpine >/dev/null
sleep 5
docker ps --filter name=dito-api --filter name=dcb-staging --format '{{.Names}} {{.Status}} {{.Ports}}'
REMOTE

echo "Staging ready: http://$IP:8080 (API http://$IP:8080/api)"
