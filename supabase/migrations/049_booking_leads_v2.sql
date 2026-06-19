-- Migration 049: booking_leads v2
-- Adds reference_id, updated_at, trigger, and updates status constraint.

-- ── Sequence for human-friendly reference IDs ─────────────────────────────────

create sequence if not exists booking_lead_ref_seq start 1;

-- ── Add columns ───────────────────────────────────────────────────────────────

alter table public.booking_leads
  add column if not exists reference_id text unique
    default 'DJHQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('booking_lead_ref_seq')::text, 5, '0'),
  add column if not exists updated_at timestamptz null;

-- Backfill any rows still missing reference_id (safety net in case default did not apply)
update public.booking_leads
set reference_id = 'DJHQ-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('booking_lead_ref_seq')::text, 5, '0')
where reference_id is null;

-- Make NOT NULL after backfill
alter table public.booking_leads
  alter column reference_id set not null;

-- ── Update status constraint (add 'confirmed', replace 'converted') ────────────

-- Migrate any existing 'converted' rows before changing constraint
update public.booking_leads set status = 'confirmed' where status = 'converted';

alter table public.booking_leads drop constraint if exists booking_leads_status_check;
alter table public.booking_leads add constraint booking_leads_status_check check (
  status in ('new', 'contacted', 'qualified', 'confirmed', 'declined')
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

drop trigger if exists booking_leads_updated_at on public.booking_leads;
create trigger booking_leads_updated_at
  before update on public.booking_leads
  for each row execute function public.set_updated_at();
