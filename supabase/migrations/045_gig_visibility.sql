-- Migration 045: Add visibility_status to gigs
-- Controls whether a show is publicly announced, hidden as TBA, or hidden as TBC.
-- All existing shows default to 'announced' (current public behavior unchanged).

alter table public.gigs
  add column if not exists visibility_status text not null default 'announced'
    check (visibility_status in ('announced', 'tba', 'tbc', 'cancelled'));
