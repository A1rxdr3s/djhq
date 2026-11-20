-- Set2Go cloud staging is disabled until product authorization is implemented.
-- Only trusted server-side service-role code may access these objects.
create table public.set2go_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  state text not null default 'CREATED' check (state in ('CREATED','RESERVED','UPLOADING','UPLOADED','FAILED','CANCELED','CLEANUP_PENDING','CLEANED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cleanup_reason text, cleanup_retry_count integer not null default 0 check (cleanup_retry_count >= 0),
  cleanup_next_retry timestamptz, cleanup_error text,
  lease_id uuid, lease_generation bigint not null default 0, lease_expires_at timestamptz,
  cleanup_claim_id uuid, cleanup_claim_expires_at timestamptz,
  completion_unreconciled boolean not null default false, completion_track_id uuid,
  completion_retry_count integer not null default 0, completion_next_retry timestamptz,
  upload_capabilities_expire_at timestamptz, -- NULL means no proven safe deletion deadline
  check ((cleanup_claim_id is null) = (cleanup_claim_expires_at is null)),
  check ((lease_id is null) = (lease_expires_at is null))
);
create table public.set2go_upload_tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.set2go_upload_sessions(id) on delete restrict,
  request_key text not null check (length(request_key) between 1 and 100),
  original_name text not null check (length(original_name) between 1 and 255),
  declared_bytes bigint not null check (declared_bytes > 0 and declared_bytes <= 2000000000),
  reserved_bytes bigint not null check (reserved_bytes >= 0 and reserved_bytes <= declared_bytes),
  verified_bytes bigint check (verified_bytes is null or verified_bytes = declared_bytes),
  object_key text not null unique, multipart_upload_id text,
  state text not null default 'RESERVED' check (state in ('RESERVED','INITIATING','UPLOADING','VERIFYING','UPLOADED','FAILED','CANCELED','CLEANUP_PENDING','CLEANED')),
  error_category text, retry_count integer not null default 0 check (retry_count >= 0), cleanup_next_retry timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(session_id,request_key)
);
create index set2go_upload_sessions_owner_idx on public.set2go_upload_sessions(owner_id,created_at);
create index set2go_upload_sessions_cleanup_idx on public.set2go_upload_sessions(state,cleanup_next_retry);
create index set2go_upload_tracks_session_idx on public.set2go_upload_tracks(session_id);
alter table public.set2go_upload_sessions enable row level security;
alter table public.set2go_upload_tracks enable row level security;
revoke all on public.set2go_upload_sessions, public.set2go_upload_tracks from public, anon, authenticated;
revoke all on public.set2go_upload_sessions, public.set2go_upload_tracks from service_role;
grant select on public.set2go_upload_sessions, public.set2go_upload_tracks to service_role;

-- Functions run with the migration owner's table privileges. Never accept an
-- owner ID without first validating the authenticated user and product access.
create function public.set2go_create_upload_session(p_owner uuid, p_expires timestamptz)
returns public.set2go_upload_sessions language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions;
begin
  if p_owner is null or p_expires is null or p_expires <= now() then raise exception 'invalid session'; end if;
  insert into public.set2go_upload_sessions(owner_id,expires_at) values(p_owner,p_expires) returning * into s;
  return s;
end $$;
revoke all on function public.set2go_create_upload_session(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.set2go_create_upload_session(uuid,timestamptz) to service_role;

create function public.set2go_reserve_track(p_session uuid, p_owner uuid, p_request text, p_name text, p_size bigint)
returns public.set2go_upload_tracks language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions; t public.set2go_upload_tracks; n bigint; bytes bigint; tid uuid;
begin
  if p_owner is null or p_request is null or length(p_request) not between 1 and 100 or p_name is null or length(p_name) not between 1 and 255 or p_name !~* '\.(wav|aif|aiff|flac)$' or p_size is null or p_size < 1 or p_size > 2000000000 then raise exception 'invalid track'; end if;
  select * into s from public.set2go_upload_sessions where id=p_session and owner_id=p_owner for update;
  if not found then raise exception 'session unavailable'; end if;
  if s.state not in ('CREATED','RESERVED','UPLOADING') or s.expires_at <= now() then raise exception 'session unavailable'; end if;
  select * into t from public.set2go_upload_tracks where session_id=p_session and request_key=p_request;
  if found then
    if t.original_name <> p_name or t.declared_bytes <> p_size then raise exception 'conflicting request'; end if;
    return t;
  end if;
  select count(*), coalesce(sum(reserved_bytes),0) into n,bytes from public.set2go_upload_tracks where session_id=p_session;
  if n >= 20 or bytes + p_size > 2000000000 then raise exception 'quota exceeded'; end if;
  tid := gen_random_uuid();
  insert into public.set2go_upload_tracks(id,session_id,request_key,original_name,declared_bytes,reserved_bytes,object_key)
    values(tid,p_session,p_request,p_name,p_size,p_size,'temporary/'||p_session::text||'/input/'||tid::text) returning * into t;
  update public.set2go_upload_sessions set state=case when state='CREATED' then 'RESERVED' else state end,updated_at=now() where id=p_session;
  return t;
end $$;
revoke all on function public.set2go_reserve_track(uuid,uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.set2go_reserve_track(uuid,uuid,text,text,bigint) to service_role;

-- Only a trusted server may call this after obtaining size from R2, never from the browser.
create function public.set2go_transition_track(p_session uuid, p_owner uuid, p_track uuid, p_next text, p_upload_id text default null, p_verified_bytes bigint default null, p_error text default null, p_lease uuid default null, p_generation bigint default null)
returns public.set2go_upload_tracks language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions; t public.set2go_upload_tracks;
begin
  select * into s from public.set2go_upload_sessions where id=p_session and owner_id=p_owner for update;
  if not found then raise exception 'session unavailable'; end if;
  if s.lease_generation > 0 and (s.lease_id is null or s.lease_id is distinct from p_lease or s.lease_generation is distinct from p_generation or s.lease_expires_at <= clock_timestamp()) then raise exception 'stale lease'; end if;
  select * into t from public.set2go_upload_tracks where id=p_track and session_id=p_session for update;
  if not found then raise exception 'track unavailable'; end if;
  if s.state in ('CLEANUP_PENDING','CLEANED') then raise exception 'session terminal'; end if;
  if t.state=p_next then
    if p_next='UPLOADED' and t.verified_bytes is distinct from p_verified_bytes then raise exception 'conflicting verification'; end if;
    if p_next='UPLOADING' and t.multipart_upload_id is distinct from p_upload_id then raise exception 'conflicting upload'; end if;
    return t;
  end if;
  if p_next='INITIATING' and t.state='RESERVED' and s.state in ('RESERVED','UPLOADING') and s.expires_at > now() then
    update public.set2go_upload_tracks set state=p_next,updated_at=now() where id=p_track returning * into t;
  elsif p_next='UPLOADING' and t.state in ('RESERVED','INITIATING') and p_upload_id is not null and length(p_upload_id) between 1 and 1024 and s.state in ('RESERVED','UPLOADING') and s.expires_at > now() then
    update public.set2go_upload_tracks set state=p_next,multipart_upload_id=p_upload_id,updated_at=now() where id=p_track returning * into t;
    update public.set2go_upload_sessions set state='UPLOADING',updated_at=now() where id=p_session;
  elsif p_next='VERIFYING' and t.state='UPLOADING' and s.state='UPLOADING' and s.expires_at > now() then
    update public.set2go_upload_tracks set state=p_next,updated_at=now() where id=p_track returning * into t;
  elsif p_next='UPLOADED' and t.state='VERIFYING' and s.state='UPLOADING' and s.expires_at > now() and p_verified_bytes=t.declared_bytes then
    update public.set2go_upload_tracks set state=p_next,verified_bytes=p_verified_bytes,multipart_upload_id=null,updated_at=now() where id=p_track returning * into t;
    if not exists (select 1 from public.set2go_upload_tracks where session_id=p_session and state <> 'UPLOADED') then update public.set2go_upload_sessions set state='UPLOADED',updated_at=now() where id=p_session; end if;
  elsif p_next in ('FAILED','CANCELED') and t.state in ('RESERVED','INITIATING','UPLOADING','VERIFYING') then
    update public.set2go_upload_tracks set state=p_next,error_category=left(p_error,200),updated_at=now() where id=p_track returning * into t;
  elsif p_next='CLEANUP_PENDING' and t.state in ('FAILED','CANCELED') then
    update public.set2go_upload_tracks set state=p_next,updated_at=now() where id=p_track returning * into t;
  elsif p_next='CLEANED' and t.state='CLEANUP_PENDING' then
    update public.set2go_upload_tracks set state=p_next,reserved_bytes=0,multipart_upload_id=null,updated_at=now() where id=p_track returning * into t;
  else raise exception 'invalid transition'; end if;
  return t;
end $$;
revoke all on function public.set2go_transition_track(uuid,uuid,uuid,text,text,bigint,text,uuid,bigint) from public, anon, authenticated;
grant execute on function public.set2go_transition_track(uuid,uuid,uuid,text,text,bigint,text,uuid,bigint) to service_role;

-- A retry records only a category, never credentials or raw provider responses.
create function public.set2go_cleanup_retry(p_session uuid, p_owner uuid, p_track uuid, p_category text, p_next timestamptz, p_lease uuid default null, p_generation bigint default null)
returns public.set2go_upload_tracks language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions; t public.set2go_upload_tracks;
begin
  select * into s from public.set2go_upload_sessions where id=p_session and owner_id=p_owner for update;
  if not found then raise exception 'session unavailable'; end if;
  if s.lease_generation > 0 and (s.lease_id is null or s.lease_id is distinct from p_lease or s.lease_generation is distinct from p_generation or s.lease_expires_at <= clock_timestamp()) then raise exception 'stale lease'; end if;
  select * into t from public.set2go_upload_tracks where id=p_track and session_id=p_session for update;
  if not found or t.state <> 'CLEANUP_PENDING' then raise exception 'cleanup unavailable'; end if;
  if p_category is null or p_category !~ '^[a-zA-Z0-9_-]{1,80}$' or p_next is null or p_next < now() then raise exception 'invalid cleanup retry'; end if;
  update public.set2go_upload_tracks set retry_count=retry_count+1,error_category=p_category,cleanup_next_retry=p_next,updated_at=now() where id=p_track returning * into t;
  return t;
end $$;
revoke all on function public.set2go_cleanup_retry(uuid,uuid,uuid,text,timestamptz,uuid,bigint) from public, anon, authenticated;
grant execute on function public.set2go_cleanup_retry(uuid,uuid,uuid,text,timestamptz,uuid,bigint) to service_role;

-- Database-only fencing. Storage operations must also enforce fencing before use.
create function public.set2go_acquire_lease(p_session uuid, p_owner uuid, p_seconds integer)
returns table(lease_id uuid, generation bigint, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
 if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'invalid lease duration'; end if;
 return query update public.set2go_upload_sessions s
 set lease_id=gen_random_uuid(), lease_generation=s.lease_generation+1, lease_expires_at=clock_timestamp()+make_interval(secs=>p_seconds), updated_at=clock_timestamp()
 where s.id=p_session and s.owner_id=p_owner and s.state not in ('CANCELED','CLEANED','CLEANUP_PENDING') and (s.lease_id is null or s.lease_expires_at <= clock_timestamp())
 returning s.lease_id,s.lease_generation,s.lease_expires_at;
end $$;
create function public.set2go_renew_lease(p_session uuid,p_owner uuid,p_lease uuid,p_generation bigint,p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'invalid lease duration'; end if;
 update public.set2go_upload_sessions s set lease_expires_at=clock_timestamp()+make_interval(secs=>p_seconds),updated_at=clock_timestamp()
 where s.id=p_session and s.owner_id=p_owner and s.lease_id=p_lease and s.lease_generation=p_generation and s.lease_expires_at > clock_timestamp();
 return found;
end $$;
create function public.set2go_release_lease(p_session uuid,p_owner uuid,p_lease uuid,p_generation bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 update public.set2go_upload_sessions s set lease_id=null,lease_expires_at=null,updated_at=clock_timestamp()
 where s.id=p_session and s.owner_id=p_owner and s.lease_id=p_lease and s.lease_generation=p_generation and s.lease_expires_at > clock_timestamp();
 return found;
end $$;
revoke all on function public.set2go_acquire_lease(uuid,uuid,integer),public.set2go_renew_lease(uuid,uuid,uuid,bigint,integer),public.set2go_release_lease(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.set2go_acquire_lease(uuid,uuid,integer),public.set2go_renew_lease(uuid,uuid,uuid,bigint,integer),public.set2go_release_lease(uuid,uuid,uuid,bigint) to service_role;

-- Terminal, session-scoped cleanup authorization. Once committed, processing
-- leases and upload mutations cannot reactivate this session.
create function public.set2go_enqueue_cleanup(p_session uuid,p_owner uuid,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions;
begin
 select * into s from public.set2go_upload_sessions where id=p_session and owner_id=p_owner for update;
 if not found then raise exception 'session unavailable'; end if;
 if s.state in ('CLEANUP_PENDING','CLEANED') then return true; end if;
 if s.completion_unreconciled then raise exception 'remote completion unresolved'; end if;
 if s.lease_id is not null and s.lease_expires_at > clock_timestamp() then raise exception 'active processing lease'; end if;
 if p_reason is null or p_reason !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception 'invalid cleanup reason'; end if;
 update public.set2go_upload_sessions set state='CLEANUP_PENDING',cleanup_reason=p_reason,cleanup_next_retry=clock_timestamp(),
   upload_capabilities_expire_at=case
     when upload_capabilities_expire_at is not null then upload_capabilities_expire_at
     when exists (select 1 from public.set2go_upload_tracks t where t.session_id=p_session and t.state='INITIATING') then null
     else clock_timestamp()
   end,
   lease_id=null,lease_expires_at=null,updated_at=clock_timestamp() where id=p_session;
 return true;
end $$;
create function public.set2go_claim_cleanup(p_seconds integer)
returns table(session_id uuid,claim_id uuid) language plpgsql security definer set search_path = '' as $$
begin
 if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'invalid claim duration'; end if;
 return query with candidate as (
  select s.id from public.set2go_upload_sessions s where s.state='CLEANUP_PENDING'
    and not s.completion_unreconciled
    and not exists (select 1 from public.set2go_upload_tracks t where t.session_id=s.id and t.state='INITIATING')
    and s.upload_capabilities_expire_at is not null
    and s.upload_capabilities_expire_at <= clock_timestamp()
    and (s.cleanup_next_retry is null or s.cleanup_next_retry <= clock_timestamp())
    and (s.cleanup_claim_id is null or s.cleanup_claim_expires_at <= clock_timestamp())
  order by s.updated_at for update skip locked limit 1
 ) update public.set2go_upload_sessions s set cleanup_claim_id=gen_random_uuid(),cleanup_claim_expires_at=clock_timestamp()+make_interval(secs=>p_seconds),updated_at=clock_timestamp() from candidate c where s.id=c.id returning s.id,s.cleanup_claim_id;
end $$;
create function public.set2go_finish_cleanup(p_session uuid,p_claim uuid,p_success boolean,p_category text default null,p_delay integer default 60)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_success is null or (not p_success and (p_category is null or p_category !~ '^[a-zA-Z0-9_-]{1,80}$' or p_delay is null or p_delay < 1 or p_delay > 86400)) then raise exception 'invalid cleanup result'; end if;
 update public.set2go_upload_sessions s set state=case when p_success then 'CLEANED' else 'CLEANUP_PENDING' end,
 cleanup_claim_id=null,cleanup_claim_expires_at=null,cleanup_error=case when p_success then null else p_category end,
 cleanup_retry_count=s.cleanup_retry_count+case when p_success then 0 else 1 end,
 cleanup_next_retry=case when p_success then null else clock_timestamp()+make_interval(secs=>p_delay) end,updated_at=clock_timestamp()
 where s.id=p_session and s.state='CLEANUP_PENDING' and s.cleanup_claim_id=p_claim and s.cleanup_claim_expires_at > clock_timestamp();
 return found;
end $$;
revoke all on function public.set2go_enqueue_cleanup(uuid,uuid,text),public.set2go_claim_cleanup(integer),public.set2go_finish_cleanup(uuid,uuid,boolean,text,integer) from public,anon,authenticated;
grant execute on function public.set2go_enqueue_cleanup(uuid,uuid,text),public.set2go_claim_cleanup(integer),public.set2go_finish_cleanup(uuid,uuid,boolean,text,integer) to service_role;

-- Must commit before releasing a signed URL. URL expiry is not completion proof.
create function public.set2go_record_upload_capability(p_session uuid,p_owner uuid,p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_seconds is null or p_seconds < 1 or p_seconds > 900 then raise exception 'invalid capability duration'; end if;
 update public.set2go_upload_sessions s set upload_capabilities_expire_at=greatest(s.upload_capabilities_expire_at,clock_timestamp()+make_interval(secs=>p_seconds)),updated_at=clock_timestamp()
 where s.id=p_session and s.owner_id=p_owner and s.state in ('CREATED','RESERVED','UPLOADING') and s.expires_at>clock_timestamp();
 if not found then raise exception 'upload authorization unavailable'; end if;
 return true;
end $$;
create function public.set2go_begin_remote_completion(p_session uuid,p_owner uuid,p_track uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 update public.set2go_upload_sessions s set completion_unreconciled=true,completion_track_id=p_track,updated_at=clock_timestamp()
 where s.id=p_session and s.owner_id=p_owner and s.state='UPLOADING' and exists (select 1 from public.set2go_upload_tracks t where t.id=p_track and t.session_id=s.id and t.state='VERIFYING' and t.multipart_upload_id is not null) and not s.completion_unreconciled and s.expires_at>clock_timestamp();
 if not found then raise exception 'completion authorization unavailable'; end if;
 return true;
end $$;
revoke all on function public.set2go_record_upload_capability(uuid,uuid,integer),public.set2go_begin_remote_completion(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.set2go_record_upload_capability(uuid,uuid,integer),public.set2go_begin_remote_completion(uuid,uuid,uuid) to service_role;

-- Called only after HEAD verifies expected bytes AND the tracked upload ID is
-- closed (ListParts returned NoSuchUpload). Missing/in-progress stays unresolved.
create function public.set2go_resolve_completion(p_session uuid,p_owner uuid,p_track uuid,p_lease uuid,p_generation bigint,p_verified bigint default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s public.set2go_upload_sessions; t public.set2go_upload_tracks;
begin
 select * into s from public.set2go_upload_sessions where id=p_session and owner_id=p_owner for update;
 if not found then raise exception 'session unavailable'; end if;
 if s.lease_id is distinct from p_lease or s.lease_generation is distinct from p_generation or s.lease_expires_at <= clock_timestamp() or s.lease_id is null then raise exception 'stale lease'; end if;
 if s.state not in ('UPLOADING','UPLOADED') then raise exception 'session terminal'; end if;
 if not s.completion_unreconciled then return false; end if;
 if s.completion_track_id is distinct from p_track then raise exception 'completion mismatch'; end if;
 select * into t from public.set2go_upload_tracks where id=p_track and session_id=p_session for update;
 if not found or t.state <> 'VERIFYING' then raise exception 'track unavailable'; end if;
 if p_verified is null then
  update public.set2go_upload_sessions set completion_retry_count=completion_retry_count+1,completion_next_retry=clock_timestamp()+interval '30 seconds',updated_at=clock_timestamp() where id=p_session;
  return false;
 end if;
 if p_verified <> t.declared_bytes then raise exception 'size mismatch'; end if;
 update public.set2go_upload_tracks set state='UPLOADED',verified_bytes=p_verified,multipart_upload_id=null,updated_at=clock_timestamp() where id=p_track;
 update public.set2go_upload_sessions set completion_unreconciled=false,completion_track_id=null,completion_next_retry=null,updated_at=clock_timestamp() where id=p_session;
 if not exists(select 1 from public.set2go_upload_tracks where session_id=p_session and state <> 'UPLOADED') then update public.set2go_upload_sessions set state='UPLOADED' where id=p_session; end if;
 return true;
end $$;
revoke all on function public.set2go_resolve_completion(uuid,uuid,uuid,uuid,bigint,bigint) from public,anon,authenticated;
grant execute on function public.set2go_resolve_completion(uuid,uuid,uuid,uuid,bigint,bigint) to service_role;
