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

  -- Search & Share (SEO) — migration 068
  seo_title               text        null,
  seo_description         text        null,
  seo_canonical_url       text        null,
  seo_og_title            text        null,
  seo_og_description      text        null,
  seo_og_image_url        text        null,
  seo_twitter_image_url   text        null,
  seo_robots              text        null check (seo_robots is null or seo_robots in ('index,follow', 'noindex,nofollow')),

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
  event_name        text        null,
  -- Visibility system (045): controls public display of private bookings
  visibility_status text        not null default 'announced'
    check (visibility_status in ('announced', 'tba', 'tbc', 'cancelled')),
  -- Soft delete (046): null = active, non-null = deleted (preserved in DB)
  deleted_at  timestamptz null    default null,
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
  variant        text        not null default 'original',
  source_page    integer     null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint brand_assets_asset_type_check check (
    asset_type in ('logo','wordmark','monogram','favicon','unknown')
  )
);

-- Migration 043 columns (idempotent)
alter table public.brand_assets add column if not exists variant     text    not null default 'original';
alter table public.brand_assets add column if not exists source_page integer null;

-- Brand asset assignments (migration 044)
create table if not exists public.brand_asset_assignments (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artists(id) on delete cascade,
  assignment_type text        not null,
  brand_asset_id  uuid        not null references public.brand_assets(id) on delete cascade,
  variant         text        not null default 'original',
  variant_url     text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint brand_asset_assignments_type_check check (
    assignment_type in ('hero_logo','footer_logo','favicon','press_kit_logo','social_avatar')
  ),
  constraint brand_asset_assignments_unique unique (artist_id, assignment_type)
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

create or replace trigger set_brand_asset_assignments_updated_at
  before update on public.brand_asset_assignments
  for each row execute function public.set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists artists_handle_idx          on public.artists (handle);
create index if not exists artists_owner_idx           on public.artists (owner_user_id);
create index if not exists social_links_artist_idx     on public.social_links (artist_id);
create index if not exists releases_artist_idx         on public.releases (artist_id);
create index if not exists gigs_artist_idx          on public.gigs (artist_id);
create index if not exists gigs_global_venue_id_idx on public.gigs (global_venue_id);
create index if not exists dj_sets_artist_idx          on public.dj_sets (artist_id);
create index if not exists videos_artist_idx           on public.videos (artist_id);
create index if not exists gallery_images_artist_idx   on public.gallery_images (artist_id);
create index if not exists venues_name_idx             on public.venues (name);
create index if not exists brand_source_files_artist_idx on public.brand_source_files (artist_id);
create index if not exists brand_assets_artist_idx     on public.brand_assets (artist_id);
create index if not exists brand_assets_source_idx     on public.brand_assets (source_file_id);
create index if not exists brand_asset_assignments_artist_idx         on public.brand_asset_assignments (artist_id);
create index if not exists brand_asset_assignments_brand_asset_id_idx on public.brand_asset_assignments (brand_asset_id);

-- ── Admin Invitations ────────────────────────────────────────────────────────

create table if not exists public.admin_invitations (
  id                  uuid          primary key default gen_random_uuid(),
  email               text          not null,
  role                text          not null default 'artist_owner',
  artist_id           uuid          null references public.artists(id) on delete set null,
  status              text          not null default 'pending',
  token               text          not null unique,
  invite_url          text          null,
  note                text          null,
  license_duration    text          not null default 'one_year',
  license_expires_at  timestamptz   null,
  created_by          text          not null,
  created_at          timestamptz   not null default now(),
  accepted_at         timestamptz   null,
  revoked_at          timestamptz   null,
  expires_at          timestamptz   null,

  constraint admin_invitations_role_check check (
    role in ('platform_admin', 'support', 'artist_owner', 'artist_editor', 'viewer')
  ),
  constraint admin_invitations_status_check check (
    status in ('pending', 'accepted', 'expired', 'revoked')
  ),
  constraint admin_invitations_license_duration_check check (
    license_duration in ('one_month', 'three_months', 'six_months', 'one_year', 'lifetime')
  )
);

create index if not exists admin_invitations_email_idx     on public.admin_invitations (email);
create index if not exists admin_invitations_token_idx     on public.admin_invitations (token);
create index if not exists admin_invitations_status_idx    on public.admin_invitations (status);
create index if not exists admin_invitations_artist_id_idx on public.admin_invitations (artist_id);

-- ── booking_leads ─────────────────────────────────────────────────────────────

create sequence if not exists booking_lead_ref_seq start 1;

create table if not exists public.booking_leads (
  id                        uuid        primary key default gen_random_uuid(),
  artist_id                 uuid        not null references public.artists(id) on delete cascade,
  artist_handle             text        not null,
  full_name                 text        not null,
  email                     text        not null,
  phone                     text        null,
  city                      text        not null,
  event_date                date        not null,
  venue_or_promoter         text        not null,
  event_details             text        not null,
  reference_id              text        unique not null
    default 'DJHQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('booking_lead_ref_seq')::text, 5, '0'),
  status                    text        not null default 'new',
  email_delivery_status     text        not null default 'pending',
  email_provider            text        null,
  email_provider_message_id text        null,
  email_error               text        null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz null,

  constraint booking_leads_status_check check (
    status in ('new', 'contacted', 'qualified', 'confirmed', 'declined')
  ),
  constraint booking_leads_email_delivery_status_check check (
    email_delivery_status in ('pending', 'sent', 'failed')
  )
);

create index if not exists booking_leads_artist_id_idx  on public.booking_leads (artist_id);
create index if not exists booking_leads_created_at_idx on public.booking_leads (created_at desc);

create or replace trigger booking_leads_updated_at
  before update on public.booking_leads
  for each row execute function public.set_updated_at();

-- ── artist_tours ───────────────────────────────────────────────────────────────
-- Tour Planner v1: named date-range tour plans. Shows resolved dynamically from gigs.

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

-- ── artist_tour_stays ────────────────────────────────────────────────────────
-- Per-tour city stay ranges. starts_on…ends_on inclusive. Two stays may overlap
-- on a transition day; the calendar renders split-color cells for those dates.

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

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables

alter table public.artists             enable row level security;
alter table public.admin_invitations   enable row level security;
alter table public.booking_leads       enable row level security;
alter table public.artist_tours        enable row level security;
alter table public.social_links        enable row level security;
alter table public.brand_source_files  enable row level security;
alter table public.brand_assets        enable row level security;
alter table public.brand_asset_assignments enable row level security;
alter table public.releases      enable row level security;
alter table public.gigs          enable row level security;
alter table public.dj_sets       enable row level security;
alter table public.videos        enable row level security;
alter table public.gallery_images enable row level security;
alter table public.custom_domains enable row level security;
alter table public.venues              enable row level security;
alter table public.artist_tour_stays   enable row level security;

-- ── RLS Policies ─────────────────────────────────────────────────────────────
-- Consolidated: one SELECT policy per table (public OR owner) + explicit write
-- policies per operation. auth.uid() / auth.role() wrapped in (select ...) so
-- the planner evaluates them once per query (not once per row).

-- venues: fully public
drop policy if exists "venues_public_read" on public.venues;
create policy "venues_public_read"
  on public.venues for select using (true);

-- artists
drop policy if exists "Public can read published artists" on public.artists; -- migration 001 original name
drop policy if exists "artists_public_read"   on public.artists;
drop policy if exists "artists_owner_all"      on public.artists;
drop policy if exists "artists_select"         on public.artists;
drop policy if exists "artists_user_select"    on public.artists;
drop policy if exists "artists_owner_insert"   on public.artists;
drop policy if exists "artists_user_insert"    on public.artists;
drop policy if exists "artists_owner_update"   on public.artists;
drop policy if exists "artists_user_update"    on public.artists;
drop policy if exists "artists_owner_delete"   on public.artists;
drop policy if exists "artists_user_delete"    on public.artists;

create policy "artists_select"
  on public.artists for select
  using (
    is_published = true
    or owner_user_id = (select auth.uid())
  );

create policy "artists_owner_insert"
  on public.artists for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "artists_owner_update"
  on public.artists for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "artists_owner_delete"
  on public.artists for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- social_links
drop policy if exists "Public can read links for published artists" on public.social_links; -- migration 001 original name
drop policy if exists "social_links_public_read"    on public.social_links;
drop policy if exists "social_links_owner_all"       on public.social_links;
drop policy if exists "social_links_select"          on public.social_links;
drop policy if exists "social_links_user_select"     on public.social_links;
drop policy if exists "social_links_owner_insert"    on public.social_links;
drop policy if exists "social_links_user_insert"     on public.social_links;
drop policy if exists "social_links_owner_update"    on public.social_links;
drop policy if exists "social_links_user_update"     on public.social_links;
drop policy if exists "social_links_owner_delete"    on public.social_links;
drop policy if exists "social_links_user_delete"     on public.social_links;

create policy "social_links_select"
  on public.social_links for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "social_links_owner_insert"
  on public.social_links for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "social_links_owner_update"
  on public.social_links for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "social_links_owner_delete"
  on public.social_links for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- releases
drop policy if exists "Public can read releases for published artists" on public.releases; -- migration 001 original name
drop policy if exists "releases_public_read"  on public.releases;
drop policy if exists "releases_owner_all"     on public.releases;
drop policy if exists "releases_select"        on public.releases;
drop policy if exists "releases_user_select"   on public.releases;
drop policy if exists "releases_owner_insert"  on public.releases;
drop policy if exists "releases_user_insert"   on public.releases;
drop policy if exists "releases_owner_update"  on public.releases;
drop policy if exists "releases_user_update"   on public.releases;
drop policy if exists "releases_owner_delete"  on public.releases;
drop policy if exists "releases_user_delete"   on public.releases;

create policy "releases_select"
  on public.releases for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "releases_owner_insert"
  on public.releases for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "releases_owner_update"
  on public.releases for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "releases_owner_delete"
  on public.releases for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- gigs
drop policy if exists "Public can read gigs for published artists" on public.gigs; -- migration 001 original name
drop policy if exists "gigs_public_read"  on public.gigs;
drop policy if exists "gigs_owner_all"    on public.gigs;
drop policy if exists "gigs_select"       on public.gigs;
drop policy if exists "gigs_user_select"  on public.gigs;
drop policy if exists "gigs_owner_insert" on public.gigs;
drop policy if exists "gigs_user_insert"  on public.gigs;
drop policy if exists "gigs_owner_update" on public.gigs;
drop policy if exists "gigs_user_update"  on public.gigs;
drop policy if exists "gigs_owner_delete" on public.gigs;
drop policy if exists "gigs_user_delete"  on public.gigs;

create policy "gigs_select"
  on public.gigs for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "gigs_owner_insert"
  on public.gigs for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "gigs_owner_update"
  on public.gigs for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "gigs_owner_delete"
  on public.gigs for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- dj_sets (own is_published column — public read requires both set and artist published)
drop policy if exists "Public can read published dj sets for published artists" on public.dj_sets; -- migration 005 original name
drop policy if exists "dj_sets_public_read"  on public.dj_sets;
drop policy if exists "dj_sets_owner_all"    on public.dj_sets;
drop policy if exists "dj_sets_select"       on public.dj_sets;
drop policy if exists "dj_sets_user_select"  on public.dj_sets;
drop policy if exists "dj_sets_owner_insert" on public.dj_sets;
drop policy if exists "dj_sets_user_insert"  on public.dj_sets;
drop policy if exists "dj_sets_owner_update" on public.dj_sets;
drop policy if exists "dj_sets_user_update"  on public.dj_sets;
drop policy if exists "dj_sets_owner_delete" on public.dj_sets;
drop policy if exists "dj_sets_user_delete"  on public.dj_sets;

create policy "dj_sets_select"
  on public.dj_sets for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (dj_sets.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "dj_sets_owner_insert"
  on public.dj_sets for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "dj_sets_owner_update"
  on public.dj_sets for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "dj_sets_owner_delete"
  on public.dj_sets for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- videos (own is_published column — public read requires both video and artist published)
drop policy if exists "Public can read published videos for published artists" on public.videos; -- migration 006 original name
drop policy if exists "videos_public_read"  on public.videos;
drop policy if exists "videos_owner_all"    on public.videos;
drop policy if exists "videos_select"       on public.videos;
drop policy if exists "videos_user_select"  on public.videos;
drop policy if exists "videos_owner_insert" on public.videos;
drop policy if exists "videos_user_insert"  on public.videos;
drop policy if exists "videos_owner_update" on public.videos;
drop policy if exists "videos_user_update"  on public.videos;
drop policy if exists "videos_owner_delete" on public.videos;
drop policy if exists "videos_user_delete"  on public.videos;

create policy "videos_select"
  on public.videos for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (videos.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "videos_owner_insert"
  on public.videos for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "videos_owner_update"
  on public.videos for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "videos_owner_delete"
  on public.videos for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- gallery_images
drop policy if exists "Public can read gallery images for published artists" on public.gallery_images; -- migration 001 original name
drop policy if exists "gallery_images_public_read"   on public.gallery_images;
drop policy if exists "gallery_images_owner_all"      on public.gallery_images;
drop policy if exists "gallery_images_select"         on public.gallery_images;
drop policy if exists "gallery_images_user_select"    on public.gallery_images;
drop policy if exists "gallery_images_owner_insert"   on public.gallery_images;
drop policy if exists "gallery_images_user_insert"    on public.gallery_images;
drop policy if exists "gallery_images_owner_update"   on public.gallery_images;
drop policy if exists "gallery_images_user_update"    on public.gallery_images;
drop policy if exists "gallery_images_owner_delete"   on public.gallery_images;
drop policy if exists "gallery_images_user_delete"    on public.gallery_images;

create policy "gallery_images_select"
  on public.gallery_images for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "gallery_images_owner_insert"
  on public.gallery_images for insert
  to authenticated
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "gallery_images_owner_update"
  on public.gallery_images for update
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "gallery_images_owner_delete"
  on public.gallery_images for delete
  to authenticated
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- custom_domains
-- "Artists can read their own custom domains" (migration 007) is redundant with
-- custom_domains_owner_all — identical SELECT logic. Drop the duplicate.
drop policy if exists "Artists can read their own custom domains" on public.custom_domains;
drop policy if exists "custom_domains_owner_all"                  on public.custom_domains;

create policy "custom_domains_owner_all"
  on public.custom_domains for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- brand_source_files
drop policy if exists "brand_source_files_owner_all" on public.brand_source_files;

create policy "brand_source_files_owner_all"
  on public.brand_source_files for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- brand_assets
drop policy if exists "brand_assets_owner_all" on public.brand_assets;

create policy "brand_assets_owner_all"
  on public.brand_assets for all
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.owner_user_id = (select auth.uid())
    )
  );

-- brand_asset_assignments
drop policy if exists "brand_asset_assignments_public_read" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_all"   on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_select"       on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_insert" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_update" on public.brand_asset_assignments;
drop policy if exists "brand_asset_assignments_owner_delete" on public.brand_asset_assignments;

create policy "brand_asset_assignments_select"
  on public.brand_asset_assignments for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (a.is_published = true or a.owner_user_id = (select auth.uid()))
    )
  );

create policy "brand_asset_assignments_owner_insert"
  on public.brand_asset_assignments for insert
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "brand_asset_assignments_owner_update"
  on public.brand_asset_assignments for update
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "brand_asset_assignments_owner_delete"
  on public.brand_asset_assignments for delete
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- artist_tours (own is_published column — public read requires both tour and artist published)
drop policy if exists "artist_tours_public_read"  on public.artist_tours;
drop policy if exists "artist_tours_owner_all"    on public.artist_tours;
drop policy if exists "artist_tours_select"       on public.artist_tours;
drop policy if exists "artist_tours_owner_insert" on public.artist_tours;
drop policy if exists "artist_tours_owner_update" on public.artist_tours;
drop policy if exists "artist_tours_owner_delete" on public.artist_tours;

create policy "artist_tours_select"
  on public.artist_tours for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and (
          (artist_tours.is_published = true and a.is_published = true)
          or a.owner_user_id = (select auth.uid())
        )
    )
  );

create policy "artist_tours_owner_insert"
  on public.artist_tours for insert
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "artist_tours_owner_update"
  on public.artist_tours for update
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "artist_tours_owner_delete"
  on public.artist_tours for delete
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- artist_tour_stays
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
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "artist_tour_stays_owner_update"
  on public.artist_tour_stays for update
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

create policy "artist_tour_stays_owner_delete"
  on public.artist_tour_stays for delete
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- ── artist_career_timeline ───────────────────────────────────────────────────
create table if not exists public.artist_career_timeline (
  id                  uuid        primary key default gen_random_uuid(),
  artist_id           uuid        not null references public.artists(id) on delete cascade,
  title               text        not null,
  category            text        not null default 'other',
  event_date          date        not null,
  location            text,
  description         text,
  link                text,
  image_url           text,
  is_featured         boolean     not null default false,
  preview_image_url   text,
  is_published        boolean     not null default true,
  sort_order          integer,
  layout_size         text        check (layout_size is null or layout_size in ('hero', 'tall', 'wide', 'compact')),
  story_slot          text        check (story_slot is null or story_slot in ('left-tall-story', 'top-feature-primary', 'top-feature-secondary', 'right-top', 'right-bottom', 'compact-a', 'compact-b', 'bottom-left', 'bottom-right', 'hero', 'wide-bottom')),
  show_in_collapsed   boolean     not null default true,
  image_focal_x       smallint    not null default 50 check (image_focal_x between 0 and 100),
  image_focal_y       smallint    not null default 50 check (image_focal_y between 0 and 100),
  image_object_fit    text        not null default 'cover' check (image_object_fit in ('cover', 'contain')),
  image_zoom          real        not null default 1.0 check (image_zoom between 1.0 and 3.0),
  image_treatment     text        not null default 'cover' check (image_treatment in ('cover', 'contain', 'blurred-fill', 'text-only')),
  description_mode    text        not null default 'auto' check (description_mode in ('auto', 'full', 'short', 'minimal', 'hidden')),
  metadata_overlay_mode text      not null default 'auto' check (metadata_overlay_mode in ('auto', 'full', 'compact', 'minimal', 'hidden')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists artist_career_timeline_artist_id_idx on public.artist_career_timeline (artist_id);
create index if not exists artist_career_timeline_artist_date_idx on public.artist_career_timeline (artist_id, event_date desc);
create index if not exists artist_career_timeline_featured_idx on public.artist_career_timeline (artist_id, sort_order) where is_featured = true;
alter table public.artist_career_timeline enable row level security;

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
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );
create policy "artist_career_timeline_owner_update"
  on public.artist_career_timeline for update
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );
create policy "artist_career_timeline_owner_delete"
  on public.artist_career_timeline for delete
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

-- ── artist_subscribers ───────────────────────────────────────────────────────
-- Audience capture from public "Stay Connected" footer form (migration 069).
create table if not exists public.artist_subscribers (
  id               uuid        primary key default gen_random_uuid(),
  artist_id        uuid        not null references public.artists(id) on delete cascade,
  email            text        not null,
  normalized_email text        not null,
  status           text        not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed')),
  source           text        not null default 'footer'
    check (source in ('footer', 'presskit', 'api')),
  source_url       text        null,
  ip_hash          text        null,
  user_agent       text        null,
  subscribed_at    timestamptz not null default now(),
  unsubscribed_at  timestamptz null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint artist_subscribers_unique_email unique (artist_id, normalized_email)
);
create index if not exists artist_subscribers_artist_id_idx on public.artist_subscribers (artist_id);
create index if not exists artist_subscribers_status_idx on public.artist_subscribers (artist_id, status);
create index if not exists artist_subscribers_subscribed_at_idx on public.artist_subscribers (artist_id, subscribed_at desc);
alter table public.artist_subscribers enable row level security;
drop policy if exists "artist_subscribers_owner_select" on public.artist_subscribers;
create policy "artist_subscribers_owner_select"
  on public.artist_subscribers for select
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.owner_user_id = (select auth.uid()))
  );

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

-- Storage RLS policies for brand-sources (migration 042, optimized in 051)
DROP POLICY IF EXISTS "brand_sources_insert" ON storage.objects;
CREATE POLICY "brand_sources_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-sources'
    AND (select auth.role()) = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = ((storage.foldername(name))[2])::uuid
        AND a.owner_user_id = (select auth.uid())
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
    AND (select auth.role()) = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = ((storage.foldername(name))[2])::uuid
        AND a.owner_user_id = (select auth.uid())
    )
  );
