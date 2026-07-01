-- Migration 071: Drop stale RLS policies missed by migration 051
--
-- Root cause:
--   Migration 051 intended to consolidate the "Multiple Permissive Policies" warnings
--   by dropping the original public-read policies and creating consolidated replacements.
--   However, migration 051 used incorrect names in its DROP statements:
--
--     It tried to drop:  "artists_public_read"
--     Actual name was:   "Public can read published artists"   (created by migration 001)
--
--   Because the names did not match, the DROP IF EXISTS was a silent no-op.
--   On the live database, both the original policies AND the new consolidated ones
--   (e.g. "artists_select") coexist, which triggers the Supabase Performance Advisor
--   "Multiple Permissive Policies" warning for every affected table.
--
-- Fix:
--   Drop the seven stale policies by their actual names.
--   The consolidated replacement policies created by migration 051 remain in place,
--   so access behavior is completely unchanged:
--     • Anonymous users still read all published content.
--     • Authenticated owners still have full CRUD on their own content.
--     • Tenant isolation, published/draft gating, and all write checks are unchanged.
--
-- Tables fixed: artists, social_links, releases, gigs, gallery_images, dj_sets, videos

-- From migration 001 ──────────────────────────────────────────────────────────────────
drop policy if exists "Public can read published artists"
  on public.artists;

drop policy if exists "Public can read links for published artists"
  on public.social_links;

drop policy if exists "Public can read releases for published artists"
  on public.releases;

drop policy if exists "Public can read gigs for published artists"
  on public.gigs;

drop policy if exists "Public can read gallery images for published artists"
  on public.gallery_images;

-- From migration 005 ──────────────────────────────────────────────────────────────────
drop policy if exists "Public can read published dj sets for published artists"
  on public.dj_sets;

-- From migration 006 ──────────────────────────────────────────────────────────────────
drop policy if exists "Public can read published videos for published artists"
  on public.videos;
