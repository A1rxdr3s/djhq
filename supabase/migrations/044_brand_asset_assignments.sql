-- Brand asset assignments: one assignment per artist per role
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

create index if not exists brand_asset_assignments_artist_idx
  on public.brand_asset_assignments (artist_id);

alter table public.brand_asset_assignments enable row level security;

drop policy if exists "brand_asset_assignments_owner_all" on public.brand_asset_assignments;
create policy "brand_asset_assignments_owner_all"
  on public.brand_asset_assignments for all
  using (exists (
    select 1 from public.artists a
    where a.id = artist_id and a.owner_user_id = auth.uid()
  ));

drop policy if exists "brand_asset_assignments_public_read" on public.brand_asset_assignments;
create policy "brand_asset_assignments_public_read"
  on public.brand_asset_assignments for select
  using (exists (
    select 1 from public.artists a
    where a.id = artist_id and a.is_published = true
  ));

create or replace trigger set_brand_asset_assignments_updated_at
  before update on public.brand_asset_assignments
  for each row execute function public.set_updated_at();
