#!/usr/bin/env bash
set -euo pipefail

# Dumps the Neon database to db/dumps/backup-<D-M-YYYY-HH-MM><AM/PM>.sql
# Requires the Neon CLI (`neon`) to be authenticated and configured for this project.

OUT_DIR="db/dumps"
TIMESTAMP="$(date +'%-d-%-m-%Y-%I-%M%p')"
OUT_FILE="${OUT_DIR}/backup-${TIMESTAMP}.sql"

mkdir -p "${OUT_DIR}"

CONNECTION_STRING="$(neon connection-string --database-name neondb)"

pg_dump "${CONNECTION_STRING}" > "${OUT_FILE}"

echo "Database dumped to ${OUT_FILE}"
