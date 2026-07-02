-- Migration 077: add color_grade and color_grade_strength to gallery_images
--
-- color_grade: optional per-image color treatment preset for the public Moments section.
--   null / 'none' = no treatment (default behavior)
--   'warm'        = amber/copper warmth
--   'red_club'    = red/orange club-light cast
--   'blue_night'  = cool blue/cyan nightlife tone
--   'green_laser' = green club-light tone
--   'mono'        = desaturated / monochrome
--   'muted'       = lower saturation + softer contrast
--
-- color_grade_strength: intensity of the grade, 0–100.
--   null / 0 = no effect
--
-- Existing rows have null for both fields → automatic/no-treatment (backward-compatible).

alter table public.gallery_images
  add column if not exists color_grade text null
    constraint gallery_images_color_grade_check
      check (
        color_grade is null or
        color_grade in ('none', 'warm', 'red_club', 'blue_night', 'green_laser', 'mono', 'muted')
      );

alter table public.gallery_images
  add column if not exists color_grade_strength integer null
    constraint gallery_images_color_grade_strength_check
      check (color_grade_strength is null or (color_grade_strength >= 0 and color_grade_strength <= 100));
