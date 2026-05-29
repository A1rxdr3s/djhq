alter table public.artists
  add column hero_logo_alignment text not null default 'left',
  add column hero_logo_offset_x  integer not null default 0,
  add column hero_logo_offset_y  integer not null default 0;

alter table public.artists
  add constraint artists_hero_logo_alignment_valid
  check (hero_logo_alignment in ('left', 'center', 'right'));
