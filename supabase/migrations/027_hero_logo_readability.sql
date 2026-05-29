alter table public.artists
  add column hero_logo_readability text not null default 'subtle';

alter table public.artists
  add constraint artists_hero_logo_readability_valid
  check (hero_logo_readability in ('none', 'subtle', 'strong'));
