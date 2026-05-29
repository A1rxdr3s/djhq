alter table public.artists
  add column hero_logo_style text not null default 'solid';

alter table public.artists
  add constraint artists_hero_logo_style_valid
  check (hero_logo_style in ('solid', 'soft', 'cinematic'));
