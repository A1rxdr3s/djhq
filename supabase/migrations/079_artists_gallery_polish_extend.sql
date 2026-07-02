-- Migration 079: extend gallery_polish to support medium and strong
-- Drops the old two-value check and replaces it with the four-value version.
-- Existing rows with null / 'off' / 'soft' remain valid unchanged.

alter table public.artists
  drop constraint if exists artists_gallery_polish_check;

alter table public.artists
  add constraint artists_gallery_polish_check
    check (gallery_polish is null or gallery_polish in ('off', 'soft', 'medium', 'strong'));
