alter table public.artists
  add column hero_logo_placement text not null default 'editorial';

alter table public.artists
  add constraint artists_hero_logo_placement_valid
  check (hero_logo_placement in ('editorial', 'top_center', 'center', 'custom'));
