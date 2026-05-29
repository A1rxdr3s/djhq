alter table public.releases
  add column spotify_url text,
  add column beatport_url text,
  add column apple_music_url text,
  add column soundcloud_url text,
  add column youtube_music_url text,
  add column bandcamp_url text,
  add column other_url text;
