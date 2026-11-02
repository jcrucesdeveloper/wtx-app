#!/usr/bin/env bash
# Builds a throwaway Supabase Postgres in Docker from supabase/migrations,
# then runs rules.sql (what every migration must keep) and scenarios.sql
# (what real users can and can't do). Needs Docker. Usage: pnpm test:db
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
migrations="$here/../migrations"
image=supabase/postgres:17.11.0.014
name=wtx-db-test

cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "Starting $image..."
docker run -d --name "$name" -e POSTGRES_PASSWORD=postgres "$image" >/dev/null

# The image runs its init scripts and restarts once before it's ready.
for _ in $(seq 1 90); do
  if docker exec "$name" psql -U postgres -tAc "select 1 from pg_roles where rolname = 'authenticated'" 2>/dev/null | grep -q 1; then
    break
  fi
  sleep 2
done
sleep 8
until docker exec "$name" pg_isready -q 2>/dev/null; do sleep 2; done

psql_as() { docker exec -i "$name" psql -U "$1" -d postgres -v ON_ERROR_STOP=1 -q; }

# A hosted project gets realtime.messages from the Realtime service; this image has none.
psql_as supabase_admin < "$here/realtime_stub.sql" >/dev/null 2>&1

echo "Applying migrations..."
err=$(mktemp)
for f in "$migrations"/*.sql; do
  if ! psql_as postgres < "$f" >/dev/null 2>"$err"; then
    echo "FAIL  $(basename "$f") does not apply:"; cat "$err"; rm -f "$err"; exit 1
  fi
done
rm -f "$err"
echo "Applied $(ls "$migrations"/*.sql | wc -l | tr -d ' ') migrations."

# Runs one test file; prints its PASS / FAIL lines and stops at the first failure.
run() {
  echo; echo "== $1"
  local out status
  set +e
  out=$(psql_as supabase_admin < "$here/$2" 2>&1)
  status=$?
  set -e
  printf '%s\n' "$out" \
    | sed -E 's/^psql:<stdin>:[0-9]+: //; s/^(NOTICE|ERROR): +//' \
    | grep -vE '^\s*$|^(CONTEXT|LINE [0-9]+):|^PL/pgSQL|^SQL statement' || true
  if [ "$status" -ne 0 ]; then echo; echo "Stopped: $2 failed."; exit 1; fi
}

run "Rules" rules.sql
run "Scenarios" scenarios.sql
echo; echo "All database checks passed."
