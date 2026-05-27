# DJHQ Architecture

# Stack

Frontend:
- Next.js App Router
- TypeScript
- Tailwind CSS

Backend:
- Supabase

Deployment:
- Vercel

---

# Main Product Areas

## Public Artist Profile

Route:
- /[handle]

Purpose:
- artist identity
- release promotion
- booking conversion
- EPK presentation

Sections:
- Hero
- Featured Release
- Selected Releases
- Upcoming Gigs
- Press Photos
- Booking CTA

---

# Releases System

Table:
- releases

Supports:
- multiple releases per artist

Important fields:
- title
- label
- release_date
- artwork_url
- platform_url
- type
- sort_order
- is_featured

---

# Featured Release

Purpose:
- primary spotlight release

Rules:
- only one featured release per artist
- stronger hierarchy
- more visual emphasis

Query:
- is_featured = true

---

# Selected Releases

Purpose:
- supporting release catalog

Rules:
- horizontal carousel
- lighter hierarchy than featured release
- artwork-first presentation

Query:
- is_featured = false

Ordering:
- sort_order
- release_date

---

# Spotify Metadata Import

Purpose:
- import public release metadata

Flow:
- Spotify URL pasted
- metadata fetched from:
  - spotify.link
  - Spotify oEmbed
  - Open Graph fallback

Imported:
- title
- artwork
- type
- partial metadata

Used in:
- Featured Release
- Selected Releases

---

# Dashboard

Purpose:
- artist self-management

Current capabilities:
- edit artist profile
- manage featured release
- manage selected releases
- manage gigs
- manage booking data

Important:
Dashboard UX should remain functional and clean, but public profile quality has priority.

---

# Subscription Plans

Field: `artists.plan` — values: `"free"` | `"pro"`

Free: canonical profile at `/[handle]` only.
Pro: canonical profile + optional custom domain.

Pro-gated features in the dashboard show an upsell card for free users instead of the feature UI.

---

# Custom Domains

Status: Phase A implemented (manual team management).

## Database

Table: `custom_domains`

Key fields:
- `id` UUID PK
- `artist_id` UUID FK → artists
- `domain` TEXT UNIQUE (e.g. `"artistdomain.com"`)
- `status` TEXT — `pending | verified | active | error | suspended | removed`
- `verification_token` TEXT
- `verified_at`, `added_to_vercel_at`, `removed_at` TIMESTAMPTZ
- `error_message` TEXT

Index on `(domain)` where `status = 'active'` for fast middleware lookups.

## Routing

File: `middleware.ts` at project root (does not exist yet in Phase A — create it when implementing).

Logic:
1. Read `Host` header from incoming request.
2. If host is a DJHQ-owned domain → pass through unchanged.
3. Otherwise: query `custom_domains` joined with `artists` where `domain = host AND status = 'active'`.
4. If found and artist is published and plan is Pro: rewrite request internally to `/[handle]`.
5. Otherwise: redirect to `djhq.com`.

The canonical `/[handle]` route is never modified and always works independently.

## Phase A (current)

- Domains manually added by DJHQ team in Vercel project settings.
- Team inserts rows into `custom_domains` with `status = 'active'`.
- No dashboard UI for domain management.
- Dashboard shows a read-only "Custom Domain" section for Pro users.

## Phase B (future)

- Self-serve dashboard UI: add, verify, remove custom domain.
- Vercel API integration for programmatic domain registration.
- Automated DNS TXT verification flow.
- New env vars required: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.

---

# Current Product Priorities

## High priority
- editorial UX
- premium atmosphere
- release presentation
- responsive polish
- conversion clarity

## Medium priority
- dashboard refinement
- component cleanup
- reusable rendering patterns

## Low priority
- aggressive abstraction
- complex animation systems
- dependency expansion

---

# Important Technical Rules

## Reuse patterns
Do not duplicate rendering logic unnecessarily.

## Keep architecture stable
Avoid major refactors unless requested.

## Preserve maintainability
Keep files readable and understandable.

## Avoid overengineering
Simple solutions preferred.

---

# Rendering Philosophy

Prefer:
- conditional rendering
- lightweight composition
- restrained abstraction

Avoid:
- unnecessary wrapper components
- excessive global systems
- over-generalized UI primitives

---

# Current UX Goal

DJHQ should evolve into:
- a premium artist platform
- a cinematic electronic music EPK
- a visually immersive release presentation system

without becoming:
- a generic SaaS
- a dashboard product
- a template-driven UI