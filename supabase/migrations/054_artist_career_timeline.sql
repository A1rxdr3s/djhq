-- Migration 054: Artist career timeline
--
-- Adds a table for career milestone entries (residencies, festivals, releases,
-- press achievements, etc.) that the artist can manage from HQ and display
-- on their public profile as an editorial career story section.
--
-- category is an open text field (validated in application layer) using the
-- canonical values: residency | festival | club_show | international |
-- release | press | chart | tour | other

create table if not exists public.artist_career_timeline (
  id            uuid        primary key default gen_random_uuid(),
  artist_id     uuid        not null references public.artists(id) on delete cascade,
  title         text        not null,
  category      text        not null default 'other',
  event_date    date        not null,
  location      text,
  description   text,
  link          text,
  image_url     text,
  is_published  boolean     not null default true,
  sort_order    integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists artist_career_timeline_artist_id_idx
  on public.artist_career_timeline (artist_id);

create index if not exists artist_career_timeline_artist_date_idx
  on public.artist_career_timeline (artist_id, event_date desc);

alter table public.artist_career_timeline enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies  (follow migration-051 pattern: (select auth.uid()) for planner
-- cache efficiency; one SELECT policy, explicit write policies)
-- ─────────────────────────────────────────────────────────────────────────────

-- Public read: visible when the item is published AND the artist is published,
-- OR the viewer is the artist owner.
create policy "artist_career_timeline_select"
  on public.artist_career_timeline for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "artist_career_timeline_owner_insert"
  on public.artist_career_timeline for insert
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

create policy "artist_career_timeline_owner_update"
  on public.artist_career_timeline for update
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

create policy "artist_career_timeline_owner_delete"
  on public.artist_career_timeline for delete
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at auto-maintenance
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_artist_career_timeline_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artist_career_timeline_updated_at on public.artist_career_timeline;
create trigger trg_artist_career_timeline_updated_at
  before update on public.artist_career_timeline
  for each row execute function public.set_artist_career_timeline_updated_at();
