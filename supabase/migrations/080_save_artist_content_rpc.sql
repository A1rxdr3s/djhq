-- ────────────────────────────────────────────────────────────────────────────
-- 080_save_artist_content_rpc.sql
--
-- Atomic content-replacement function for the main HQ artist save flow.
--
-- Problem solved:
--   The PATCH /api/artists route previously ran separate DELETE + INSERT
--   statements for releases, gigs, dj_sets, and videos as independent HTTP
--   calls to the Supabase REST API.  If a DELETE committed and the subsequent
--   INSERT failed, the table was left permanently empty for that artist.
--
-- Solution:
--   A single PL/pgSQL function wraps all four replacements.  PostgreSQL
--   executes the function body in one implicit transaction, so any failure
--   in any INSERT causes a full rollback — the previous data is restored.
--
-- Caller:
--   app/api/artists/route.ts via createSupabaseAdminClient().rpc(...)
--   The route already verifies artist ownership before this call.
--   The admin client uses the service_role key which bypasses RLS.
--
-- Permissions:
--   Revoked from public / anon / authenticated.
--   Granted only to service_role so it cannot be called via the anon API.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.save_artist_content(
  p_artist_id uuid,
  p_releases  jsonb,
  p_gigs      jsonb,
  p_dj_sets   jsonb,
  p_videos    jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  -- ── Releases (hard replace) ───────────────────────────────────────────────
  -- All releases for the artist are deleted and re-inserted from the payload.
  -- sort_order is assigned from the payload array position (1-based).

  delete from public.releases
  where artist_id = p_artist_id;

  insert into public.releases (
    artist_id,
    title,
    label,
    credits,
    release_date,
    artwork_url,
    platform_url,
    type,
    is_featured,
    sort_order,
    spotify_url,
    beatport_url,
    apple_music_url,
    soundcloud_url,
    youtube_music_url,
    bandcamp_url,
    traxsource_url,
    other_url,
    release_type,
    version_type,
    remixer
  )
  select
    p_artist_id,
    r->>'title',
    r->>'label',
    nullif(r->>'credits',           ''),
    (r->>'release_date')::date,
    r->>'artwork_url',
    r->>'platform_url',
    r->>'type',
    (r->>'is_featured')::boolean,
    ord::integer,
    nullif(r->>'spotify_url',       ''),
    nullif(r->>'beatport_url',      ''),
    nullif(r->>'apple_music_url',   ''),
    nullif(r->>'soundcloud_url',    ''),
    nullif(r->>'youtube_music_url', ''),
    nullif(r->>'bandcamp_url',      ''),
    nullif(r->>'traxsource_url',    ''),
    nullif(r->>'other_url',         ''),
    nullif(r->>'release_type',      ''),
    nullif(r->>'version_type',      ''),
    nullif(r->>'remixer',           '')
  from jsonb_array_elements(coalesce(p_releases, '[]'::jsonb))
    with ordinality as t(r, ord);

  -- ── Gigs (soft-delete-aware replace) ─────────────────────────────────────
  -- Only active gigs (deleted_at IS NULL) are removed and replaced.
  -- Soft-deleted gigs (deleted_at IS NOT NULL) are left untouched.
  -- sort_order is assigned from the payload array position (1-based).
  -- This fixes a pre-existing bug where sort_order was never written for gigs.

  delete from public.gigs
  where  artist_id  = p_artist_id
    and  deleted_at is null;

  insert into public.gigs (
    artist_id,
    date,
    event_name,
    venue,
    city,
    country,
    club_venue,
    event_status,
    ticket_url,
    flyer_url,
    instagram_url,
    fee_amount,
    fee_currency,
    payment_status,
    visibility_status,
    sort_order
  )
  select
    p_artist_id,
    (r->>'date')::date,
    nullif(r->>'event_name',      ''),
    r->>'venue',
    r->>'city',
    r->>'country',
    nullif(r->>'club_venue',      ''),
    nullif(r->>'event_status',    ''),
    nullif(r->>'ticket_url',      ''),
    nullif(r->>'flyer_url',       ''),
    nullif(r->>'instagram_url',   ''),
    (r->>'fee_amount')::numeric,
    nullif(r->>'fee_currency',    ''),
    nullif(r->>'payment_status',  ''),
    coalesce(nullif(r->>'visibility_status', ''), 'announced'),
    ord::integer
  from jsonb_array_elements(coalesce(p_gigs, '[]'::jsonb))
    with ordinality as t(r, ord);

  -- ── DJ Sets (hard replace) ────────────────────────────────────────────────
  -- All DJ sets for the artist are deleted and re-inserted from the payload.
  -- Titles are pre-computed in TypeScript (computeDjSetTitle) and passed in.
  -- performance_artists is a JSONB array → converted to a PostgreSQL text[].

  delete from public.dj_sets
  where artist_id = p_artist_id;

  insert into public.dj_sets (
    artist_id,
    title,
    performance_type,
    performance_artists,
    custom_performance_type,
    title_override,
    venue,
    event,
    set_date,
    city,
    image_url,
    platform_url,
    sort_order,
    is_published
  )
  select
    p_artist_id,
    r->>'title',
    r->>'performance_type',
    array(
      select jsonb_array_elements_text(
        coalesce(r->'performance_artists', '[]'::jsonb)
      )
    ),
    nullif(r->>'custom_performance_type', ''),
    nullif(r->>'title_override',          ''),
    nullif(r->>'venue',                   ''),
    nullif(r->>'event',                   ''),
    (r->>'set_date')::date,
    nullif(r->>'city',                    ''),
    nullif(r->>'image_url',               ''),
    r->>'platform_url',
    ord::integer,
    (r->>'is_published')::boolean
  from jsonb_array_elements(coalesce(p_dj_sets, '[]'::jsonb))
    with ordinality as t(r, ord);

  -- ── Videos (hard replace) ─────────────────────────────────────────────────
  -- All videos for the artist are deleted and re-inserted from the payload.
  -- Titles are pre-computed in TypeScript (computeVideoTitle) and passed in.
  -- video_artists is a JSONB array → converted to a PostgreSQL text[].

  delete from public.videos
  where artist_id = p_artist_id;

  insert into public.videos (
    artist_id,
    title,
    video_artists,
    video_event,
    video_city,
    video_country,
    venue,
    video_date,
    thumbnail_url,
    custom_thumbnail_url,
    platform_url,
    sort_order,
    is_published
  )
  select
    p_artist_id,
    r->>'title',
    array(
      select jsonb_array_elements_text(
        coalesce(r->'video_artists', '[]'::jsonb)
      )
    ),
    nullif(r->>'video_event',   ''),
    nullif(r->>'video_city',    ''),
    nullif(r->>'video_country', ''),
    nullif(r->>'venue',         ''),
    (r->>'video_date')::date,
    nullif(r->>'thumbnail_url', ''),
    r->>'custom_thumbnail_url',
    r->>'platform_url',
    ord::integer,
    (r->>'is_published')::boolean
  from jsonb_array_elements(coalesce(p_videos, '[]'::jsonb))
    with ordinality as t(r, ord);

end;
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────
-- Revoke the default public grant, then allow only the service_role used by the
-- server-side admin client in app/api/artists/route.ts.

revoke execute
  on function public.save_artist_content(uuid, jsonb, jsonb, jsonb, jsonb)
  from public;

revoke execute
  on function public.save_artist_content(uuid, jsonb, jsonb, jsonb, jsonb)
  from anon;

revoke execute
  on function public.save_artist_content(uuid, jsonb, jsonb, jsonb, jsonb)
  from authenticated;

grant execute
  on function public.save_artist_content(uuid, jsonb, jsonb, jsonb, jsonb)
  to service_role;
