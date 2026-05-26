# DJHQ Context

DJHQ is a cinematic electronic music EPK / artist profile platform.

The product is designed for:
- DJs
- electronic music artists
- promoters
- labels
- agencies
- club culture

The experience should feel closer to:
- an editorial artist microsite
- a premium music campaign page
- a cinematic EPK
- a modern electronic music identity platform

NOT:
- a SaaS dashboard
- Linktree
- a template marketplace
- a generic admin UI

---

# Core Product Direction

DJHQ combines:
- public artist profiles
- EPK functionality
- release promotion
- booking conversion
- artist identity presentation

The platform should prioritize:
- immersion
- atmosphere
- visual rhythm
- editorial hierarchy
- cinematic presentation
- conversion clarity

---

# Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

No unnecessary dependencies should be introduced.

---

# Design Direction

The aesthetic should feel:
- dark
- premium
- cinematic
- spacious
- immersive
- electronic
- editorial
- minimal but emotional

Influence references:
- modern music editorial layouts
- underground electronic music culture
- premium campaign microsites
- fashion/editorial spacing systems

Avoid:
- enterprise UI
- dashboard aesthetics
- over-designed glassmorphism
- startup landing page patterns
- excessive UI chrome
- nested cards everywhere

---

# UX Philosophy

The UX should prioritize:
- strong hierarchy
- breathing room
- simplicity
- asymmetry
- emotional presentation
- content-first layouts

The interface should disappear behind the artist identity.

Every section must have:
- a clear purpose
- one dominant visual idea
- restrained decoration

---

# Important Product Rules

## KISS
Keep solutions simple.

## DRY
Reuse existing logic and rendering patterns whenever possible.

## Surgical edits only
Do not redesign entire systems unless explicitly requested.

## Preserve atmosphere
Do not accidentally destroy the cinematic tone while refactoring.

## Avoid overengineering
Prefer simple readable code over abstraction-heavy architecture.

---

# Current Public Profile Structure

The artist profile currently includes:
- Hero
- Featured Release
- Selected Releases carousel
- Upcoming Gigs
- Press Photos
- Booking / Press CTA

Featured Release:
- primary spotlight release
- stronger hierarchy
- one main release

Selected Releases:
- supporting catalog carousel
- horizontal scroll
- artwork-first cards

Booking:
- should feel like a conversion moment
- not like a contact form

---

# Current UX Priorities

Current focus:
- reducing SaaS feeling
- improving editorial rhythm
- improving spacing hierarchy
- reducing excessive borders/glows/cards
- preserving premium dark atmosphere
- improving mobile polish
- improving visual balance
- making layouts feel more intentional

---

# Engineering Priorities

Always:
- inspect existing patterns before creating new ones
- reuse existing components when possible
- preserve current architecture
- avoid unnecessary refactors
- avoid touching unrelated files

Before modifying:
- understand existing rendering logic
- understand current responsive behavior
- understand existing visual hierarchy

---

# Important Visual Guidance

Prefer:
- spacing over decoration
- hierarchy over borders
- typography over chrome
- layout rhythm over effects
- asymmetry over rigid grids

Avoid:
- giant glow stacks
- excessive rings/borders
- repetitive card styling
- unnecessary hover animations
- visual noise

---

# Mobile Philosophy

Mobile should feel:
- intentional
- immersive
- compact but breathable
- premium
- not cramped

Do not simply stack desktop layouts blindly.

---

# Current Goal

Refine DJHQ into a premium electronic music artist platform while preserving:
- simplicity
- atmosphere
- scalability
- maintainability
- editorial quality