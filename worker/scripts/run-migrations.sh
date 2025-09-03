#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <D1_DATABASE_ID>" >&2
  exit 1
fi

DB_ID="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

for f in $(ls -1 "$ROOT_DIR/migrations"/*.sql | sort); do
  echo "Applying migration: $f"
  wrangler d1 execute "$DB_ID" --file "$f"
done

echo "All migrations applied."
