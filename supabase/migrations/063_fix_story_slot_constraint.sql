-- ── 063 — fix story_slot CHECK constraint ────────────────────────────────────
--
-- Migration 062 dropped a named constraint but the original CHECK was created
-- inline (without a name), so Postgres auto-generated a different name.
-- The DROP CONSTRAINT IF EXISTS in 062 silently no-oped, leaving the old
-- inline constraint active while also adding the new named one.
-- Any INSERT with story_slot = 'bottom-left' or 'bottom-right' violates the
-- still-present old constraint.
--
-- Fix: dynamically find and drop every CHECK constraint on this column
-- (regardless of auto-generated name), then add a single canonical constraint.

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
        'hero',
        'right-top',
        'right-bottom',
        'compact-a',
        'compact-b',
        'bottom-left',
        'bottom-right',
        'wide-bottom'
      )
    );
