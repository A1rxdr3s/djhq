-- Migration 052: Add missing foreign key covering indexes
--
-- Supabase Performance Advisor flagged three FK columns with no covering index.
-- PostgreSQL cannot use an index to enforce or navigate the FK without one;
-- cascades and JOIN lookups do a sequential scan instead.
--
-- Findings from inspecting existing indexes before creating these:
--   admin_invitations       — has indexes on email, token, status. No artist_id index.
--   brand_asset_assignments — has index on artist_id. No brand_asset_id index.
--   gigs                    — has index on artist_id. global_venue_id was added in
--                             migration 036 but no index was created for it.
--
-- All three indexes use IF NOT EXISTS to be safe.

-- admin_invitations.artist_id → artists(id) ON DELETE SET NULL
create index if not exists admin_invitations_artist_id_idx
  on public.admin_invitations (artist_id);

-- brand_asset_assignments.brand_asset_id → brand_assets(id) ON DELETE CASCADE
create index if not exists brand_asset_assignments_brand_asset_id_idx
  on public.brand_asset_assignments (brand_asset_id);

-- gigs.global_venue_id → global_venues(id) ON DELETE SET NULL  (added in 036)
create index if not exists gigs_global_venue_id_idx
  on public.gigs (global_venue_id);
