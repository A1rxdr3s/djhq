-- ── 067 — artist_career_timeline: add metadata_overlay_mode ──────────────────
--
-- Adds per-card metadata overlay density control for the public Artist Story.
-- Lets HQ control how much UI text appears over each card image or surface.
--
-- Values:
--   auto    — resolves from hasImage and imageTreatment; preserves existing behavior
--   full    — year / category / title / location / description (when descriptionMode allows)
--   compact — year / category / title / location; description suppressed
--   minimal — title and location only; year/category are sr-only
--   hidden  — all visible overlay suppressed; semantic text preserved for accessibility
--
-- Default is 'auto' — existing rows are unaffected and receive generic auto rules.

ALTER TABLE public.artist_career_timeline
  ADD COLUMN IF NOT EXISTS metadata_overlay_mode text NOT NULL DEFAULT 'auto'
    CHECK (metadata_overlay_mode IN ('auto', 'full', 'compact', 'minimal', 'hidden'));
