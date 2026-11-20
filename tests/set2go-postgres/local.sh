#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
bin=/opt/homebrew/opt/postgresql@17/bin
work=$(mktemp -d "${TMPDIR:-/tmp}/set2go-pg17.XXXXXXXX")
cleanup() { "$bin/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$work"; }
trap cleanup EXIT
"$bin/initdb" -D "$work/data" -A trust --no-locale >/dev/null
"$bin/pg_ctl" -D "$work/data" -l "$work/postgres.log" -o "-k $work -p 55439 -c listen_addresses=''" -w start >/dev/null
sql() { "$bin/psql" -X -v ON_ERROR_STOP=1 -h "$work" -p 55439 -d postgres "$@"; }
sql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');
SQL
sql < "$root/supabase/migrations/082_set2go_upload_sessions.sql"
sql <<'SQL'
DO $$ BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.set2go_upload_tracks'::regclass) THEN RAISE EXCEPTION 'RLS missing'; END IF;
 IF has_table_privilege('service_role','public.set2go_upload_tracks','INSERT') OR has_table_privilege('service_role','public.set2go_upload_tracks','UPDATE') OR has_function_privilege('anon','public.set2go_reserve_track(uuid,uuid,text,text,bigint)','EXECUTE') THEN RAISE EXCEPTION 'unsafe grants'; END IF;
 IF NOT (SELECT prosecdef AND proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.set2go_reserve_track(uuid,uuid,text,text,bigint)'::regprocedure) THEN RAISE EXCEPTION 'function configuration'; END IF;
END $$;
SELECT (public.set2go_create_upload_session('00000000-0000-0000-0000-000000000001',now()+interval '1 hour')).id AS session_id \gset
SELECT (public.set2go_reserve_track(:'session_id','00000000-0000-0000-0000-000000000001','one','same.wav',10)).id AS track_id \gset
SELECT public.set2go_transition_track(:'session_id','00000000-0000-0000-0000-000000000001',:'track_id','UPLOADING','multipart');
SELECT public.set2go_transition_track(:'session_id','00000000-0000-0000-0000-000000000001',:'track_id','VERIFYING');
SELECT public.set2go_transition_track(:'session_id','00000000-0000-0000-0000-000000000001',:'track_id','UPLOADED',null,10);
SELECT public.set2go_transition_track(:'session_id','00000000-0000-0000-0000-000000000001',:'track_id','UPLOADED',null,10);
SQL
sql <<'SQL'
INSERT INTO public.set2go_upload_sessions(id,owner_id,expires_at) VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001', now()+interval '1 hour');
SQL
sql <<'SQL' > "$work/first.log" &
BEGIN;
SELECT public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','first','a.wav',1999999999);
SELECT pg_sleep(2);
COMMIT;
SQL
first_pid=$!
sleep 0.5
sql <<'SQL' > "$work/second.log"
SELECT public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','second','a.wav',1);
SQL
wait "$first_pid"
sql <<'SQL'
DO $$ BEGIN
 IF (SELECT sum(reserved_bytes) FROM public.set2go_upload_tracks WHERE session_id='00000000-0000-0000-0000-000000000010') <> 2000000000 THEN RAISE EXCEPTION 'quota mismatch'; END IF;
 BEGIN
  PERFORM public.set2go_reserve_track('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','third','a.wav',1);
  RAISE EXCEPTION 'quota incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'quota exceeded' THEN RAISE; END IF; END;
END $$;
SQL
sql <<'SQL'
INSERT INTO public.set2go_upload_sessions(id,owner_id,expires_at) VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',now()+interval '1 hour');
DO $$ DECLARE i integer; t public.set2go_upload_tracks; t2 public.set2go_upload_tracks; BEGIN
 FOR i IN 1..20 LOOP
  t := public.set2go_reserve_track('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',i::text,'same.wav',1);
 END LOOP;
 t2 := public.set2go_reserve_track('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','20','same.wav',1);
 IF t.id <> t2.id THEN RAISE EXCEPTION 'idempotency failed'; END IF;
 BEGIN
  PERFORM public.set2go_reserve_track('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','21','same.wav',1);
  RAISE EXCEPTION 'track limit incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'quota exceeded' THEN RAISE; END IF; END;
 PERFORM public.set2go_transition_track(t.session_id,'00000000-0000-0000-0000-000000000001',t.id,'CANCELED');
 BEGIN
  PERFORM public.set2go_transition_track(t.session_id,'00000000-0000-0000-0000-000000000001',t.id,'UPLOADED',null,1);
  RAISE EXCEPTION 'canceled upload accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invalid transition' THEN RAISE; END IF; END;
 PERFORM public.set2go_transition_track(t.session_id,'00000000-0000-0000-0000-000000000001',t.id,'CLEANUP_PENDING');
 PERFORM public.set2go_cleanup_retry(t.session_id,'00000000-0000-0000-0000-000000000001',t.id,'network',now()+interval '1 minute');
 IF (SELECT retry_count FROM public.set2go_upload_tracks WHERE id=t.id) <> 1 THEN RAISE EXCEPTION 'retry not persisted'; END IF;
END $$;
SQL
sql <<'SQL'
DO $$ DECLARE a record; b record; sid uuid; track uuid; owner uuid := '00000000-0000-0000-0000-000000000001'; BEGIN
 SELECT id INTO sid FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 SELECT id INTO track FROM public.set2go_reserve_track(sid,owner,'fenced','same.wav',10);
 SELECT * INTO a FROM public.set2go_acquire_lease(sid,owner,1);
 IF a.lease_id IS NULL THEN RAISE EXCEPTION 'lease not acquired'; END IF;
 IF EXISTS(SELECT 1 FROM public.set2go_acquire_lease(sid,owner,1)) THEN RAISE EXCEPTION 'competing lease'; END IF;
 IF NOT public.set2go_renew_lease(sid,owner,a.lease_id,a.generation,1) THEN RAISE EXCEPTION 'renewal failed'; END IF;
 PERFORM pg_sleep(1.1);
 SELECT * INTO b FROM public.set2go_acquire_lease(sid,owner,30);
 IF b.generation <= a.generation OR b.lease_id = a.lease_id THEN RAISE EXCEPTION 'reclaim failed'; END IF;
 IF public.set2go_release_lease(sid,owner,a.lease_id,a.generation) THEN RAISE EXCEPTION 'stale release accepted'; END IF;
 BEGIN
  PERFORM public.set2go_transition_track(sid,owner,track,'UPLOADING','upload',null,null,a.lease_id,a.generation);
  RAISE EXCEPTION 'stale mutation accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'stale lease' THEN RAISE; END IF; END;
 PERFORM public.set2go_transition_track(sid,owner,track,'UPLOADING','upload',null,null,b.lease_id,b.generation);
 IF NOT public.set2go_release_lease(sid,owner,b.lease_id,b.generation) THEN RAISE EXCEPTION 'release failed'; END IF;
END $$;
SQL
sql <<'SQL'
DO $$ DECLARE sid uuid; owner uuid := '00000000-0000-0000-0000-000000000001'; lease record; claim record; BEGIN
 SELECT id INTO sid FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 SELECT * INTO lease FROM public.set2go_acquire_lease(sid,owner,30);
 BEGIN
  PERFORM public.set2go_enqueue_cleanup(sid,owner,'canceled');
  RAISE EXCEPTION 'active cleanup accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'active processing lease' THEN RAISE; END IF; END;
 PERFORM public.set2go_release_lease(sid,owner,lease.lease_id,lease.generation);
 PERFORM public.set2go_enqueue_cleanup(sid,owner,'canceled');
 IF (SELECT upload_capabilities_expire_at FROM public.set2go_upload_sessions WHERE id=sid) > clock_timestamp() THEN RAISE EXCEPTION 'unused upload capability received a future deadline'; END IF;
 UPDATE public.set2go_upload_sessions SET upload_capabilities_expire_at=clock_timestamp()+interval '1 second' WHERE id=sid;
 IF EXISTS (SELECT 1 FROM public.set2go_claim_cleanup(1)) THEN RAISE EXCEPTION 'unexpired upload deadline accepted'; END IF;
 PERFORM pg_sleep(1.1);
 IF EXISTS (SELECT 1 FROM public.set2go_acquire_lease(sid,owner,30)) THEN RAISE EXCEPTION 'terminal lease accepted'; END IF;
 SELECT * INTO claim FROM public.set2go_claim_cleanup(1);
 IF claim.session_id <> sid THEN RAISE EXCEPTION 'claim missing'; END IF;
 IF EXISTS (SELECT 1 FROM public.set2go_claim_cleanup(1)) THEN RAISE EXCEPTION 'duplicate claim'; END IF;
 IF NOT public.set2go_finish_cleanup(sid,claim.claim_id,false,'network',1) THEN RAISE EXCEPTION 'retry not persisted'; END IF;
 PERFORM pg_sleep(1.1);
 SELECT * INTO claim FROM public.set2go_claim_cleanup(5);
 IF NOT public.set2go_finish_cleanup(sid,claim.claim_id,true) THEN RAISE EXCEPTION 'completion missing'; END IF;
 IF EXISTS (SELECT 1 FROM public.set2go_acquire_lease(sid,owner,30)) THEN RAISE EXCEPTION 'cleaned lease accepted'; END IF;
END $$;
SQL
sql <<'SQL'
DO $$ DECLARE sid uuid; owner uuid := '00000000-0000-0000-0000-000000000001'; deadline timestamptz; BEGIN
 SELECT id INTO sid FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 PERFORM public.set2go_record_upload_capability(sid,owner,120);
 SELECT upload_capabilities_expire_at INTO deadline FROM public.set2go_upload_sessions WHERE id=sid;
 IF deadline < clock_timestamp()+interval '110 seconds' THEN RAISE EXCEPTION 'signing deadline not persisted'; END IF;
 PERFORM public.set2go_record_upload_capability(sid,owner,1);
 IF (SELECT upload_capabilities_expire_at FROM public.set2go_upload_sessions WHERE id=sid) <> deadline THEN RAISE EXCEPTION 'deadline regressed'; END IF;
 PERFORM public.set2go_enqueue_cleanup(sid,owner,'test');
 BEGIN
  PERFORM public.set2go_record_upload_capability(sid,owner,120);
  RAISE EXCEPTION 'terminal signing accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'upload authorization unavailable' THEN RAISE; END IF; END;
END $$;
SQL
sql <<'SQL'
DO $$ DECLARE sid uuid; t uuid; lease record; owner uuid := '00000000-0000-0000-0000-000000000001'; BEGIN
 SELECT id INTO sid FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 SELECT id INTO t FROM public.set2go_reserve_track(sid,owner,'first','same.wav',12);
 PERFORM public.set2go_reserve_track(sid,owner,'second','same.wav',12);
 BEGIN
  PERFORM public.set2go_reserve_track(sid,'00000000-0000-0000-0000-000000000002','wrong','same.wav',12);
  RAISE EXCEPTION 'cross-owner reservation accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'session unavailable' THEN RAISE; END IF; END;
 SELECT * INTO lease FROM public.set2go_acquire_lease(sid,owner,120);
 PERFORM public.set2go_transition_track(sid,owner,t,'INITIATING',null,null,null,lease.lease_id,lease.generation);
 PERFORM public.set2go_transition_track(sid,owner,t,'UPLOADING','remote-id',null,null,lease.lease_id,lease.generation);
 PERFORM public.set2go_transition_track(sid,owner,t,'VERIFYING',null,null,null,lease.lease_id,lease.generation);
 PERFORM public.set2go_begin_remote_completion(sid,owner,t);
 IF NOT public.set2go_resolve_completion(sid,owner,t,lease.lease_id,lease.generation,12) THEN RAISE EXCEPTION 'staging not confirmed'; END IF;
 IF (SELECT state FROM public.set2go_upload_sessions WHERE id=sid) <> 'UPLOADING' THEN RAISE EXCEPTION 'batch completed before all tracks'; END IF;
 PERFORM public.set2go_release_lease(sid,owner,lease.lease_id,lease.generation);
END $$;
SQL
sql <<'SQL'
DO $$ DECLARE sid uuid; ambiguous uuid; owner uuid := '00000000-0000-0000-0000-000000000001'; lease record; claim record; BEGIN
 SELECT id INTO sid FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 PERFORM public.set2go_enqueue_cleanup(sid,owner,'test');
 IF (SELECT upload_capabilities_expire_at FROM public.set2go_upload_sessions WHERE id=sid) > clock_timestamp() THEN RAISE EXCEPTION 'unused capability received a future deadline'; END IF;
 SELECT * INTO claim FROM public.set2go_claim_cleanup(30);
 IF claim.session_id <> sid OR NOT public.set2go_finish_cleanup(sid,claim.claim_id,true) THEN RAISE EXCEPTION 'empty canceled session cleanup unavailable'; END IF;
 SELECT id INTO ambiguous FROM public.set2go_create_upload_session(owner,now()+interval '1 hour');
 PERFORM public.set2go_record_upload_capability(ambiguous,owner,120);
 PERFORM public.set2go_reserve_track(ambiguous,owner,'init','init.wav',12);
 SELECT * INTO lease FROM public.set2go_acquire_lease(ambiguous,owner,120);
 PERFORM public.set2go_transition_track(ambiguous,owner,(SELECT id FROM public.set2go_upload_tracks WHERE session_id=ambiguous),'INITIATING',null,null,null,lease.lease_id,lease.generation);
 PERFORM public.set2go_release_lease(ambiguous,owner,lease.lease_id,lease.generation);
 PERFORM public.set2go_enqueue_cleanup(ambiguous,owner,'test');
 UPDATE public.set2go_upload_sessions SET upload_capabilities_expire_at=clock_timestamp()-interval '1 second' WHERE id=ambiguous;
 IF EXISTS (SELECT 1 FROM public.set2go_claim_cleanup(30)) THEN RAISE EXCEPTION 'uncertain initiation was made cleanup-eligible'; END IF;
END $$;
SQL
export PGHOST="$work" PGPORT=55439 PGDATABASE=postgres NODE_ENV=test SET2GO_DISPOSABLE_PG=1 SET2GO_FAKE_R2_STATE="$work/fake-r2.json"
(cd "$root" && node tests/set2go-postgres/cleanup-e2e.mjs)
printf 'Migration, privileges, transitions and quota checks passed on PostgreSQL 17.\n'  
