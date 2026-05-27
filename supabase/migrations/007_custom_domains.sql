-- Custom domains: maps external hostnames to Pro artist profiles.
-- Phase A: team-managed. No self-serve UI. Middleware uses service role to look up active domains.

create table public.custom_domains (
  id                  uuid        primary key default gen_random_uuid(),
  artist_id           uuid        not null references public.artists(id) on delete cascade,

  domain              text        not null,
  status              text        not null default 'pending',
  verification_token  text        null,
  error_message       text        null,
  verified_at         timestamptz null,
  added_to_vercel_at  timestamptz null,
  removed_at          timestamptz null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint custom_domains_domain_unique unique (domain),
  constraint custom_domains_status_check check (
    status in ('pending', 'verifying', 'verified', 'active', 'error', 'suspended', 'removed')
  ),
  constraint custom_domains_domain_not_empty check (length(trim(domain)) > 0)
);

create trigger set_custom_domains_updated_at
before update on public.custom_domains
for each row
execute function public.set_updated_at();

create index custom_domains_artist_id_idx on public.custom_domains (artist_id);

-- Partial unique index for fast middleware lookups on active domains only.
create unique index custom_domains_active_domain_idx on public.custom_domains (domain)
where status = 'active';

alter table public.custom_domains enable row level security;

-- Middleware uses service role key (bypasses RLS). This policy is for authenticated dashboard reads.
create policy "Artists can read their own custom domains"
on public.custom_domains
for select
to authenticated
using (
  exists (
    select 1
    from public.artists
    where artists.id = custom_domains.artist_id
      and artists.owner_user_id = auth.uid()
  )
);
