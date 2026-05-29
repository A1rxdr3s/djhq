alter table public.gallery_images
  add column focal_x integer not null default 50,
  add column focal_y integer not null default 50;
