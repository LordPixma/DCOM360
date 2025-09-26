# GitHub Copilot Instructions

This repository is **Flare360**, a real-time disaster monitoring dashboard built for Cloudflare. It processes GDACS email/RSS feeds into a traffic-light alerting system.

## Architecture Overview

- **Three main components:**
  1. `worker/` – Cloudflare Worker API server (D1 SQLite)
  2. `ingest-worker/` – Email/RSS ingestion Worker
  3. `frontend/` – React dashboard (Vite + Cloudflare Pages)

**Data Flow:**  
`GDACS Email/RSS → ingest-worker → D1 DB → worker API → React frontend`

## Key Development Patterns

- **Database:**  
  - D1 SQLite, migrations in `worker/migrations/`
  - Apply with: `wrangler d1 execute <db-id> --file migrations/XXX.sql`
  - Tables: `disasters`, `countries`, `admin_users`, `processing_logs`, `disaster_history`
- **API:**  
  - All responses: `{ success, data, error?, meta? }`
  - Severity: DB uses `RED|ORANGE|GREEN`, client uses `red|yellow|green`
  - CORS via `ENV_ORIGIN`
  - KV caching for expensive ops
- **Frontend:**  
  - React Query for server state, Zustand for client state (`appStore`)
  - Custom hooks for API (`useDisasters`, `useSummary`, etc.)
  - MapLibre, Chart.js, Lucide icons
  - Auto-refresh via configurable intervals
  - Filters/preferences persisted with Zustand/localStorage

## Build, Test, Deploy

- **Worker/ingest-worker:**  
  - Deploy: `wrangler deploy --env dev|staging|production`
- **Frontend:**  
  - Build: `npm run build`
  - E2E: `npm run test:e2e` (Playwright)
  - Deploy: Cloudflare Pages (Git integration)

## Integration Points

- **Email/RSS ingestion:**  
  - Email via Cloudflare Routing, plain text format (see below)
  - RSS endpoints: `/ingest/gdacs`, `/ingest/reliefweb`, `/ingest/volcano`
  - Auth: `INGEST_SECRET` bearer token
- **Disaster type normalization:**  
  - Types: `earthquake`, `cyclone`, `flood`, `wildfire`, `landslide`, `drought`, `other`
  - Severity: `RED`, `ORANGE`, `GREEN`
  - Country: ISO-2 codes, fallback to original
- **Admin:**  
  - Panel at `/admin`, token auth via `ADMIN_TOKEN`
  - Tabs: Overview, Countries, Logs, Danger zone

## Specialized Patterns

- **Earthquake parsing:**  
  - Handles HTML/raw text, multi-pattern extraction
  - Regional clustering, timeline extraction, enrichment via detail page fetch
- **Frontend config:**  
  - Uses `VITE_API_BASE`, `VITE_MAPTILER_KEY`
  - Auto-detects API endpoint for known domains

## Examples

- **Email format:**
  ```
  Type: Earthquake
  Severity: RED|ORANGE|GREEN
  Country: NG
  Lat: 9.08
  Lng: 8.68
  Date: 2025-09-03T10:00:00Z
  Title: Sample Event
  Description: ...
  ```

## References

- See `HLD.md` and `LLD.md` for architecture details
- Custom hooks: `frontend/src/hooks/`
- API: `worker/src/`
- Ingestion: `ingest-worker/src/`
- Migrations: `worker/migrations/`