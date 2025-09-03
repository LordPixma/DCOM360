## Worker (API) - D1 Setup

### Prerequisites
- Cloudflare Wrangler CLI configured and logged in.

### Bind D1 Database
Add to `wrangler.toml` (adjust for envs):

```
[[d1_databases]]
binding = "DB"
database_name = "dcom360"
database_id = "<your-d1-id>"
```

### Apply Migrations
From the `worker/` directory:

```
wrangler d1 execute <your-d1-id> --file migrations/0001_init.sql
wrangler d1 execute <your-d1-id> --file migrations/0002_history_and_logs.sql
# optional seed
wrangler d1 execute <your-d1-id> --file migrations/0003_seed_dev.sql
```

### Dev

```
npm run dev
```

### Endpoints
- GET `/api/health`
- GET `/api/disasters/current?type=&severity=&country=&limit=&offset=`
- GET `/api/disasters/summary`
- GET `/api/disasters/history?days=7`

### Optional: KV Cache Binding
Add to `wrangler.toml` to enable response caching:

```
[[kv_namespaces]]
binding = "CACHE"
id = "<your-kv-id>"
```
