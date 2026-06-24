-- ── 060 — artist_career_timeline: add image zoom ─────────────────────────────
--
-- Adds a zoom multiplier so teams can zoom into the focal point of a Career
-- Update image. Combined with image_focal_x/y (migration 059), this gives full
-- control over how each image is framed inside its assigned story slot.
--
--   image_zoom — 1.0 (no zoom, default) to 3.0 (3× zoom)
--                Applied as CSS transform: scale() centered on the focal point.
--
-- Default 1.0 = no zoom, matches previous behaviour exactly.

ALTER TABLE public.artist_career_timeline
  ADD COLUMN IF NOT EXISTS image_zoom real NOT NULL DEFAULT 1.0
    CHECK (image_zoom BETWEEN 1.0 AND 3.0);
