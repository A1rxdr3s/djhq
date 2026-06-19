-- Migration 051: Fix Supabase Performance Advisor warnings
--
-- Three categories of fixes:
--   1. Auth RLS Initialization Plan — wrap auth.uid() / auth.role() in (select ...)
--      so the planner evaluates the function once per query, not once per row.
--   2. Multiple Permissive Policies — consolidate paired _public_read (select) +
--      _owner_all (all) policies into one OR-based SELECT policy, with explicit
--      write policies for INSERT / UPDATE / DELETE.
--   3. Duplicate index — drop custom_domains_artist_idx (identical to the
--      migration-007-created custom_domains_artist_id_idx).
--
-- Behavior is fully preserved:
--   - Anonymous users still read all published content.
--   - Authenticated owners still have full CRUD access to their own content.
--   - No data is modified.

-- ─────────────────────────────────────────────────────────────────────────────
-- artists
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "artists_public_read" on public.artists;
drop policy if exists "artists_owner_all"   on public.artists;

create policy "artists_select"
  on public.artists for select
  using (
    is_published = true
    or owner_user_id = (select auth.uid())
  );

create policy "artists_owner_insert"
  on public.artists for insert
  with check (owner_user_id = (select auth.uid()));

create policy "artists_owner_update"
  on public.artists for update
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "artists_owner_delete"
  on public.artists for delete
  using (owner_user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- social_links
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "social_links_public_read" on public.social_links;
drop policy if exists "social_links_owner_all"   on public.social_links;

create policy "social_links_select"
  on public.social_links for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "social_links_owner_insert"
  on public.social_links for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "social_links_owner_update"
  on public.social_links for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "social_links_owner_delete"
  on public.social_links for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- releases
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "releases_public_read" on public.releases;
drop policy if exists "releases_owner_all"   on public.releases;

create policy "releases_select"
  on public.releases for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "releases_owner_insert"
  on public.releases for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "releases_owner_update"
  on public.releases for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "releases_owner_delete"
  on public.releases for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- gigs
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "gigs_public_read" on public.gigs;
drop policy if exists "gigs_owner_all"   on public.gigs;

create policy "gigs_select"
  on public.gigs for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "gigs_owner_insert"
  on public.gigs for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "gigs_owner_update"
  on public.gigs for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "gigs_owner_delete"
  on public.gigs for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- dj_sets  (has its own is_published column — public read requires both)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "dj_sets_public_read" on public.dj_sets;
drop policy if exists "dj_sets_owner_all"   on public.dj_sets;

create policy "dj_sets_select"
  on public.dj_sets for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (dj_sets.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "dj_sets_owner_insert"
  on public.dj_sets for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "dj_sets_owner_update"
  on public.dj_sets for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "dj_sets_owner_delete"
  on public.dj_sets for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- videos  (has its own is_published column — public read requires both)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "videos_public_read" on public.videos;
drop policy if exists "videos_owner_all"   on public.videos;

create policy "videos_select"
  on public.videos for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (videos.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "videos_owner_insert"
  on public.videos for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "videos_owner_update"
  on public.videos for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "videos_owner_delete"
  on public.videos for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- gallery_images
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "gallery_images_public_read" on public.gallery_images;
drop policy if exists "gallery_images_owner_all"   on public.gallery_images;

create policy "gallery_images_select"
  on public.gallery_images for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "gallery_images_owner_insert"
  on public.gallery_images for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "gallery_images_owner_update"
  on public.gallery_images for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "gallery_images_owner_delete"
  on public.gallery_images for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_asset_assignments
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "brand_asset_assignments_public_read" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_all"   on public.brand_asset_assignments;

create policy "brand_asset_assignments_select"
  on public.brand_asset_assignments for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "brand_asset_assignments_owner_insert"
  on public.brand_asset_assignments for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "brand_asset_assignments_owner_update"
  on public.brand_asset_assignments for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "brand_asset_assignments_owner_delete"
  on public.brand_asset_assignments for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- artist_tours  (has its own is_published column — public read requires both)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "artist_tours_public_read" on public.artist_tours;
drop policy if exists "artist_tours_owner_all"   on public.artist_tours;

create policy "artist_tours_select"
  on public.artist_tours for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (artist_tours.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "artist_tours_owner_insert"
  on public.artist_tours for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "artist_tours_owner_update"
  on public.artist_tours for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "artist_tours_owner_delete"
  on public.artist_tours for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- custom_domains
-- "Artists can read their own custom domains" is fully redundant with
-- custom_domains_owner_all (identical SELECT logic). Drop the duplicate and
-- fix auth.uid() in the surviving policy.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Artists can read their own custom domains" on public.custom_domains;
drop policy if exists "custom_domains_owner_all"                  on public.custom_domains;

create policy "custom_domains_owner_all"
  on public.custom_domains for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_source_files  (auth.uid() fix only — no duplicate SELECT issue)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "brand_source_files_owner_all" on public.brand_source_files;

create policy "brand_source_files_owner_all"
  on public.brand_source_files for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_assets  (auth.uid() fix only — no duplicate SELECT issue)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "brand_assets_owner_all" on public.brand_assets;

create policy "brand_assets_owner_all"
  on public.brand_assets for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: brand-sources bucket  (fix auth.role() and auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "brand_sources_insert" on storage.objects;
create policy "brand_sources_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'brand-sources'
    and (select auth.role()) = 'authenticated'
    and (storage.foldername(name))[1] = 'artists'
    and exists (
      select 1 from public.artists a
      where a.id = ((storage.foldername(name))[2])::uuid
        and a.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "brand_sources_delete" on storage.objects;
create policy "brand_sources_delete"
  on storage.objects for delete
  using (
    bucket_id = 'brand-sources'
    and (select auth.role()) = 'authenticated'
    and (storage.foldername(name))[1] = 'artists'
    and exists (
      select 1 from public.artists a
      where a.id = ((storage.foldername(name))[2])::uuid
        and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Duplicate index on custom_domains
-- custom_domains_artist_id_idx (migration 007) and custom_domains_artist_idx
-- (schema.sql only) are both on (artist_id) with identical definitions.
-- Keep the migration-defined name; drop the schema.sql-only duplicate.
-- ─────────────────────────────────────────────────────────────────────────────

drop index if exists public.custom_domains_artist_idx;
