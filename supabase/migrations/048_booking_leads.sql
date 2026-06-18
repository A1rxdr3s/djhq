-- Migration 048: booking_leads
-- Persists booking inquiries submitted via the public artist profile.
-- Records are inserted by the API route server-side (service role).
-- RLS enabled with no public policies — readable by service role only.

create table if not exists public.booking_leads (
  id                uuid        primary key default gen_random_uuid(),
  artist_id         uuid        not null references public.artists(id) on delete cascade,
  artist_handle     text        not null,
  full_name         text        not null,
  email             text        not null,
  phone             text        null,
  city              text        not null,
  event_date        date        not null,
  venue_or_promoter text        not null,
  event_details     text        not null,
  status            text        not null default 'new',
  created_at        timestamptz not null default now(),

  constraint booking_leads_status_check check (
    status in ('new', 'contacted', 'qualified', 'declined', 'converted')
  )
);

create index if not exists booking_leads_artist_id_idx  on public.booking_leads (artist_id);
create index if not exists booking_leads_created_at_idx on public.booking_leads (created_at desc);

alter table public.booking_leads enable row level security;
