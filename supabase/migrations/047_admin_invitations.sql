-- Admin invitations table
-- Stores platform invitations created by platform admins.
-- Queried server-side via service role only (RLS enabled, no public policies).

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

-- Indexes
create index if not exists admin_invitations_email_idx  on public.admin_invitations (email);
create index if not exists admin_invitations_token_idx  on public.admin_invitations (token);
create index if not exists admin_invitations_status_idx on public.admin_invitations (status);

-- RLS: enabled but no public policies — only service role can access
alter table public.admin_invitations enable row level security;
