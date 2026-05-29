-- Add club/room name and public event status to gigs.
-- club_venue: optional physical venue or room name (e.g. "OVO Club", "Club Room")
-- event_status: optional public-facing status override for the show card

alter table public.gigs
  add column club_venue  text null,
  add column event_status text null;

alter table public.gigs
  add constraint gigs_event_status_valid
  check (
    event_status is null
    or event_status in ('upcoming', 'sold_out', 'cancelled', 'past')
  );
