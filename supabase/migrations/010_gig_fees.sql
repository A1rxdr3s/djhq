-- Optional booking fee tracking for gigs.
-- All columns are nullable — existing rows and constraints are unaffected.
alter table public.gigs
  add column fee_amount    numeric(12, 2) null,
  add column fee_currency  text           null,
  add column payment_status text          null;

alter table public.gigs
  add constraint gigs_payment_status_valid check (
    payment_status in ('pending', 'partial', 'paid', 'cancelled')
  );
