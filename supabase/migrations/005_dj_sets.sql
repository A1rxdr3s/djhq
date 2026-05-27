-- DJ Sets module: recorded/broadcast sets shown on the public artist profile.

create table public.dj_sets (
  id           uuid        primary key default gen_random_uuid(),
  artist_id    uuid        not null references public.artists(id) on delete cascade,

  title        text        not null,
  venue        text        null,
  set_date     date        null,
  image_url    text        null,
  platform_url text        not null,
  sort_order   integer     not null default 0,
  is_published boolean     not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint dj_sets_title_not_empty check (length(trim(title)) > 0),
  constraint dj_sets_platform_url_not_empty check (length(trim(platform_url)) > 0),
  constraint dj_sets_sort_order_non_negative check (sort_order >= 0)
);

create trigger set_dj_sets_updated_at
before update on public.dj_sets
for each row
execute function public.set_updated_at();

create index dj_sets_artist_sort_order_idx on public.dj_sets (artist_id, sort_order);

alter table public.dj_sets enable row level security;

create policy "Public can read published dj sets for published artists"
on public.dj_sets
for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1
    from public.artists
    where artists.id = dj_sets.artist_id
      and artists.is_published = true
  )
);
