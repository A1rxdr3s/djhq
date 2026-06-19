-- Tour Planner v1: named tour date ranges for artist profiles.
-- Shows inside a tour range are resolved dynamically from the gigs table.

create table if not exists public.artist_tours (
  id           uuid        primary key default gen_random_uuid(),
  artist_id    uuid        not null references public.artists(id) on delete cascade,
  name         text        not null,
  slug         text        not null,
  start_date   date        not null,
  end_date     date        not null,
  is_published boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (artist_id, slug),
  constraint artist_tours_end_after_start check (end_date >= start_date)
);

create index if not exists idx_artist_tours_artist_id on public.artist_tours(artist_id);

alter table public.artist_tours enable row level security;

-- Public read: published tours on published artist profiles
drop policy if exists "artist_tours_public_read" on public.artist_tours;
create policy "artist_tours_public_read"
  on public.artist_tours for select
  using (
    is_published = true
    and exists (
      select 1 from public.artists a
      where a.id = artist_id and a.is_published = true
    )
  );

-- Owner full access (bypasses RLS via admin client in API routes)
drop policy if exists "artist_tours_owner_all" on public.artist_tours;
create policy "artist_tours_owner_all"
  on public.artist_tours for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = auth.uid()
    )
  );

-- updated_at auto-maintenance
create or replace function public.set_artist_tours_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artist_tours_updated_at on public.artist_tours;
create trigger trg_artist_tours_updated_at
  before update on public.artist_tours
  for each row execute function public.set_artist_tours_updated_at();
