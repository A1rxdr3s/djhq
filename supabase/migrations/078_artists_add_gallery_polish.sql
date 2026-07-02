-- Migration 078: add gallery_polish to artists
-- Gallery-wide "Gallery Polish" setting. null / 'off' = no global filter.
-- 'soft' = subtle saturate(0.97) brightness(0.97) applied to all Moments images.

alter table public.artists
  add column if not exists gallery_polish text null
    constraint artists_gallery_polish_check
      check (gallery_polish is null or gallery_polish in ('off', 'soft'));
