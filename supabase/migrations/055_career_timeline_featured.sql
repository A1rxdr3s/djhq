-- Migration 055: Career timeline — featured flag and HQ-only preview image
--
-- is_featured: marks a career update as the featured/lead entry, causing it to
--   appear first in the public Career Updates grid regardless of sort_order.
--   The artist or team controls this flag from HQ.
--
-- preview_image_url: a design-preview image URL that is stored only for HQ
--   evaluation purposes. This field is NEVER rendered on the public artist
--   profile. It allows the team to preview how a card will look with imagery
--   before a real production image is available.
--   The public career-updates-section.tsx component intentionally omits this
--   field from all public rendering paths.

alter table public.artist_career_timeline
  add column if not exists is_featured         boolean not null default false,
  add column if not exists preview_image_url   text;

-- Sparse index: only indexed where is_featured = true (most items are false),
-- used to quickly resolve the featured item(s) for any artist.
create index if not exists artist_career_timeline_featured_idx
  on public.artist_career_timeline (artist_id, sort_order)
  where is_featured = true;
