-- Footer branding fields: artist-configurable footer identity, social/newsletter toggles
alter table public.artists
  add column if not exists footer_logo_url          text,
  add column if not exists footer_logo_width         integer not null default 180,
  add column if not exists footer_booking_email      text,
  add column if not exists footer_newsletter_enabled boolean not null default true,
  add column if not exists footer_socials_enabled    boolean not null default true,
  add column if not exists footer_copyright          text;
