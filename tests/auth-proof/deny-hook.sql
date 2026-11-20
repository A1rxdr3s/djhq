-- DISPOSABLE TEST INSTANCE ONLY. Never install on a shared or production project.
-- No trusted invitation-to-Auth-event binding has been established. Fail closed.
begin;
create schema if not exists djhq_auth_proof;
revoke all on schema djhq_auth_proof from public, anon, authenticated;

-- Test fixture only; no row in this table is sufficient to authorize signup.
create table djhq_auth_proof.admissions (
  id uuid primary key,
  token_hash bytea not null unique,
  verified_identity text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_at timestamptz
);
revoke all on djhq_auth_proof.admissions from public, anon, authenticated;

create or replace function public.djhq_proof_before_user_created(event jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Registration unavailable.'
  ));
$$;
revoke all on function public.djhq_proof_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.djhq_proof_before_user_created(jsonb) to supabase_auth_admin;
commit;
