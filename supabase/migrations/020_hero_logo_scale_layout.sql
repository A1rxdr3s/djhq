alter table public.artists
  add column hero_logo_scale integer not null default 100,
  add column hero_logo_layout text not null default 'replace_text';
