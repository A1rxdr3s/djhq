-- ── 058 — artist_career_timeline: rename editorial story slots ───────────────
--
-- The editorial mosaic layout was redesigned:
--
--   OLD layout (8 slots + intro text block):
--     intro cell (non-tile text)
--     left-anchor  → 3col × 2row (rows 3-4)
--     right-tall   → 3col × 4row (rows 1-4)
--     text-left    → 3col × 2row (rows 5-6)
--     text-right   → 3col × 2row (rows 5-6)
--
--   NEW layout (7 content slots, intro text replaced by tall tile):
--     left-tall-story → 3col × 6row (rows 1-6, full left column)
--     right-top       → 3col × 2row (rows 1-2, top right)
--     right-bottom    → 3col × 4row (rows 3-6, bottom right)
--
-- Migration mapping (data):
--   left-anchor   → left-tall-story  (left column tile, now full height)
--   text-left     → left-tall-story  (was bottom-left text tile — merged into left column)
--   right-tall    → right-bottom     (renamed; right side now split into top + bottom)
--   text-right    → right-top        (was bottom-right text tile — promoted to top right)
--
-- Slots hero, compact-a, compact-b, wide-bottom are unchanged.

-- 1. Drop the existing check constraint on story_slot (find by column reference)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'artist_career_timeline'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%story_slot%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.artist_career_timeline DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

-- 2. Migrate existing data: rename old slot IDs to new canonical names
UPDATE public.artist_career_timeline
  SET story_slot = 'left-tall-story'
  WHERE story_slot IN ('left-anchor', 'text-left');

UPDATE public.artist_career_timeline
  SET story_slot = 'right-bottom'
  WHERE story_slot = 'right-tall';

UPDATE public.artist_career_timeline
  SET story_slot = 'right-top'
  WHERE story_slot = 'text-right';

-- 3. Add new check constraint with canonical slot IDs
ALTER TABLE public.artist_career_timeline
  ADD CONSTRAINT artist_career_timeline_story_slot_check
  CHECK (
    story_slot IS NULL
    OR story_slot IN (
      'left-tall-story',
      'hero',
      'right-top',
      'right-bottom',
      'compact-a',
      'compact-b',
      'wide-bottom'
    )
  );
