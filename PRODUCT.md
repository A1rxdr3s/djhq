# Product

## Register

product

## Users

Professional DJs and electronic music artists. They tour regularly, release music on Beatport/Spotify/SoundCloud, and need a professional online presence to attract bookings. They open the product infrequently — typically before/after a show, when releasing music, or when a promoter asks for their press kit. They are not engineers or designers; they want the result (a professional profile and press kit), not the process of building it. Secondary users are bookers and promoters who land on the public artist profile from a booking inquiry.

## Product Purpose

DJHQ is an Artist Operating System — a platform that gives DJs a professional public profile, press kit, booking contact, and content catalog under one URL. It handles what would otherwise require 5–10 separate tools: a website builder, EPK tool, social aggregator, booking form, and CMS. Success looks like: a DJ lands a booking because a promoter found their DJHQ profile and pressed the booking button.

The product has two surfaces:
- **Public profile** (`/[handle]`): what bookers and fans see. Brand register. Cinematic, artist-first, full-bleed hero.
- **Dashboard** (`/dashboard`): what the artist manages. Product register. Their operating system — not an admin panel.

## Brand Personality

Raw. Cinematic. Confident.

The brand sits in the space between a touring artist's backstage and their public poster. Dark backgrounds, green accent (DJHQ Matrix: `oklch(0.75 0.18 160)`), editorial photography. The tone is professional without being corporate, personal without being casual.

Voice for the dashboard: direct, functional, artist-facing. No jargon, no "empower your journey" copy. Speak to a professional.

Voice for the public profile: no copy at all — the artist's image, logo, and catalog speak.

## Anti-references

- Linktree, Komi, Beacons: link aggregators dressed as profiles
- WordPress admin, phpMyAdmin, generic Bootstrap templates: admin-panel feel
- Firebase console: generic SaaS scaffolding with no personality
- Squarespace "DJ template": generic performer look with stock imagery
- Beatport artist pages (2018-era): metadata-heavy, no visual identity
- Any dashboard with fake analytics, placeholder charts, or "coming soon" widgets

## Design Principles

1. **Artist first, platform second.** The public profile belongs entirely to the artist. DJHQ branding is a whisper, not a frame. Every design decision should ask: does this make the artist look more professional, or does it make the platform look more present?

2. **Useful or invisible.** Every element on the dashboard must answer one of four questions: What is my next show? Is my profile healthy? What changed recently? What should I do next? Anything that doesn't answer one of those questions should be removed or made smaller.

3. **Status, not records.** The dashboard is a cockpit, not a database viewer. Show state (live, connected, published, scheduled) rather than records (here is a table of your shows). Forms and CRUD live in the sidebar sections; the Home screen shows health.

4. **Freshness over permanence.** Information that doesn't change (a completed setup checklist) should disappear or collapse. Information that changes over time (next show countdown, content freshness, latest addition) should be prominent. The dashboard should feel alive, not static.

5. **No fake metrics.** Never show analytics, view counts, or performance data that isn't instrumented. Show what is real: show count, release count, profile status, domain status. When analytics become available, label them clearly as real data.

## Accessibility & Inclusion

WCAG AA minimum. Text contrast at ≥4.5:1 for body, ≥3:1 for large text. The dark theme is the product default — all contrast checks must pass against the dark background (`oklch(0.08 0 0)`). Reduced motion respected via `prefers-reduced-motion`. The public profile uses full-viewport hero images; these are decorative and do not carry essential information.
