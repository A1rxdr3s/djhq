-- Add event_name column to gigs.
-- Stores the event or show brand name (e.g. "Afterlife", "Music On", "Boiler Room").
-- Separate from venue (e.g. "Hï Ibiza", "Pacha Barcelona").
-- Nullable so existing shows remain unaffected.
alter table public.gigs
  add column if not exists event_name text;
