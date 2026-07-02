-- Migration 076: add optional moments_placement column to gallery_images
--
-- Controls where each photo is eligible to appear in the public Moments layout.
-- null and 'auto' behave identically (DJHQ chooses automatically).
-- Existing rows require no backfill — null = auto.
--
-- Allowed values: null | 'auto' | 'large' | 'top' | 'bottom' | 'hidden'

alter table public.gallery_images
  add column if not exists moments_placement text null
    constraint gallery_images_moments_placement_check
      check (
        moments_placement is null or
        moments_placement in ('auto', 'large', 'top', 'bottom', 'hidden')
      );
