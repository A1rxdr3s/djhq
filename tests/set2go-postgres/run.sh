#!/usr/bin/env bash
# Starts and destroys only its own disposable PostgreSQL container; never reads .env.local.
set -euo pipefail
command -v docker >/dev/null || { echo 'Docker is required for isolated PostgreSQL testing.' >&2; exit 1; }
root="$(cd "$(dirname "$0")/../.." && pwd)"
name="set2go-pg-test-$(date +%s)-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$name" -e POSTGRES_PASSWORD=disposable-local-test postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  if docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
sql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');
SQL
sql < "$root/supabase/migrations/082_set2go_upload_sessions.sql"
sql <<'SQL'
DO $$ BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.set2go_upload_sessions'::regclass) THEN RAISE EXCEPTION 'RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.set2go_upload_tracks','INSERT') OR has_function_privilege('anon','public.set2go_reserve_track(uuid,uuid,text,text,bigint)','EXECUTE') THEN RAISE EXCEPTION 'public privileges'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE oid='public.set2go_reserve_track(uuid,uuid,text,text,bigint)'::regprocedure AND prosecdef) THEN RAISE EXCEPTION 'unexpected security definer'; END IF;
END $$;
INSERT INTO public.set2go_upload_sessions(id,owner_id,expires_at) VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001', now()+interval '1 hour');
SQL
# Hold the session row lock on one connection; a second reservation must serialize behind it.
sql <<'SQL' &
BEGIN;
SELECT public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','first','a.wav',1999999999);
SELECT pg_sleep(2);
COMMIT;
SQL
first_pid=$!
sleep 0.5
sql <<'SQL'
SELECT public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','second','a.wav',1);
SQL
wait "$first_pid"
sql <<'SQL'
DO $$ BEGIN
 IF (SELECT sum(reserved_bytes) FROM public.set2go_upload_tracks) <> 2000000000 THEN RAISE EXCEPTION 'quota accounting mismatch'; END IF;
 BEGIN
  PERFORM public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','third','a.wav',1);
  RAISE EXCEPTION 'quota incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'quota exceeded' THEN RAISE; END IF; END;
END $$;
SQL
sql <<'SQL'
INSERT INTO public.set2go_upload_sessions(id,owner_id,expires_at) VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',now()+interval '1 hour');
DO $$ DECLARE i integer; BEGIN
 FOR i IN 1..20 LOOP
  PERFORM public.set2go_reserve_track('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',i::text,'same.wav',1);
 END LOOP;
 BEGIN
  PERFORM public.set2go_reserve_track('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','21','same.wav',1);
  RAISE EXCEPTION 'track limit incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'quota exceeded' THEN RAISE; END IF; END;
END $$;
SQL
echo 'Disposable PostgreSQL checks passed.' 
