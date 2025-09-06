#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <D1_DATABASE_NAME_OR_BINDING> [--remote]" >&2
  exit 1
fi

# Parse args: first non-flag is DB, optional --remote
DB_TARGET=""
REMOTE_FLAG=""
for arg in "$@"; do
  if [[ "$arg" == "--remote" ]]; then
    REMOTE_FLAG="--remote"
  elif [[ -z "$DB_TARGET" ]]; then
    DB_TARGET="$arg"
  fi
done

if [[ -z "$DB_TARGET" ]]; then
  echo "Database name/binding is required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

for f in $(ls -1 "$ROOT_DIR/migrations"/*.sql | sort); do
  base="$(basename "$f")"
  if [[ -n "$REMOTE_FLAG" && "$base" == *_dev.sql ]]; then
    echo "Skipping dev-only migration on remote: $f"
    continue
  fi
  echo "Applying migration: $f"
  wrangler d1 execute "$DB_TARGET" $REMOTE_FLAG --file "$f"
done

echo "All migrations applied."
