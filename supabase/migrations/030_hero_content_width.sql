alter table public.artists
  add column hero_content_width text not null default 'standard';

alter table public.artists
  add constraint artists_hero_content_width_valid
  check (hero_content_width in ('compact', 'standard', 'wide'));
