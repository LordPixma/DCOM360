# Flare360

This repo contains a Vite + React frontend and a Cloudflare Worker mock API per the LLD/HLD.

Quickstart (local):
- API (Worker mock): `worker/`
- Frontend (Vite): `frontend/`

Environment:
- Copy `frontend/.env.example` to `frontend/.env` and set:
	- `VITE_API_BASE` -> your Worker URL (e.g. http://127.0.0.1:8787 for local dev)
	- `VITE_MAPBOX_ACCESS_TOKEN` -> Mapbox public token

Production checklist (summary):
- API: Configure and deploy the Cloudflare Worker in `worker/` with proper routes and CORS.
- Frontend: Build with `vite build` and deploy to Cloudflare Pages or your host; set Pages env vars for VITE_*
- Security: tighten CORS on Worker to your production domain; remove wildcard `*`.
- Observability: add basic logging/alerts for Worker errors and set up uptime checks.
- Performance: enable asset caching and set sensible Cache-Control headers on API responses.

See HLD.md and LLD.md for detailed architecture and implementation guidance.