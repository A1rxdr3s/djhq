-- Additional footer contact email fields: contact and demos
alter table public.artists
  add column if not exists footer_contact_email text,
  add column if not exists footer_demos_email   text;
