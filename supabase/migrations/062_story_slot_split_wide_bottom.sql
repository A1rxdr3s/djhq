-- ── 062 — artist_career_timeline: split wide-bottom into bottom-left + bottom-right ──
--
-- The lower wide slot (wide-bottom, 6col × 2row) is replaced with two
-- independent 3col × 2row slots: bottom-left and bottom-right.
--
-- Motivation: some milestones have strong images that do not read well at
-- wide/cinematic aspect ratios. Splitting gives editorial teams two standard-
-- format cards instead of one forced-wide card.
--
-- Backward-compatibility:
--   1. Any existing row with story_slot = 'wide-bottom' is remapped to
--      'bottom-left' so no assignment is silently lost.
--   2. 'wide-bottom' is retained in the CHECK constraint so any data that
--      bypasses step 1 (e.g. local dev with out-of-order migrations) does not
--      violate the constraint. The public layout silently remaps it via
--      SLOT_MIGRATION.
--
-- New slot grid positions (12-col × 6-row, grid-auto-rows: 86px):
--   bottom-left  — lg:[grid-column:4/7]  lg:[grid-row:5/7]  (3col × 2row)
--   bottom-right — lg:[grid-column:7/10] lg:[grid-row:5/7]  (3col × 2row)

-- Step 1: remap existing wide-bottom assignments to bottom-left
UPDATE public.artist_career_timeline
   SET story_slot = 'bottom-left'
 WHERE story_slot = 'wide-bottom';

-- Step 2: drop old CHECK, add new CHECK that includes both new values and the
-- legacy 'wide-bottom' value for safety
ALTER TABLE public.artist_career_timeline
  DROP CONSTRAINT IF EXISTS artist_career_timeline_story_slot_check;

ALTER TABLE public.artist_career_timeline
  ADD CONSTRAINT artist_career_timeline_story_slot_check
    CHECK (
      story_slot IS NULL OR
      story_slot IN (
        'left-tall-story',
        'hero',
        'right-top',
        'right-bottom',
        'compact-a',
        'compact-b',
        'bottom-left',
        'bottom-right',
        'wide-bottom'   -- retained for backward-compatibility only; deprecated in UI
      )
    );
