-- Add structured performance metadata to videos table.
-- The existing `title` column remains as a fallback for records created before this migration.
-- If video_artists or video_event are present, the display title is generated on the fly;
-- otherwise the stored title is used.

alter table public.videos
  add column video_artists  text[]  not null default '{}',
  add column video_event    text,
  add column video_city     text,
  add column video_country  text;
