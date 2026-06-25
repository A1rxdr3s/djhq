-- ── 065 — fix story_slot CHECK constraint after hero split ───────────────────
--
-- Migration 064 may not have been applied to this database, leaving the
-- constraint from 063 active — which does not include 'top-feature-primary'
-- or 'top-feature-secondary'. This migration is idempotent: it dynamically
-- drops all story_slot CHECKs (regardless of auto-generated name) and adds a
-- single canonical constraint with all current + deprecated slot IDs.

-- Step 1: remap any remaining hero assignments to top-feature-primary
UPDATE public.artist_career_timeline
   SET story_slot = 'top-feature-primary'
 WHERE story_slot = 'hero';

-- Step 2: drop all story_slot CHECK constraints (regardless of name)
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

-- Step 3: add canonical constraint with all current and deprecated slot IDs
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
        'hero',       -- deprecated; SLOT_MIGRATION remaps to top-feature-primary
        'wide-bottom' -- deprecated; SLOT_MIGRATION remaps to bottom-left
      )
    );
