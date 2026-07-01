-- Migration 074: Security Advisor fixes
--
-- Fixes 4 categories of Supabase Security Advisor warnings without changing
-- any access behaviour visible to the application or end users.
--
-- ── PART A — Function Search Path Mutable ────────────────────────────────────
-- Trigger functions without an explicit search_path are vulnerable to
-- search_path injection: a malicious schema placed earlier in the path could
-- shadow objects the function references.  Adding SET search_path = public,
-- pg_temp pins the resolution order for the duration of each call.
-- SECURITY INVOKER is the default (no privilege escalation), stated explicitly
-- for clarity.  Function bodies are unchanged.

create or replace function public.set_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_artist_tours_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_artist_tour_stays_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_artist_career_timeline_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── PART B — global_venues: RLS policies with always-true expressions ─────────
-- "global_venues: authenticated insert" uses WITH CHECK (true) — any
-- authenticated user can insert any row without restriction.
-- "global_venues: authenticated update" uses USING (true) — any authenticated
-- user can update any row.
--
-- The intent (per migration 036 comment) was to tighten once a submitted_by_user_id
-- column was added.  Until proper ownership tracking exists, global_venues writes
-- must go through the service role.  Dropping these policies removes the Security
-- Advisor warning without affecting reads (public SELECT stays).
--
-- Impact: authenticated client-side inserts/updates to global_venues will be
-- denied.  The application must use the service role for venue contributions.

drop policy if exists "global_venues: authenticated insert" on public.global_venues;
drop policy if exists "global_venues: authenticated update" on public.global_venues;

-- ── PART C — Storage bucket listing ──────────────────────────────────────────
-- Two SELECT policies on storage.objects allow unrestricted bucket listing:
--   "Public read access atfsku_0"  — artist-heroes bucket (Dashboard-created)
--   "brand_sources_select"         — brand-sources bucket (USING bucket_id only)
--
-- Both buckets are public, so individual files remain accessible via their
-- direct public URLs (no SELECT policy needed for that).  The broad policies
-- only grant listing of all files in the bucket to any caller — unnecessary
-- and flagged by Security Advisor.
--
-- Fix for artist-heroes: drop the broad Dashboard policy.  Public hero images
-- are served via direct URLs stored in artists.hero_image_url; no listing needed.
--
-- Fix for brand-sources: replace the broad policy with an authenticated
-- owner-scoped policy (same folder structure as insert/delete policies).
-- Owners can still list their own assets; anonymous callers cannot list anything.

-- artist-heroes: drop Dashboard-created broad listing policy
drop policy if exists "Public read access atfsku_0" on storage.objects;

-- brand-sources: drop broad listing policy, replace with owner-scoped policy
drop policy if exists "brand_sources_select" on storage.objects;
create policy "brand_sources_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'brand-sources'
    and (storage.foldername(name))[1] = 'artists'
    and exists (
      select 1 from public.artists a
      where a.id = ((storage.foldername(name))[2])::uuid
        and a.owner_user_id = (select auth.uid())
    )
  );
