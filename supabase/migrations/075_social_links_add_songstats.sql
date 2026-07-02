-- Migration 075: Add "songstats" as a supported social link platform.
--
-- The social_links table has a CHECK constraint that whitelists allowed platform values.
-- We drop and recreate it to include "songstats".
--
-- Safe: no existing rows use "songstats" (it was not previously supported in the UI),
-- so the constraint recreation cannot fail due to existing data.

alter table public.social_links
  drop constraint if exists social_links_platform_check;

alter table public.social_links
  add constraint social_links_platform_check check (
    platform in (
      'beatport',
      'spotify',
      'soundcloud',
      'youtube',
      'instagram',
      'tiktok',
      'resident-advisor',
      'bandsintown',
      'songstats',
      'website',
      'other'
    )
  );
