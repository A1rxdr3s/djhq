-- DJHQ MVP Initial Schema
-- Supabase / PostgreSQL

create extension if not exists pgcrypto;

-- Updated timestamp helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Artists are the root public profile entity.
create table public.artists (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid null,
  owner_user_id uuid null,

  handle text not null,
  artist_name text not null,
  real_name text null,
  tagline text null,
  genres text[] not null default '{}',
  location text not null,
  short_bio text not null,
  hero_image_url text not null,
  avatar_url text null,

  booking_email text not null,
  booking_url text null,

  press_kit_enabled boolean not null default false,
  press_kit_download_url text null,
  press_kit_assets text[] not null default '{}',

  plan text not null default 'free',
  is_published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artists_handle_unique unique (handle),
  constraint artists_handle_format check (handle ~ '^[a-z0-9][a-z0-9_-]{2,49}$'),
  constraint artists_artist_name_not_empty check (length(trim(artist_name)) > 0),
  constraint artists_location_not_empty check (length(trim(location)) > 0),
  constraint artists_short_bio_not_empty check (length(trim(short_bio)) > 0),
  constraint artists_hero_image_url_not_empty check (length(trim(hero_image_url)) > 0),
  constraint artists_booking_email_basic check (position('@' in booking_email) > 1),
  constraint artists_plan_check check (plan in ('free', 'pro')),
  constraint artists_press_kit_download_required_when_enabled check (
    press_kit_enabled = false
    or press_kit_download_url is not null
  )
);

create trigger set_artists_updated_at
before update on public.artists
for each row
execute function public.set_updated_at();

-- Social/music links shown on the public artist page.
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,

  platform text not null,
  label text not null,
  url text not null,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_links_platform_check check (
    platform in ('beatport', 'spotify', 'soundcloud', 'youtube', 'instagram', 'tiktok', 'website', 'other')
  ),
  constraint social_links_label_not_empty check (length(trim(label)) > 0),
  constraint social_links_url_not_empty check (length(trim(url)) > 0),
  constraint social_links_sort_order_non_negative check (sort_order >= 0)
);

create trigger set_social_links_updated_at
before update on public.social_links
for each row
execute function public.set_updated_at();

-- Releases listed on the profile. One may be marked as featured.
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,

  title text not null,
  label text not null,
  release_date date not null,
  artwork_url text not null,
  platform_url text not null,
  type text not null,
  is_featured boolean not null default false,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint releases_title_not_empty check (length(trim(title)) > 0),
  constraint releases_label_not_empty check (length(trim(label)) > 0),
  constraint releases_artwork_url_not_empty check (length(trim(artwork_url)) > 0),
  constraint releases_platform_url_not_empty check (length(trim(platform_url)) > 0),
  constraint releases_type_check check (type in ('single', 'ep', 'album')),
  constraint releases_sort_order_non_negative check (sort_order >= 0)
);

create unique index releases_one_featured_per_artist_idx
on public.releases (artist_id)
where is_featured = true;

create trigger set_releases_updated_at
before update on public.releases
for each row
execute function public.set_updated_at();

-- Upcoming gigs/events shown on the profile.
create table public.gigs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,

  date timestamptz not null,
  venue text not null,
  city text not null,
  country text not null,
  ticket_url text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gigs_venue_not_empty check (length(trim(venue)) > 0),
  constraint gigs_city_not_empty check (length(trim(city)) > 0),
  constraint gigs_country_not_empty check (length(trim(country)) > 0)
);

create trigger set_gigs_updated_at
before update on public.gigs
for each row
execute function public.set_updated_at();

-- Press/gallery images shown on the profile.
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,

  image_url text not null,
  alt_text text not null,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gallery_images_image_url_not_empty check (length(trim(image_url)) > 0),
  constraint gallery_images_alt_text_not_empty check (length(trim(alt_text)) > 0),
  constraint gallery_images_sort_order_non_negative check (sort_order >= 0)
);

create trigger set_gallery_images_updated_at
before update on public.gallery_images
for each row
execute function public.set_updated_at();

-- Indexes.
-- artists(handle) is covered by artists_handle_unique.
create index artists_is_published_idx on public.artists (is_published);
create index social_links_artist_sort_order_idx on public.social_links (artist_id, sort_order);
create index releases_artist_featured_idx on public.releases (artist_id, is_featured);
create index gigs_artist_date_idx on public.gigs (artist_id, date);
create index gallery_images_artist_sort_order_idx on public.gallery_images (artist_id, sort_order);

-- Row Level Security.
alter table public.artists enable row level security;
alter table public.social_links enable row level security;
alter table public.releases enable row level security;
alter table public.gigs enable row level security;
alter table public.gallery_images enable row level security;

-- Temporary public read policies for published profiles only.
create policy "Public can read published artists"
on public.artists
for select
to anon, authenticated
using (is_published = true);

create policy "Public can read links for published artists"
on public.social_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artists
    where artists.id = social_links.artist_id
      and artists.is_published = true
  )
);

create policy "Public can read releases for published artists"
on public.releases
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artists
    where artists.id = releases.artist_id
      and artists.is_published = true
  )
);

create policy "Public can read gigs for published artists"
on public.gigs
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artists
    where artists.id = gigs.artist_id
      and artists.is_published = true
  )
);

create policy "Public can read gallery images for published artists"
on public.gallery_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artists
    where artists.id = gallery_images.artist_id
      and artists.is_published = true
  )
);

-- Seed Data
with inserted_artist as (
  insert into public.artists (
    id,
    tenant_id,
    owner_user_id,
    handle,
    artist_name,
    real_name,
    tagline,
    genres,
    location,
    short_bio,
    hero_image_url,
    avatar_url,
    booking_email,
    booking_url,
    press_kit_enabled,
    press_kit_download_url,
    press_kit_assets,
    plan,
    is_published,
    created_at,
    updated_at
  )
  values (
    '11111111-1111-4111-8111-111111111111',
    null,
    null,
    'andresherrera',
    'ANDRES:HERRERA',
    'Andres Herrera',
    'Peak-time house and techno for modern club rooms.',
    array['House', 'Tech House', 'Melodic Techno'],
    'Miami / Berlin',
    'ANDRES:HERRERA delivers dark, groove-led house and techno shaped for peak-time dance floors. His recent releases and club sets bridge underground energy with polished, international booking-ready presentation.',
    '/images/dj-hero.jpg',
    '/placeholder-user.jpg',
    'booking@andresherrera.com',
    'https://www.andresherrera.com/booking',
    true,
    'https://www.andresherrera.com/epk',
    array['Short bio', 'Press photos', 'Featured release links', 'Upcoming gigs', 'Technical rider'],
    'pro',
    true,
    '2026-05-01T12:00:00.000Z',
    '2026-05-20T15:30:00.000Z'
  )
  returning id
)
insert into public.social_links (artist_id, platform, label, url, sort_order)
select id, 'beatport', 'Beatport', 'https://www.beatport.com/artist/andres-herrera/000001', 1 from inserted_artist
union all select id, 'spotify', 'Spotify', 'https://open.spotify.com/artist/000001', 2 from inserted_artist
union all select id, 'soundcloud', 'SoundCloud', 'https://soundcloud.com/andresherrera', 3 from inserted_artist
union all select id, 'youtube', 'YouTube', 'https://www.youtube.com/@andresherrera', 4 from inserted_artist
union all select id, 'instagram', 'Instagram', 'https://www.instagram.com/andresherrera', 5 from inserted_artist;

insert into public.releases (
  artist_id,
  title,
  label,
  release_date,
  artwork_url,
  platform_url,
  type,
  is_featured,
  sort_order
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Midnight Protocol EP',
  'Drumcode',
  '2026-05-08',
  '/placeholder.jpg',
  'https://www.beatport.com/release/midnight-protocol-ep/000001',
  'ep',
  true,
  1
);

insert into public.gigs (artist_id, date, venue, city, country, ticket_url)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '2026-06-14T03:00:00.000Z',
    'Club Space',
    'Miami',
    'US',
    'https://ra.co/events/000001'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '2026-07-05T22:30:00.000Z',
    'Fabric',
    'London',
    'UK',
    'https://ra.co/events/000002'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '2026-08-22T23:00:00.000Z',
    'Watergate',
    'Berlin',
    'DE',
    'https://ra.co/events/000003'
  );

insert into public.gallery_images (artist_id, image_url, alt_text, sort_order)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '/images/dj-hero.jpg',
    'ANDRES:HERRERA performing with moody blue lighting',
    1
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '/placeholder.jpg',
    'ANDRES:HERRERA studio portrait',
    2
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '/placeholder-user.jpg',
    'ANDRES:HERRERA promo headshot',
    3
  );
