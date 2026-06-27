-- ── 068 — artists: add SEO and social-share metadata fields ──────────────────
--
-- Adds per-artist SEO config for public artist profile pages.
-- All fields are nullable — existing artists are unaffected and fall back
-- through the documented chain resolved at render time (not stored).
--
-- Fallback order (see generateMetadata in app/[handle]/page.tsx):
--   seo_title            → browser_title → artist_name
--   seo_description      → short_bio → generic fallback
--   seo_canonical_url    → active custom domain → /[handle] route
--   seo_og_title         → seo_title → browser_title → artist_name
--   seo_og_description   → seo_description → short_bio
--   seo_og_image_url     → hero_image_url
--   seo_twitter_image_url → seo_og_image_url → hero_image_url
--   seo_robots           → 'index,follow'

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS seo_title             text null,
  ADD COLUMN IF NOT EXISTS seo_description       text null,
  ADD COLUMN IF NOT EXISTS seo_canonical_url     text null,
  ADD COLUMN IF NOT EXISTS seo_og_title          text null,
  ADD COLUMN IF NOT EXISTS seo_og_description    text null,
  ADD COLUMN IF NOT EXISTS seo_og_image_url      text null,
  ADD COLUMN IF NOT EXISTS seo_twitter_image_url text null,
  ADD COLUMN IF NOT EXISTS seo_robots            text null
    CHECK (seo_robots IS NULL OR seo_robots IN ('index,follow', 'noindex,nofollow'));
