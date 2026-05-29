alter table public.artists
  add column artist_accent_theme text not null default 'matrix';

alter table public.artists
  add constraint artists_accent_theme_valid
  check (artist_accent_theme in ('matrix', 'electric_blue', 'signal_red'));
