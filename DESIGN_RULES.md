# DJHQ Design Rules

## General Philosophy

The UI should feel:
- cinematic
- editorial
- immersive
- premium
- minimal
- emotionally driven

NOT:
- corporate
- enterprise
- dashboard-heavy
- startup-like

---

# Layout Rules

## Prefer asymmetry
Avoid perfectly balanced SaaS grids everywhere.

## Preserve breathing room
Spacing is part of the aesthetic.

## One visual focal point per section
Avoid competing visual hierarchies.

## Reduce unnecessary containers
Do not wrap everything in cards.

## Avoid nested chrome
Too many:
- borders
- rings
- glows
- shadows
creates dashboard feeling.

---

# Typography Rules

Typography should:
- carry hierarchy
- feel editorial
- feel intentional

Prefer:
- large confident headings
- restrained supporting text
- balanced line lengths

Avoid:
- oversized UI labels
- noisy metadata
- excessive uppercase overload

---

# Hero Rules

The hero should:
- establish atmosphere immediately
- prioritize artist identity
- feel cinematic

Avoid:
- too many badges
- multiple competing CTAs
- excessive framing layers
- dashboard widgets inside hero

The artist name should remain dominant.

---

# Release Rules

Featured Release:
- spotlight content
- stronger hierarchy
- visually intentional
- should feel collectible/editorial

Selected Releases:
- supporting catalog
- lighter visual treatment
- easy horizontal exploration

Avoid:
- repetitive card grids
- giant metadata blocks
- over-styled carousels

---

# CTA Rules

Each section should ideally have:
- one primary action

Avoid:
- duplicated CTAs
- too many buttons
- equal visual weight actions

Primary actions should feel:
- confident
- minimal
- intentional

---

# Motion Rules

Motion should be:
- subtle
- premium
- restrained

Avoid:
- excessive hover transforms
- aggressive parallax
- startup-style animation overload

---

# Border / Glow Rules

Prefer:
- subtle contrast
- soft layering
- spacing separation

Avoid:
- thick borders
- glow spam
- excessive rings
- card overload

---

# Mobile Rules

Mobile layouts should:
- simplify hierarchy
- preserve immersion
- reduce clutter
- tighten spacing intelligently

Avoid:
- cramped UI
- giant vertical stacks
- oversized controls
- desktop spacing copied directly

---

# Engineering Rules

Before adding:
- new components
- new abstractions
- new dependencies

Ask:
- can this reuse an existing pattern?
- is this solving a real UX problem?
- is this making the product simpler?

Prefer:
- readability
- consistency
- restrained architecture

Avoid:
- abstraction for abstraction’s sake
- over-componentization
- premature systemization

---

# Plan Gating Rules

Pro-only features in the dashboard must:
- Show the feature UI only when `artist.plan === "pro"`
- Show a minimal upsell card for free users (not a modal, not a paywall overlay)
- Be gated server-side in API routes — never trust client-only checks

Free users must never see broken UI where a Pro feature would appear.