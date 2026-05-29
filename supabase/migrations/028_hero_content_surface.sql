alter table public.artists
  add column hero_content_surface text not null default 'soft';

alter table public.artists
  add constraint artists_hero_content_surface_valid
  check (hero_content_surface in ('none', 'soft', 'strong'));
