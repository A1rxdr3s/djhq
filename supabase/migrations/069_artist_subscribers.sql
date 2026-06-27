-- ── 069 — artist_subscribers: audience capture from public footer ─────────────
-- Stores emails collected via the "Stay Connected" signup form on public artist
-- profiles. Duplicate signups are idempotent (unique on artist_id + normalized_email).

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

create index if not exists artist_subscribers_artist_id_idx
  on public.artist_subscribers (artist_id);

create index if not exists artist_subscribers_status_idx
  on public.artist_subscribers (artist_id, status);

create index if not exists artist_subscribers_subscribed_at_idx
  on public.artist_subscribers (artist_id, subscribed_at desc);

alter table public.artist_subscribers enable row level security;

-- Admin client (service role key) bypasses RLS and handles all public writes.
-- Server client (session cookie) respects this policy for authenticated HQ reads.
drop policy if exists "artist_subscribers_owner_select" on public.artist_subscribers;
create policy "artist_subscribers_owner_select"
  on public.artist_subscribers for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.owner_user_id = (select auth.uid())
    )
  );
