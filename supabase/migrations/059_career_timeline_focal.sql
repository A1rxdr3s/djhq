-- ── 059 — artist_career_timeline: add image focal point controls ─────────────
--
-- Adds three columns that let teams control how each Career Update image is
-- cropped inside the public Artist Story editorial mosaic.
--
-- Different story slots have very different aspect ratios (left-tall-story is
-- portrait, hero/wide-bottom are wide, compact tiles are landscape). Without
-- focal point control, images always crop at center-50%, which often cuts off
-- the subject. These columns let teams set the exact focus point per update.
--
--   image_focal_x  — horizontal focus, 0 (left) to 100 (right), default 50
--   image_focal_y  — vertical focus,   0 (top)  to 100 (bottom), default 50
--   image_object_fit — 'cover' (fills tile, may crop) | 'contain' (fits inside, no crop)
--
-- Default 50/50 = center — matches the previous implicit CSS `object-cover`
-- behaviour exactly. No data migration is needed.

ALTER TABLE public.artist_career_timeline
  ADD COLUMN IF NOT EXISTS image_focal_x   smallint NOT NULL DEFAULT 50
    CHECK (image_focal_x   BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS image_focal_y   smallint NOT NULL DEFAULT 50
    CHECK (image_focal_y   BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS image_object_fit text     NOT NULL DEFAULT 'cover'
    CHECK (image_object_fit IN ('cover', 'contain'));
