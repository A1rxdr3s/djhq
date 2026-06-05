-- Brand asset management: source files and processed logo assets
-- Source files = raw uploaded brand packages (ZIP, PDF, AI, SVG, PNG…)
-- Brand assets = usable logo images extracted/registered from source files

create table if not exists public.brand_source_files (
  id          uuid        primary key default gen_random_uuid(),
  artist_id   uuid        not null references public.artists(id) on delete cascade,
  filename    text        not null,
  file_type   text        not null,   -- mime type
  file_ext    text        not null,   -- lowercase extension without dot: svg, png, pdf…
  file_url    text        not null,
  file_size   bigint,
  status      text        not null default 'uploaded',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint brand_source_files_status_check check (
    status in ('uploaded', 'processing', 'processed', 'failed', 'stored_only')
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
    asset_type in ('logo', 'wordmark', 'monogram', 'favicon', 'unknown')
  )
);

-- Triggers
create or replace trigger set_brand_source_files_updated_at
  before update on public.brand_source_files
  for each row execute function public.set_updated_at();

create or replace trigger set_brand_assets_updated_at
  before update on public.brand_assets
  for each row execute function public.set_updated_at();

-- Indexes
create index if not exists brand_source_files_artist_idx on public.brand_source_files (artist_id);
create index if not exists brand_assets_artist_idx       on public.brand_assets (artist_id);
create index if not exists brand_assets_source_idx       on public.brand_assets (source_file_id);

-- RLS
alter table public.brand_source_files enable row level security;
alter table public.brand_assets        enable row level security;

drop policy if exists "brand_source_files_owner_all" on public.brand_source_files;
create policy "brand_source_files_owner_all"
  on public.brand_source_files for all
  using (exists (
    select 1 from public.artists a
    where a.id = artist_id and a.owner_user_id = auth.uid()
  ));

drop policy if exists "brand_assets_owner_all" on public.brand_assets;
create policy "brand_assets_owner_all"
  on public.brand_assets for all
  using (exists (
    select 1 from public.artists a
    where a.id = artist_id and a.owner_user_id = auth.uid()
  ));

-- Storage: files are uploaded to the existing artist-gallery bucket under artists/{id}/brand/
-- Bucket itself is already configured; no additional bucket creation needed.
