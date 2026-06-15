-- Migration 046: Soft-delete support for gigs
-- Setting deleted_at preserves the record in DB while hiding it from all queries.
-- All existing shows are unaffected (deleted_at defaults to null = active).

alter table public.gigs
  add column if not exists deleted_at timestamptz null default null;
