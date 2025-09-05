# E2E Setup

- Create `.env.e2e` (already added) with:
  - `VITE_API_BASE=https://flare360-worker.samuel-1e5.workers.dev`
  - Optional maps:
    - `VITE_MAPTILER_KEY=your_maptiler_key`
- Run tests: use the repo task or npm script if present.
- Map is optional; tests allow zero markers if no MapTiler key.
