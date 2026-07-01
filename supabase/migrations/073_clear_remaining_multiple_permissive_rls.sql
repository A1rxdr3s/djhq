-- Migration 073: Clear remaining "Multiple Permissive Policies" warnings
--
-- Context:
--   After migrations 071 and 072, the Supabase Performance Advisor dropped from
--   55 warnings to 20. The remaining 20 are all "Multiple Permissive Policies"
--   on 5 tables where Dashboard-created _user_* policies were added alongside the
--   migration-created _owner_* / _owner_all policies.
--
-- Tables: artist_tours, brand_asset_assignments, brand_assets,
--         brand_source_files, custom_domains.
--
-- ── artist_tours ──────────────────────────────────────────────────────────────
--   Overlap:
--     SELECT:  artist_tours_select (public) + artist_tours_user_select (authenticated)
--     INSERT:  artist_tours_owner_insert (public) + artist_tours_user_insert (authenticated)
--     UPDATE:  artist_tours_owner_update (public) + artist_tours_user_update (authenticated)
--     DELETE:  artist_tours_owner_delete (public) + artist_tours_user_delete (authenticated)
--
--   Equivalence:
--     SELECT  — artist_tours_select already handles both anon public-read
--               (published tour + published artist) AND authenticated owner-read
--               via the auth.uid() branch. The authenticated-only user_select is
--               a strict subset; dropping it changes nothing.
--     Writes  — _owner_insert/update/delete check auth.uid(); anonymous sessions
--               return NULL so those policies were already a no-op for anon.
--               The _user_insert/update/delete policies are equivalent but scoped
--               to authenticated. Dropping the public-role write policies is safe.
--
--   Action: drop user_select + owner_insert + owner_update + owner_delete.
--   Kept:   artist_tours_select, artist_tours_user_insert/update/delete.

drop policy if exists "artist_tours_user_select"  on public.artist_tours;
drop policy if exists "artist_tours_owner_insert"  on public.artist_tours;
drop policy if exists "artist_tours_owner_update"  on public.artist_tours;
drop policy if exists "artist_tours_owner_delete"  on public.artist_tours;

-- ── brand_asset_assignments ───────────────────────────────────────────────────
--   Overlap identical to artist_tours pattern above.
--   Kept: brand_asset_assignments_select, brand_asset_assignments_user_insert/update/delete.

drop policy if exists "brand_asset_assignments_user_select"  on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_insert" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_update" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_delete" on public.brand_asset_assignments;

-- ── brand_assets ──────────────────────────────────────────────────────────────
--   brand_assets_owner_all is FOR ALL (public role), which is permissive for
--   SELECT, INSERT, UPDATE, and DELETE simultaneously. The Dashboard added four
--   granular brand_assets_user_select/insert/update/delete (authenticated).
--   Each command now has two permissive policies.
--
--   Equivalence:
--     The _owner_all USING expression:
--       exists(select 1 from public.artists a
--              where a.id = artist_id and a.owner_user_id = (select auth.uid()))
--     is identical to what the _user_* granular policies check. The granular
--     policies are authenticated-only (stricter role), same ownership logic.
--     Dropping _owner_all leaves all 4 commands covered.
--
--   Action: drop brand_assets_owner_all.
--   Kept:   brand_assets_user_select, brand_assets_user_insert/update/delete.

drop policy if exists "brand_assets_owner_all" on public.brand_assets;

-- ── brand_source_files ────────────────────────────────────────────────────────
--   Same pattern as brand_assets (single FOR ALL + 4 granular _user_* policies).
--   Action: drop brand_source_files_owner_all.
--   Kept:   brand_source_files_user_select, brand_source_files_user_insert/update/delete.

drop policy if exists "brand_source_files_owner_all" on public.brand_source_files;

-- ── custom_domains ────────────────────────────────────────────────────────────
--   Same pattern as brand_assets (single FOR ALL + 4 granular _user_* policies).
--   Action: drop custom_domains_owner_all.
--   Kept:   custom_domains_user_select, custom_domains_user_insert/update/delete.

drop policy if exists "custom_domains_owner_all" on public.custom_domains;
