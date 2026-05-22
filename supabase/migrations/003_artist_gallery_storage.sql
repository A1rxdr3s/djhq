-- 003_artist_gallery_storage.sql
-- MVP gallery image storage bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-gallery',
  'artist-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
