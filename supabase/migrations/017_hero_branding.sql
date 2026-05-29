alter table public.artists
  add column hero_logo_url text,
  add column hero_identity_mode text not null default 'text',
  add column hero_text_style text not null default 'default';
