-- Artist-configurable URL for the Press Kit button on the public profile.
-- When empty: defaults to /presskit on custom domains, /[handle]/presskit on djhq.co.
alter table public.artists
  add column if not exists press_kit_public_url text;
