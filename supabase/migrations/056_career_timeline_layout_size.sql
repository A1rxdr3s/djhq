-- ── 056 — artist_career_timeline: add layout_size ────────────────────────────
--
-- Adds an optional editorial importance field to career timeline milestones.
-- Drives visual hierarchy in the public Career Updates mosaic section.
-- Set by the artist or HQ team — never inferred from title or venue name.
--
-- Values:
--   hero    — wide horizontal anchor; the standout milestone of the section
--   tall    — vertical anchor; cinematic or foundational appearance
--   wide    — horizontal secondary; releases, archive moments
--   compact — smaller tile; concise metadata, high-density mosaic
--   NULL    — positional fallback (component assigns by sort order)
--
-- Existing rows keep NULL so the current positional fallback continues to apply.

alter table public.artist_career_timeline
  add column if not exists layout_size text
  check (
    layout_size is null
    or layout_size in ('hero', 'tall', 'wide', 'compact')
  );
