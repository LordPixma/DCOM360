# Flare360 Ingestion Worker (Email)

This worker ingests GDACS-like alerts via:

- HTTP endpoint: `POST /ingest/email` with JSON `{ subject, body }` and `Authorization: Bearer <INGEST_SECRET>`
- Cloudflare Email Routing → Email Workers: emails forwarded to the worker are parsed and persisted.
- RSS endpoints:
   - `POST /ingest/gdacs` pulls the GDACS RSS feed once on demand and persists new items.
   - `POST /ingest/reliefweb` pulls the ReliefWeb Disasters RSS on demand and persists items with inferred severities.

## Configure Cloudflare Email Routing

1. Register a domain in Cloudflare and enable Email Routing.
2. Create an address (e.g. `gdacs@yourdomain.com`) and route it to **Workers** → select this worker (`flare360-ingest`).
3. Deploy the worker and set the secret:
   - `wrangler secret put INGEST_SECRET --env production` and paste your token.
4. (Optional) Keep `INGEST_TOKEN` for staging/dev as a plain var in `wrangler.toml`.

## Expected Email Format

Plain text lines (minimal parser):

```
Type: Earthquake
Severity: RED
Country: NG
Lat: 9.08
Lng: 8.68
Date: 2025-09-03T10:00:00Z
Title: Sample Event
Description: ...
```

Subject is also considered for ID/title. The parser is tolerant and falls back when fields are missing.

## Local Dev

- HTTP: `npm run dev` then `curl -X POST http://127.0.0.1:8787/ingest/email -H "content-type: application/json" -H "authorization: Bearer dev-token-123" -d '{"subject":"[GDACS] Test","body":"Type: Flood\nSeverity: ORANGE"}'`
- Email: Email Workers aren’t simulated in `--local`; test via production/staging routing or send HTTP JSON to mimic content.
- GDACS RSS: `curl -X POST http://127.0.0.1:8787/ingest/gdacs -H "authorization: Bearer dev-token-123"`
- ReliefWeb RSS: `curl -X POST http://127.0.0.1:8787/ingest/reliefweb -H "authorization: Bearer dev-token-123"`

## Data Flow

- Upsert into `disasters` by `external_id`.
- If severity changes, entry added to `disaster_history`.
- Processing summary appended into `processing_logs`.
- Cache keys invalidated in KV: `disasters:summary`, `disasters:current:*`, `disasters:history:7`, `countries:list`.



## Newsletter parsing and normalization

- Multi-event parsing: GDACS daily newsletters are parsed to extract multiple earthquakes and tropical cyclones in one run.
- Country normalization: Country names are normalized to ISO-2 codes where possible; the original name is kept in `metadata.original_country_name`.
- Cyclone enrichment: Attempts to extract `metadata.category` (1–5) and the maximum wind speed `metadata.max_wind_kmh` when present in the newsletter text.
