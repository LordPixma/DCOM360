#!/usr/bin/env bash
set -euo pipefail

# Creates Cloudflare D1 DB, KV namespace, and Pages project, then updates worker/wrangler.toml
# Requirements: wrangler >=4, jq

usage() {
  cat <<EOF
Usage: $0 --account-id <id> [--db-name flare360-db] [--kv-name flare360-cache] [--pages-name flare360-frontend]

Examples:
  $0 --account-id 1234567890abcdef --db-name flare360-db --kv-name flare360-cache --pages-name flare360-frontend
EOF
}

ACCOUNT_ID=""
DB_NAME="flare360-db"
KV_NAME="flare360-cache"
PAGES_NAME="flare360-frontend"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account-id) ACCOUNT_ID="$2"; shift 2 ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --kv-name) KV_NAME="$2"; shift 2 ;;
    --pages-name) PAGES_NAME="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "--account-id is required" >&2
  usage
  exit 1
fi

command -v wrangler >/dev/null 2>&1 || { echo "wrangler CLI not found" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/worker"

echo "Creating/ensuring D1 database: $DB_NAME"
# Ensure Wrangler uses the provided account non-interactively
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

# Try to find DB via list (JSON)
set +e
D1_JSON=$(wrangler d1 list --json 2>/dev/null | jq -c ".[] | select(.name == \"$DB_NAME\")")
set -e
if [[ -z "$D1_JSON" || "$D1_JSON" == "null" ]]; then
  echo "D1 not found, creating..."
  # Create DB (no JSON output in this Wrangler version); ignore errors if already exists
  set +e
  wrangler d1 create "$DB_NAME" >/dev/null 2>&1
  set -e
  # Re-list to obtain JSON shape
  D1_JSON=$(wrangler d1 list --json | jq -c ".[] | select(.name == \"$DB_NAME\")")
fi
DB_ID=$(echo "$D1_JSON" | jq -r '.uuid // .id // .database_id')
if [[ -z "$DB_ID" || "$DB_ID" == "null" ]]; then
  echo "Failed to obtain D1 ID" >&2; exit 1
fi
echo "D1 ID: $DB_ID"

echo "Creating/ensuring KV namespace: $KV_NAME"
# Try to find namespace via list output (non-JSON)
set +e
KV_LIST=$(wrangler kv namespace list 2>/dev/null || true)
set -e
KV_ID=""
if echo "$KV_LIST" | grep -qi "^$KV_NAME\b" || echo "$KV_LIST" | grep -qi "\b$KV_NAME\b"; then
  # Extract the last field of the matching line as ID (works with typical table output)
  KV_ID=$(echo "$KV_LIST" | awk -v name="$KV_NAME" 'BEGIN{IGNORECASE=1} $0 ~ name {id=$NF} END{print id}')
fi

if [[ -z "$KV_ID" ]]; then
  echo "KV not found, creating..."
  set +e
  KV_CREATE_OUT=$(wrangler kv namespace create "$KV_NAME" 2>&1)
  set -e
  # Try to parse an ID-like token (hex or uuid) from the output
  KV_ID=$(echo "$KV_CREATE_OUT" | grep -Eo '[a-f0-9]{32}|[0-9a-f-]{36}' | head -n1)
  if [[ -z "$KV_ID" ]]; then
    # Fallback: list again and parse
    KV_LIST=$(wrangler kv namespace list)
    KV_ID=$(echo "$KV_LIST" | awk -v name="$KV_NAME" 'BEGIN{IGNORECASE=1} $0 ~ name {id=$NF} END{print id}')
  fi
fi

if [[ -z "$KV_ID" ]]; then
  echo "Failed to obtain KV ID" >&2; exit 1
fi
echo "KV ID: $KV_ID"

echo "Creating Pages project: $PAGES_NAME (branch: main)"
set +e
wrangler pages project create "$PAGES_NAME" --production-branch main >/dev/null 2>&1 || true
set -e
echo "Pages project ensured."

echo "Updating worker/wrangler.toml bindings..."
TOML="$WORKER_DIR/wrangler.toml"
cp "$TOML" "$TOML.bak.$(date +%s)"

if ! grep -q '^account_id = ' "$TOML"; then
  printf 'account_id = "%s"\n%s' "$ACCOUNT_ID" "$(cat "$TOML")" > "$TOML"
fi

if ! grep -q '\[\[d1_databases\]\]' "$TOML"; then
  cat >> "$TOML" <<EOF

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "$DB_ID"
EOF
fi

if ! grep -q '\[\[kv_namespaces\]\]' "$TOML"; then
  cat >> "$TOML" <<EOF

[[kv_namespaces]]
binding = "CACHE"
id = "$KV_ID"
EOF
fi

echo "Done. worker/wrangler.toml updated with account_id, D1 and KV bindings."

echo "Next steps:"
echo "  1) Apply D1 migrations: (cd worker && ./scripts/run-migrations.sh $DB_ID)"
echo "  2) Start dev: (cd worker && npm run dev)"
echo "  3) Configure ENV_ORIGIN in worker/wrangler.toml for production"
