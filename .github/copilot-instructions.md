# GitHub Copilot Instructions

This is **Flare360**, a real-time disaster monitoring dashboard that processes GDACS email newsletters into a traffic light alerting system hosted on Cloudflare.

## Architecture Overview

This is a **3-component Cloudflare-native system**:

1. **`worker/`** - Main API server (Cloudflare Worker + D1 SQLite)
2. **`ingest-worker/`** - Email/RSS ingestion service (separate Worker)  
3. **`frontend/`** - React dashboard (Vite + Cloudflare Pages)

### Key Data Flow
```
GDACS Email → ingest-worker → D1 Database → worker API → React frontend
RSS Feeds   → ingest-worker → D1 Database → worker API → React frontend
```

## Development Patterns

### Database & Migrations
- **D1 Database**: Cloudflare's SQLite-based solution
- **Migrations**: Sequential SQL files in `worker/migrations/` (e.g., `0001_init.sql`)
- **Apply with**: `wrangler d1 execute <db-id> --file migrations/XXX.sql`
- **Key tables**: `disasters`, `countries`, `admin_users`, `processing_logs`, `disaster_history`
- **Schema Evolution**: Supports both legacy (`id TEXT PRIMARY KEY`) and modern (`id INTEGER AUTOINCREMENT, external_id TEXT UNIQUE`) schemas

### API Conventions
- **All responses** follow `APIResponse<T>` pattern: `{ success: boolean, data: T, error?, meta? }`
- **Severity mapping**: Database uses `RED|ORANGE|GREEN`, client uses `red|yellow|green`
- **CORS**: Configured via `ENV_ORIGIN` env var for multiple domains
- **Caching**: KV store for expensive operations (RSS feeds, external API calls)

### Frontend State Management
- **React Query** for server state (`useDisasters`, `useCountries`, etc.)
- **Zustand** for client state (`appStore` - filters, preferences)
- **Persist**: Filters/preferences saved to localStorage via zustand/persist
- **Auto-refresh**: Configurable intervals for real-time updates

### Component Patterns
- **Hooks first**: Custom hooks for all API calls (`useDisasters`, `useSummary`)
- **MapLibre**: Uses runtime-configurable map styles from backend config via `/api/config`
- **Chart.js**: For visualizations, prefer Chart.js + react-chartjs-2
- **Lucide icons**: Consistent icon library throughout
- **React Query**: For server state with stale time (1 min) and background refetch (15 min)

### Environment Configuration
- **Frontend**: Uses `VITE_API_BASE` and `VITE_MAPTILER_KEY` env vars
- **Auto-detection**: Frontend auto-targets production Worker on known domains
- **Worker environments**: Configured via `wrangler.toml` with dev/staging/production sections
- **Development**: All development done directly on Cloudflare environments (dev/staging)

## Key Commands

### Worker (API)
```bash
cd worker
wrangler deploy --env dev     # Deploy to dev environment
wrangler deploy --env staging # Deploy to staging environment
wrangler deploy              # Deploy to production
```

### Ingest Worker
```bash  
cd ingest-worker
wrangler deploy --env dev     # Deploy to dev environment
wrangler deploy --env staging # Deploy to staging environment
wrangler deploy              # Deploy to production
```

### Frontend
```bash
cd frontend  
npm run build           # Build for production
npm run test:e2e        # Run Playwright tests
# Deploy via Cloudflare Pages connected to Git
```

## Critical Integration Points

### Email Ingestion & RSS Patterns
- **Cloudflare Email Routing** forwards to ingest-worker
- **Expected email format**: Plain text with structured fields:
  ```
  Type: Earthquake
  Severity: RED|ORANGE|GREEN
  Country: NG (ISO-2 code)
  Lat: 9.08
  Lng: 8.68
  Date: 2025-09-03T10:00:00Z
  Title: Sample Event
  Description: ...
  ```
- **RSS endpoints**: `/ingest/gdacs`, `/ingest/reliefweb`, `/ingest/volcano`
- **Auth**: `INGEST_SECRET` bearer token for HTTP endpoints

### RSS Feed Processing Patterns
- **GDACS RSS**: Uses `gdacs:eventid`, `gdacs:alertlevel`, `georss:point` for structured data
- **ReliefWeb RSS**: Infers disaster type from title/description, extracts country from categories
- **VolcanoDiscovery**: Maps earthquakes by magnitude (>=6.5 RED, >=5.0 ORANGE), volcano events to `other` type
- **Type normalization**: `earthquake`, `cyclone`, `flood`, `wildfire`, `landslide`, `drought`, `other`
- **Country resolution**: Names normalized to ISO-2 codes with fallback to original in metadata
- **Processing function**: `normalizeDisasterType()` in ingest-worker handles all type coercion

### Admin Features
- **Admin panel**: React admin app with separate routing (`/admin`)
- **Authentication**: Simple token-based auth via `ADMIN_TOKEN`
- **Tabs**: Overview, Countries, Logs, Danger zone (in `frontend/src/admin/tabs/`)

### Disaster Types & Severity
- **Types**: Earthquake, Flood, Cyclone, Volcano, Drought, etc.
- **Severity levels**: RED (critical), ORANGE (moderate), GREEN (minor)
- **Sources**: GDACS, ReliefWeb, VolcanoDiscovery RSS feeds

### Earthquake Report Formatting
- **Enhanced Parser**: Handles both HTML and raw text formats from multiple sources
- **Visual Components**: Regional distribution, 24-hour timeline, magnitude distribution charts
- **Multi-pattern Parsing**: Supports HTML anchors, raw text entries, and fallback formats
- **Timeline Extraction**: Parses datetime strings to build hourly activity visualizations
- **Regional Clustering**: Automatically groups earthquakes by geographic regions
- **Enrichment Pipeline**: `enrichEqItem()` fetches additional data from earthquake detail pages with KV caching

When working on this codebase:
- Check both `HLD.md` and `LLD.md` for detailed architecture context
- Use the custom hooks pattern for all API interactions
- Follow the existing severity mapping between database and client
- Test on Cloudflare environments: deploy to `dev` for development, `staging` for testing
- Remember that this is a Cloudflare-native stack (Workers, D1, Pages, KV)
- Earthquake reports use specialized parsing in `parseEarthquakeReport()` functions