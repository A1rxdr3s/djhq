-- Add optional artist/credits line to releases.
-- Nullable: existing rows are unaffected and NULL renders as no credits line.
alter table public.releases
  add column credits text null;
