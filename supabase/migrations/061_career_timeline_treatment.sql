-- ── 061 — artist_career_timeline: add image treatment ────────────────────────
--
-- Adds an editorial media treatment selector per Career Update.
-- Different slots have different aspect ratios, and not every image fits well
-- as a full-cover background. This field lets teams choose how each image is
-- rendered inside its assigned story slot.
--
--   cover        — fills the card (may crop edges). Default. Best for images
--                  that match the slot aspect ratio.
--   contain      — shows the full image without cropping. May leave empty
--                  space on sides, filled with the card's dark surface.
--   blurred-fill — renders the image as a blurred/darkened full-card
--                  background with the original preserved/inset on top.
--                  Best for portrait photos in wide hero/wide-bottom slots.
--   text-only    — premium typographic card. Image is not rendered even if
--                  an imageUrl is set. Useful when no image fits well.
--
-- Default 'cover' preserves existing behaviour exactly for all current rows.

ALTER TABLE public.artist_career_timeline
  ADD COLUMN IF NOT EXISTS image_treatment text NOT NULL DEFAULT 'cover'
    CHECK (image_treatment IN ('cover', 'contain', 'blurred-fill', 'text-only'));
