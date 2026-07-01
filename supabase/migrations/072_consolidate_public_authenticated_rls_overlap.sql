-- Migration 072: Consolidate public vs authenticated permissive policy overlap
--
-- Background:
--   After migration 051 consolidated the original natural-language policies into
--   per-operation policies, additional "_user_*" policies targeting the
--   `authenticated` role were created via the Supabase Dashboard for the same
--   7 tables (artists, social_links, releases, gigs, gallery_images, dj_sets,
--   videos). This produces a second class of "Multiple Permissive Policies"
--   warnings:
--
--     - For SELECT: both "*_select" (role: public) and "*_user_select"
--       (role: authenticated) are permissive SELECT policies. Since PUBLIC
--       includes authenticated, Postgres evaluates both for every authenticated
--       query — two permissive policies for the same command.
--
--     - For INSERT/UPDATE/DELETE: both "*_owner_insert/update/delete" (role:
--       public) and "*_user_insert/update/delete" (role: authenticated) are
--       permissive write policies. Again, two permissive policies for the same
--       command on every authenticated write.
--
-- Behavior equivalence (why these drops are safe):
--
--   SELECT — keep "*_select" (public), drop "*_user_select" (authenticated):
--     The public SELECT policies already handle both cases:
--       • Anonymous:      is_published = true (or equivalent join on artists)
--       • Authenticated owner: ... or a.owner_user_id = (select auth.uid())
--     The authenticated-role SELECT policies are a strict subset — they only
--     fire for authenticated users, a group already fully covered by the public
--     policy. Dropping them changes nothing for any real user.
--
--   INSERT/UPDATE/DELETE — keep "*_user_insert/update/delete" (authenticated),
--   drop "*_owner_insert/update/delete" (public):
--     Every _owner_* write policy checks:
--       owner_user_id = (select auth.uid())           [artists]
--       exists(... a.owner_user_id = (select auth.uid())) [child tables]
--     For anonymous sessions auth.uid() returns NULL; NULL = NULL is FALSE.
--     Anonymous users are therefore already blocked by the USING/WITH CHECK
--     expression — the "public" role on these policies grants no extra access.
--     The _user_* write policies (role: authenticated) enforce the same
--     ownership check, just with an explicit role restriction instead of
--     relying on the NULL-check side-effect. Keeping the authenticated write
--     policies and dropping the public ones produces identical behaviour.
--
-- Tables changed: artists, social_links, releases, gigs,
--                 gallery_images, dj_sets, videos
-- Tables NOT changed: artist_tours, brand_asset_assignments, custom_domains,
--                     brand_source_files, brand_assets, artist_career_timeline,
--                     artist_tour_stays, artist_subscribers, admin_invitations,
--                     booking_leads, global_venues
--
-- Post-migration state per affected table:
--   SELECT  → 1 permissive policy, role public       (*_select)
--   INSERT  → 1 permissive policy, role authenticated (*_user_insert)
--   UPDATE  → 1 permissive policy, role authenticated (*_user_update)
--   DELETE  → 1 permissive policy, role authenticated (*_user_delete)

-- ── artists ───────────────────────────────────────────────────────────────────
drop policy if exists "artists_user_select"  on public.artists;
drop policy if exists "artists_owner_insert" on public.artists;
drop policy if exists "artists_owner_update" on public.artists;
drop policy if exists "artists_owner_delete" on public.artists;

-- ── social_links ──────────────────────────────────────────────────────────────
drop policy if exists "social_links_user_select"  on public.social_links;
drop policy if exists "social_links_owner_insert" on public.social_links;
drop policy if exists "social_links_owner_update" on public.social_links;
drop policy if exists "social_links_owner_delete" on public.social_links;

-- ── releases ──────────────────────────────────────────────────────────────────
drop policy if exists "releases_user_select"  on public.releases;
drop policy if exists "releases_owner_insert" on public.releases;
drop policy if exists "releases_owner_update" on public.releases;
drop policy if exists "releases_owner_delete" on public.releases;

-- ── gigs ──────────────────────────────────────────────────────────────────────
drop policy if exists "gigs_user_select"  on public.gigs;
drop policy if exists "gigs_owner_insert" on public.gigs;
drop policy if exists "gigs_owner_update" on public.gigs;
drop policy if exists "gigs_owner_delete" on public.gigs;

-- ── gallery_images ────────────────────────────────────────────────────────────
drop policy if exists "gallery_images_user_select"  on public.gallery_images;
drop policy if exists "gallery_images_owner_insert" on public.gallery_images;
drop policy if exists "gallery_images_owner_update" on public.gallery_images;
drop policy if exists "gallery_images_owner_delete" on public.gallery_images;

-- ── dj_sets ───────────────────────────────────────────────────────────────────
drop policy if exists "dj_sets_user_select"  on public.dj_sets;
drop policy if exists "dj_sets_owner_insert" on public.dj_sets;
drop policy if exists "dj_sets_owner_update" on public.dj_sets;
drop policy if exists "dj_sets_owner_delete" on public.dj_sets;

-- ── videos ────────────────────────────────────────────────────────────────────
drop policy if exists "videos_user_select"  on public.videos;
drop policy if exists "videos_owner_insert" on public.videos;
drop policy if exists "videos_owner_update" on public.videos;
drop policy if exists "videos_owner_delete" on public.videos;
