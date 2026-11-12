# Redpay admin panel (DCB-DITO)

React 18 + TypeScript + Vite, MUI 6 and antd 5. Styling lives in `src/styles/frame.css` (tokens at the top).

## Branches and where they go

- `main` is production. Every push to `main` auto-deploys to Cloudflare Pages (dcb-dito.pages.dev) and is used by the ops team.
- `staging` is where all work happens. It is tried on the private staging server before it may reach `main`.

## Rules

1. Work on the `staging` branch. Run `git branch --show-current` first; if it is not `staging`, switch to it.
2. Never push to `main`, merge into `main` or open a PR to `main` unless the user says so in this conversation.
3. After a change, type-check, then deploy to staging and tell the user what to look at:
   ```bash
   npx tsc --noEmit -p .
   scripts/deploy-staging.sh
   ```
   Staging: http://100.88.239.67:8080 (Tailscale only). Any username and password log in; a username containing "merchant" logs in as a merchant.
4. Commit to `staging` with a short message saying what changed and why. Push `staging` only when the user asks.
5. Do not change business logic (API calls, calculations, filters) unless the user asks for it; most requests are UI and UX.

## Staging setup

- Staging uses `dito-api` (`mock-api/server.mjs`), a mock of the Redpay API with sample data, never the real API.
  - Its data is in `~/staging/dito-api-data/db.json` on the server.
  - When you change `mock-api/`, run `scripts/staging-server-setup.sh` to restart it. The data is kept.
- `VITE_API_URL` points a build at another API. Only `scripts/deploy-staging.sh` sets it. Production builds must not set it.
- The server is `redision-belajar` (Dell R710, 4 GB RAM, Docker). Containers:
  - `dcb-staging`: nginx on :8080. It serves `~/staging/dcb-dito/html` and proxies `/api` to dito-api.
  - `dito-api`: Node on :8081, reached only inside the Docker network.
