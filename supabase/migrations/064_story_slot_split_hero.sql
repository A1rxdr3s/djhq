-- ── 064 — artist_career_timeline: split hero into top-feature-primary + top-feature-secondary ──
--
-- The top-center wide slot ('hero', 6col × 2row) is replaced with two
-- independent editorial slots in an asymmetric 60/40 (4col + 2col) split:
--
--   top-feature-primary   — 4col × 2row (dominant, ~67% of top-center area)
--   top-feature-secondary — 2col × 2row (supporting, ~33% of top-center area)
--
-- Motivation: the oversized single hero slot gives the editor no flexibility
-- to feature two top signals simultaneously. The split allows, for example,
-- a current destination/momentum card alongside a festival crowd-proof card,
-- without increasing overall section height.
--
-- Backward-compatibility:
--   1. Existing rows with story_slot = 'hero' are remapped to 'top-feature-primary'.
--   2. 'hero' is retained in the CHECK constraint so any data that bypasses step 1
--      (e.g. local dev with out-of-order migrations) does not violate the constraint.
--      The public layout remaps it silently via SLOT_MIGRATION.

-- Step 1: remap existing hero assignments to top-feature-primary
UPDATE public.artist_career_timeline
   SET story_slot = 'top-feature-primary'
 WHERE story_slot = 'hero';

-- Step 2: drop all story_slot CHECK constraints and recreate with new values
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.artist_career_timeline'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%story_slot%'
  LOOP
    EXECUTE 'ALTER TABLE public.artist_career_timeline DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.artist_career_timeline
  ADD CONSTRAINT artist_career_timeline_story_slot_check
    CHECK (
      story_slot IS NULL OR
      story_slot IN (
        'left-tall-story',
        'top-feature-primary',
        'top-feature-secondary',
        'right-top',
        'right-bottom',
        'compact-a',
        'compact-b',
        'bottom-left',
        'bottom-right',
        'hero',       -- deprecated; retained for backward-compatibility only
        'wide-bottom' -- deprecated; retained for backward-compatibility only
      )
    );
