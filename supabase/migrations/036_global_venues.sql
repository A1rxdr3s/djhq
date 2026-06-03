-- ────────────────────────────────────────────────────────────────────────────
-- 036_global_venues.sql
-- Shared venue / club database.
-- Rows are contributed by users when they add shows with unknown venues.
-- Will be pre-seeded with a verified Top 100 list in a later migration.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.global_venues (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  city            text        not null default '',
  country         text        not null default '', -- ISO 3166-1 alpha-2
  instagram_url   text,
  website_url     text,
  google_maps_url text,
  -- source tracks where this row came from so verified entries rank higher
  source          text        not null default 'user_created',
  -- higher rank = surfaced first in autocomplete results
  source_rank     integer     not null default 0,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Deduplication: normalise name + city to prevent near-duplicates.
-- Lower-cased, trimmed. Allows the same venue name in different cities.
create unique index if not exists global_venues_dedup_idx
  on public.global_venues (
    lower(trim(name)),
    lower(trim(city))
  );

-- GIN index for fast full-text search on venue name.
create index if not exists global_venues_name_fts_idx
  on public.global_venues
  using gin (to_tsvector('simple', name));

-- Plain btree on source_rank for ORDER BY in search queries.
create index if not exists global_venues_rank_idx
  on public.global_venues (source_rank desc, name asc);

-- ── Optional: link gigs to global_venues ─────────────────────────────────────
-- Nullable FK: adding a show still works even if the venue is not in the table.
alter table public.gigs
  add column if not exists global_venue_id uuid
    references public.global_venues(id)
    on delete set null;

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.global_venues enable row level security;

-- Anyone (including anonymous) can read active venues.
-- Needed so autocomplete works on public artist pages if we ever expose it.
create policy "global_venues: public read"
  on public.global_venues
  for select
  using (is_active = true);

-- Authenticated users can insert new venues (user contributions).
create policy "global_venues: authenticated insert"
  on public.global_venues
  for insert
  to authenticated
  with check (true);

-- Authenticated users can update (e.g. fix a typo they submitted).
-- Tighten to owner-only once we add a submitted_by_user_id column.
create policy "global_venues: authenticated update"
  on public.global_venues
  for update
  to authenticated
  using (true);

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger global_venues_updated_at
  before update on public.global_venues
  for each row execute function public.set_updated_at();
