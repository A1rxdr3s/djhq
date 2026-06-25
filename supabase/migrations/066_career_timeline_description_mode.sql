-- ── 066 — artist_career_timeline: add description_mode ───────────────────────
--
-- Adds editorial text-density control per career timeline item.
-- Controls how much description text appears on the public Artist Story card.
--
-- Values:
--   auto    — system decides based on slot size, image presence, and media treatment
--   full    — show description with generous line clamp
--   short   — show 1–2 lines of description
--   minimal — show at most 1 line (PrimaryCard) or hide (SecondaryCard)
--   hidden  — description not shown; category/year/title/location still visible
--
-- Default is 'auto' — existing rows are unaffected and receive slot-aware auto rules.

ALTER TABLE public.artist_career_timeline
  ADD COLUMN IF NOT EXISTS description_mode text NOT NULL DEFAULT 'auto'
    CHECK (description_mode IN ('auto', 'full', 'short', 'minimal', 'hidden'));
