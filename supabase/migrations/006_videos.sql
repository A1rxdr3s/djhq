-- Featured Videos module: YouTube/Vimeo performance content shown on the public artist profile.

create table public.videos (
  id            uuid        primary key default gen_random_uuid(),
  artist_id     uuid        not null references public.artists(id) on delete cascade,

  title         text        not null,
  venue         text        null,
  video_date    date        null,
  thumbnail_url text        null,
  platform_url  text        not null,
  sort_order    integer     not null default 0,
  is_published  boolean     not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint videos_title_not_empty        check (length(trim(title)) > 0),
  constraint videos_platform_url_not_empty check (length(trim(platform_url)) > 0),
  constraint videos_sort_order_non_negative check (sort_order >= 0)
);

create trigger set_videos_updated_at
before update on public.videos
for each row
execute function public.set_updated_at();

create index videos_artist_sort_order_idx on public.videos (artist_id, sort_order);

alter table public.videos enable row level security;

create policy "Public can read published videos for published artists"
on public.videos
for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1
    from public.artists
    where artists.id = videos.artist_id
      and artists.is_published = true
  )
);
