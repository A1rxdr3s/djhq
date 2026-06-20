-- Migration 053: Artist tour city stays
--
-- Adds a table for per-tour city stay ranges. Each stay represents the period
-- the artist is present in a given city (starts_on…ends_on inclusive). Stays
-- can intentionally overlap on transition days; the calendar renders split-color
-- cells for those dates.

create table if not exists public.artist_tour_stays (
  id            uuid        primary key default gen_random_uuid(),
  tour_id       uuid        not null references public.artist_tours(id) on delete cascade,
  artist_id     uuid        not null references public.artists(id) on delete cascade,
  city          text        not null,
  country       text,
  venue_or_area text,
  starts_on     date        not null,
  ends_on       date        not null,
  color         text        not null default '#22c55e',
  sort_order    integer,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint artist_tour_stays_end_after_start check (ends_on >= starts_on)
);

create index if not exists artist_tour_stays_tour_id_idx
  on public.artist_tour_stays (tour_id);

create index if not exists artist_tour_stays_artist_id_idx
  on public.artist_tour_stays (artist_id);

alter table public.artist_tour_stays enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies  (follow migration-051 pattern: (select auth.uid()) for planner
-- cache efficiency; one SELECT policy, explicit write policies)
-- ─────────────────────────────────────────────────────────────────────────────

-- Public read: visible when both the tour and the artist are published, OR the
-- viewer is the owner.
create policy "artist_tour_stays_select"
  on public.artist_tour_stays for select
  using (
    exists (
      select 1 from public.artist_tours t
      join public.artists a on a.id = t.artist_id
      where t.id = tour_id
        and (
          (t.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "artist_tour_stays_owner_insert"
  on public.artist_tour_stays for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "artist_tour_stays_owner_update"
  on public.artist_tour_stays for update
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "artist_tour_stays_owner_delete"
  on public.artist_tour_stays for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at auto-maintenance
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_artist_tour_stays_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artist_tour_stays_updated_at on public.artist_tour_stays;
create trigger trg_artist_tour_stays_updated_at
  before update on public.artist_tour_stays
  for each row execute function public.set_artist_tour_stays_updated_at();
