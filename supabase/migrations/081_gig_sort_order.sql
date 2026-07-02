-- Migration 081: Add sort_order to gigs
--
-- sort_order was always present in schema.sql but was never added via a migration,
-- so the production table lacks the column. The save_artist_content RPC (migration 080)
-- writes sort_order for gigs, causing an error until this column is present.
--
-- IF NOT EXISTS makes this safe to run even if the column was already added manually
-- as a production hotfix.

alter table public.gigs
  add column if not exists sort_order integer not null default 0;
