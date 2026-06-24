-- ── 057 — artist_career_timeline: add story_slot + show_in_collapsed ────────
--
-- story_slot: explicit editorial position in the public Career Updates mosaic.
-- Lets HQ assign each milestone to a named visual slot rather than relying on
-- positional fallback from sort order.
--
-- Values map to named grid positions in the 12-column desktop mosaic:
--   hero         — 6-col × 2-row wide centre hero (top-centre)
--   right-tall   — 3-col × 4-row tall right anchor (full right)
--   left-anchor  — 3-col × 2-row left anchor below intro
--   compact-a    — 3-col × 2-row first middle compact
--   compact-b    — 3-col × 2-row second middle compact
--   text-left    — 3-col × 2-row bottom-left text tile
--   wide-bottom  — 6-col × 2-row bottom wide tile
--   text-right   — 3-col × 2-row bottom-right text tile
--   NULL         — positional fallback (component assigns by sort order)
--
-- show_in_collapsed: controls which items appear in the default mosaic grid.
--   true  (default) — item is a candidate for the collapsed 8-slot grid
--   false           — item bypasses the grid and goes directly to the archive

alter table public.artist_career_timeline
  add column if not exists story_slot text
  check (
    story_slot is null
    or story_slot in (
      'hero', 'right-tall', 'left-anchor',
      'compact-a', 'compact-b',
      'text-left', 'wide-bottom', 'text-right'
    )
  );

alter table public.artist_career_timeline
  add column if not exists show_in_collapsed boolean not null default true;
