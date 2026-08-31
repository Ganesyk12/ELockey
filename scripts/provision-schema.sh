#!/usr/bin/env bash
#
# Provision a Postgres schema with the tables defined by the Prisma Next contract.
#
# `prisma db init` only ever emits DDL against the contract's `public` namespace,
# so to get ELockey's tables into a *named* schema (e.g. `elockey`) we:
#   1. run `db init` against a throwaway database to obtain the authoritative DDL,
#   2. dump that DDL (schema-only, unqualified table names),
#   3. drop any existing ELockey tables in the target schema,
#   4. re-apply the DDL with the target schema on the search_path.
#
# Usage:
#   scripts/provision-schema.sh <schema>          # e.g. scripts/provision-schema.sh elockey
#
# Env:
#   DDL_URL  base postgres URL (default: postgres://postgres@127.0.0.1:5432/postgres)

set -euo pipefail

SCHEMA="${1:?usage: provision-schema.sh <schema>}"
BASE_URL="${DDL_URL:-postgres://postgres@127.0.0.1:5432/postgres}"
SCRATCH="$(dirname "$BASE_URL")/_elockey_ddl"

echo ">> Generating DDL via scratch database"
psql "$BASE_URL" -q -c "DROP DATABASE IF EXISTS _elockey_ddl"
psql "$BASE_URL" -q -c "CREATE DATABASE _elockey_ddl"

node node_modules/prisma/dist/prisma.js db init --db "$SCRATCH" >/dev/null 2>&1 || true

pg_dump -d "$SCRATCH" --schema=public --schema-only --no-owner --no-privileges 2>/dev/null \
  | sed -e '/CREATE SCHEMA public;/d' -e 's/SET /-- SET /g' \
        -e '/^COMMENT ON SCHEMA public/d' \
        -e '/search_path/d' \
        -e '/\\restrict/d' -e '/\\unrestrict/d' \
        -e 's/public\.//g' > /tmp/elockey_ddl.sql

psql "$BASE_URL" -q -c "DROP DATABASE IF EXISTS _elockey_ddl"

echo ">> Dropping existing tables in schema \"$SCHEMA\""
psql "$BASE_URL" -q -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS "$SCHEMA"."vaultField" CASCADE;
DROP TABLE IF EXISTS "$SCHEMA".vault CASCADE;
DROP TABLE IF EXISTS "$SCHEMA"."user" CASCADE;
SQL

echo ">> Applying DDL to schema \"$SCHEMA\""
psql "$BASE_URL" -q -c "CREATE SCHEMA IF NOT EXISTS \"$SCHEMA\""
PGOPTIONS="-c search_path=$SCHEMA" psql "$BASE_URL" -q -v ON_ERROR_STOP=1 -f /tmp/elockey_ddl.sql

echo ">> Done: schema \"$SCHEMA\" provisioned"
psql "$BASE_URL" -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='$SCHEMA' AND table_name IN ('user','vault','vaultField') ORDER BY 2;"
