-- Footer logo rendering mode: auto | light | dark
-- auto  = detect theme (no filter on dark pages)
-- light = apply brightness(0) invert(1) — for dark/black logos on dark backgrounds
-- dark  = render as-is — logo already designed for dark backgrounds
alter table public.artists
  add column if not exists footer_logo_mode text not null default 'auto';
