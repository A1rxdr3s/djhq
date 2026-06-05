-- ============================================================
-- DJHQ — Consolidated Idempotent Schema
-- Generated from migrations 001-040
-- Update this file whenever a new migration is created.
-- Safe to run multiple times (idempotent throughout).
-- ============================================================

-- Extensions
create extension if not exists pgcrypto;

-- ── Functions ────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.artists (
  id                      uuid        primary key default gen_random_uuid(),
  tenant_id               uuid        null,
  owner_user_id           uuid        null,
  handle                  text        not null,
  artist_name             text        not null,
  real_name               text        null,
  tagline                 text        null,
  hero_tagline            text        null,
  genres                  text[]      not null default '{}',
  location                text        not null,
  short_bio               text        not null,
  hero_image_url          text        not null,
  avatar_url              text        null,

  -- Booking / press kit
  booking_email           text        not null,
  booking_url             text        null,
  press_kit_enabled       boolean     not null default false,
  press_kit_download_url  text        null,
  press_kit_assets        text[]      not null default '{}',
  press_kit_root_url      text        null,
  press_kit_bio_folder_url      text  null,
  press_kit_logos_folder_url    text  null,
  press_kit_media_folder_url    text  null,
  press_kit_rider_folder_url    text  null,
  press_kit_pdf_en_url    text        null,
  press_kit_pdf_es_url    text        null,
  press_kit_pdf_en_size   text        null,
  press_kit_pdf_es_size   text        null,
  press_kit_public_url    text        null,
  press_kit_use_gallery_photos boolean not null default true,

  -- Plan
  plan                    text        not null default 'free',
  is_published            boolean     not null default false,

  -- Browser identity
  show_header_branding    boolean     not null default true,
  browser_title           text        null,
  favicon_url             text        null,

  -- Hero branding
  hero_logo_url           text        null,
  hero_identity_mode      text        not null default 'text',
  hero_text_style         text        not null default 'default',
  hero_logo_scale         integer     not null default 100,
  hero_logo_layout        text        not null default 'replace_text',
  hero_logo_alignment     text        not null default 'left',
  hero_logo_offset_x      integer     not null default 0,
  hero_logo_offset_y      integer     not null default 0,
  hero_logo_style         text        not null default 'solid',
  hero_logo_readability   text        not null default 'subtle',
  hero_content_surface    text        not null default 'soft',
  hero_logo_placement     text        not null default 'editorial',
  hero_content_width      text        not null default 'standard',

  -- Accent theme
  artist_accent_theme     text        not null default 'matrix',

  -- Footer branding (migrations 038-040)
  footer_logo_url         text        null,
  footer_logo_width       integer     not null default 220,
  footer_logo_mode        text        not null default 'auto',
  footer_booking_email    text        null,
  footer_contact_email    text        null,
  footer_demos_email      text        null,
  footer_newsletter_enabled boolean   not null default true,
  footer_socials_enabled  boolean     not null default true,
  footer_copyright        text        null,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint artists_handle_unique unique (handle),
  constraint artists_handle_format check (handle ~ '^[a-z0-9][a-z0-9_-]{2,49}$'),
  constraint artists_artist_name_not_empty check (length(trim(artist_name)) > 0),
  constraint artists_location_not_empty check (length(trim(location)) > 0),
  constraint artists_short_bio_not_empty check (length(trim(short_bio)) > 0),
  constraint artists_hero_image_url_not_empty check (length(trim(hero_image_url)) > 0),
  constraint artists_booking_email_basic check (position('@' in booking_email) > 1),
  constraint artists_plan_check check (plan in ('free', 'pro')),
  constraint artists_press_kit_download_required_when_enabled check (
    press_kit_enabled = false or press_kit_download_url is not null
  )
);

-- Ensure all incremental columns exist (idempotent ALTER TABLE)
alter table public.artists
  add column if not exists hero_tagline            text,
  add column if not exists show_header_branding    boolean not null default true,
  add column if not exists browser_title           text,
  add column if not exists favicon_url             text,
  add column if not exists hero_logo_url           text,
  add column if not exists hero_identity_mode      text not null default 'text',
  add column if not exists hero_text_style         text not null default 'default',
  add column if not exists hero_logo_scale         integer not null default 100,
  add column if not exists hero_logo_layout        text not null default 'replace_text',
  add column if not exists hero_logo_alignment     text not null default 'left',
  add column if not exists hero_logo_offset_x      integer not null default 0,
  add column if not exists hero_logo_offset_y      integer not null default 0,
  add column if not exists hero_logo_style         text not null default 'solid',
  add column if not exists hero_logo_readability   text not null default 'subtle',
  add column if not exists hero_content_surface    text not null default 'soft',
  add column if not exists hero_logo_placement     text not null default 'editorial',
  add column if not exists hero_content_width      text not null default 'standard',
  add column if not exists artist_accent_theme     text not null default 'matrix',
  add column if not exists press_kit_root_url      text,
  add column if not exists press_kit_bio_folder_url   text,
  add column if not exists press_kit_logos_folder_url text,
  add column if not exists press_kit_media_folder_url text,
  add column if not exists press_kit_rider_folder_url text,
  add column if not exists press_kit_pdf_en_url    text,
  add column if not exists press_kit_pdf_es_url    text,
  add column if not exists press_kit_pdf_en_size   text,
  add column if not exists press_kit_pdf_es_size   text,
  add column if not exists press_kit_public_url    text,
  add column if not exists press_kit_use_gallery_photos boolean not null default true,
  -- Footer branding
  add column if not exists footer_logo_url         text,
  add column if not exists footer_logo_width       integer not null default 220,
  add column if not exists footer_logo_mode        text not null default 'auto',
  add column if not exists footer_booking_email    text,
  add column if not exists footer_contact_email    text,
  add column if not exists footer_demos_email      text,
  add column if not exists footer_newsletter_enabled boolean not null default true,
  add column if not exists footer_socials_enabled  boolean not null default true,
  add column if not exists footer_copyright        text;

create table if not exists public.social_links (
  id          uuid        primary key default gen_random_uuid(),
  artist_id   uuid        not null references public.artists(id) on delete cascade,
  platform    text        not null,
  label       text        not null,
  url         text        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint social_links_platform_check check (
    platform in ('beatport','spotify','soundcloud','youtube','instagram','tiktok',
                 'resident-advisor','bandsintown','website','other')
  )
);

create table if not exists public.releases (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artists(id) on delete cascade,
  title           text        not null,
  label           text        not null default '',
  credits         text        null,
  release_date    date        not null,
  artwork_url     text        not null default '',
  platform_url    text        not null,
  type            text        not null default 'single',
  is_featured     boolean     not null default false,
  sort_order      integer     not null default 0,
  -- Platform links (018)
  spotify_url         text    null,
  beatport_url        text    null,
  apple_music_url     text    null,
  soundcloud_url      text    null,
  youtube_music_url   text    null,
  bandcamp_url        text    null,
  traxsource_url      text    null,
  other_url           text    null,
  -- Version/remixer (022-023)
  release_type    text        null,
  version_type    text        null,
  remixer         text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gigs (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artists(id) on delete cascade,
  date            date        not null,
  venue           text        not null,
  city            text        not null default '',
  country         text        not null default '',
  club_venue      text        null,
  sort_order      integer     not null default 0,
  -- Enhanced fields (010, 015, 032, 037)
  event_status    text        null,
  ticket_url      text        null,
  flyer_url       text        null,
  instagram_url   text        null,
  fee_amount      numeric     null,
  fee_currency    text        null,
  payment_status  text        null,
  event_name      text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.dj_sets (
  id                    uuid        primary key default gen_random_uuid(),
  artist_id             uuid        not null references public.artists(id) on delete cascade,
  title                 text        not null,
  venue                 text        null,
  event                 text        null,
  set_date              date        null,
  city                  text        null,
  image_url             text        null,
  platform_url          text        not null,
  sort_order            integer     not null default 0,
  is_published          boolean     not null default true,
  -- Performance type (021)
  performance_type      text        not null default 'dj_set',
  performance_artists   text[]      not null default '{}',
  custom_performance_type text      null,
  title_override        text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint dj_sets_performance_type_valid check (
    performance_type in ('dj_set','live_set','vinyl_set','b2b','b3b','other')
  )
);

create table if not exists public.videos (
  id                      uuid        primary key default gen_random_uuid(),
  artist_id               uuid        not null references public.artists(id) on delete cascade,
  title                   text        not null,
  thumbnail_url           text        null,
  custom_thumbnail_url    text        null,
  platform_url            text        not null,
  sort_order              integer     not null default 0,
  is_published            boolean     not null default true,
  -- Performance metadata (022)
  video_artists           text[]      not null default '{}',
  video_event             text        null,
  video_city              text        null,
  video_country           text        null,
  venue                   text        null,
  video_date              date        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id          uuid        primary key default gen_random_uuid(),
  artist_id   uuid        not null references public.artists(id) on delete cascade,
  image_url   text        not null,
  alt_text    text        not null default '',
  sort_order  integer     not null default 0,
  -- Focal point (014)
  focal_x     numeric     not null default 50,
  focal_y     numeric     not null default 50,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.custom_domains (
  id                          uuid        primary key default gen_random_uuid(),
  artist_id                   uuid        not null references public.artists(id) on delete cascade,
  domain                      text        not null,
  status                      text        not null default 'pending',
  verification_token          text        null,
  error_message               text        null,
  verified_at                 timestamptz null,
  added_to_vercel_at          timestamptz null,
  removed_at                  timestamptz null,
  verification_attempts       integer     not null default 0,
  last_verification_attempt_at timestamptz null,
  dns_target                  text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint custom_domains_domain_unique unique (domain),
  constraint custom_domains_status_check check (
    status in ('pending','verifying','verified','active','error','suspended','removed')
  )
);

create table if not exists public.venues (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  city        text        null,
  country     text        null,
  created_at  timestamptz not null default now()
);

-- Brand asset tables (migration 041)
create table if not exists public.brand_source_files (
  id          uuid        primary key default gen_random_uuid(),
  artist_id   uuid        not null references public.artists(id) on delete cascade,
  filename    text        not null,
  file_type   text        not null,
  file_ext    text        not null,
  file_url    text        not null,
  file_size   bigint,
  status      text        not null default 'uploaded',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint brand_source_files_status_check check (
    status in ('uploaded','processing','processed','failed','stored_only')
  )
);

create table if not exists public.brand_assets (
  id             uuid        primary key default gen_random_uuid(),
  artist_id      uuid        not null references public.artists(id) on delete cascade,
  source_file_id uuid        references public.brand_source_files(id) on delete set null,
  name           text,
  asset_type     text        not null default 'unknown',
  status         text        not null default 'uploaded',
  preview_url    text        not null,
  has_solid_bg   boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint brand_assets_asset_type_check check (
    asset_type in ('logo','wordmark','monogram','favicon','unknown')
  )
);

-- ── Triggers ─────────────────────────────────────────────────────────────────

create or replace trigger set_artists_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

create or replace trigger set_social_links_updated_at
  before update on public.social_links
  for each row execute function public.set_updated_at();

create or replace trigger set_releases_updated_at
  before update on public.releases
  for each row execute function public.set_updated_at();

create or replace trigger set_gigs_updated_at
  before update on public.gigs
  for each row execute function public.set_updated_at();

create or replace trigger set_dj_sets_updated_at
  before update on public.dj_sets
  for each row execute function public.set_updated_at();

create or replace trigger set_videos_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

create or replace trigger set_gallery_images_updated_at
  before update on public.gallery_images
  for each row execute function public.set_updated_at();

create or replace trigger set_custom_domains_updated_at
  before update on public.custom_domains
  for each row execute function public.set_updated_at();

create or replace trigger set_brand_source_files_updated_at
  before update on public.brand_source_files
  for each row execute function public.set_updated_at();

create or replace trigger set_brand_assets_updated_at
  before update on public.brand_assets
  for each row execute function public.set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists artists_handle_idx          on public.artists (handle);
create index if not exists artists_owner_idx           on public.artists (owner_user_id);
create index if not exists social_links_artist_idx     on public.social_links (artist_id);
create index if not exists releases_artist_idx         on public.releases (artist_id);
create index if not exists gigs_artist_idx             on public.gigs (artist_id);
create index if not exists dj_sets_artist_idx          on public.dj_sets (artist_id);
create index if not exists videos_artist_idx           on public.videos (artist_id);
create index if not exists gallery_images_artist_idx   on public.gallery_images (artist_id);
create index if not exists custom_domains_artist_idx   on public.custom_domains (artist_id);
create index if not exists venues_name_idx             on public.venues (name);
create index if not exists brand_source_files_artist_idx on public.brand_source_files (artist_id);
create index if not exists brand_assets_artist_idx     on public.brand_assets (artist_id);
create index if not exists brand_assets_source_idx     on public.brand_assets (source_file_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables

alter table public.artists             enable row level security;
alter table public.social_links        enable row level security;
alter table public.brand_source_files  enable row level security;
alter table public.brand_assets        enable row level security;
alter table public.releases      enable row level security;
alter table public.gigs          enable row level security;
alter table public.dj_sets       enable row level security;
alter table public.videos        enable row level security;
alter table public.gallery_images enable row level security;
alter table public.custom_domains enable row level security;
alter table public.venues        enable row level security;

-- Public read policies (profiles must be published)
drop policy if exists "artists_public_read"       on public.artists;
create policy "artists_public_read"
  on public.artists for select
  using (is_published = true);

drop policy if exists "social_links_public_read"  on public.social_links;
create policy "social_links_public_read"
  on public.social_links for select
  using (exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "releases_public_read"      on public.releases;
create policy "releases_public_read"
  on public.releases for select
  using (exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "gigs_public_read"          on public.gigs;
create policy "gigs_public_read"
  on public.gigs for select
  using (exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "dj_sets_public_read"       on public.dj_sets;
create policy "dj_sets_public_read"
  on public.dj_sets for select
  using (is_published = true and exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "videos_public_read"        on public.videos;
create policy "videos_public_read"
  on public.videos for select
  using (is_published = true and exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "gallery_images_public_read" on public.gallery_images;
create policy "gallery_images_public_read"
  on public.gallery_images for select
  using (exists (select 1 from public.artists a where a.id = artist_id and a.is_published = true));

drop policy if exists "venues_public_read"        on public.venues;
create policy "venues_public_read"
  on public.venues for select using (true);

-- Owner write policies (service role manages via API, so these cover dashboard API auth)
drop policy if exists "artists_owner_all"         on public.artists;
create policy "artists_owner_all"
  on public.artists for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "social_links_owner_all"    on public.social_links;
create policy "social_links_owner_all"
  on public.social_links for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "releases_owner_all"        on public.releases;
create policy "releases_owner_all"
  on public.releases for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "gigs_owner_all"            on public.gigs;
create policy "gigs_owner_all"
  on public.gigs for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "dj_sets_owner_all"         on public.dj_sets;
create policy "dj_sets_owner_all"
  on public.dj_sets for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "videos_owner_all"          on public.videos;
create policy "videos_owner_all"
  on public.videos for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "gallery_images_owner_all"  on public.gallery_images;
create policy "gallery_images_owner_all"
  on public.gallery_images for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "custom_domains_owner_all"  on public.custom_domains;
create policy "custom_domains_owner_all"
  on public.custom_domains for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "brand_source_files_owner_all" on public.brand_source_files;
create policy "brand_source_files_owner_all"
  on public.brand_source_files for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

drop policy if exists "brand_assets_owner_all" on public.brand_assets;
create policy "brand_assets_owner_all"
  on public.brand_assets for all
  using (exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = auth.uid()));

-- ── Storage Buckets ──────────────────────────────────────────────────────────
-- Buckets expected:
--   artist-gallery  (public, images only)
--   artist-heroes   (public, images only)
--   brand-sources   (public, ANY MIME TYPE — no 415 errors for AI/EPS/PDF/ZIP)

-- brand-sources bucket — created via migration 042 or the Storage Management API.
-- allowed_mime_types = null accepts every MIME type.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('brand-sources', 'brand-sources', TRUE, NULL, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for brand-sources (migration 042)
DROP POLICY IF EXISTS "brand_sources_insert" ON storage.objects;
CREATE POLICY "brand_sources_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-sources'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = ((storage.foldername(name))[2])::uuid
        AND a.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "brand_sources_select" ON storage.objects;
CREATE POLICY "brand_sources_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-sources');

DROP POLICY IF EXISTS "brand_sources_delete" ON storage.objects;
CREATE POLICY "brand_sources_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-sources'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = ((storage.foldername(name))[2])::uuid
        AND a.owner_user_id = auth.uid()
    )
  );
