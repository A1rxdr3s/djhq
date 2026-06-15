/**
 * Canonical public artist site navigation.
 * Single source of truth for both the hero header nav and the sticky scroll nav.
 * Contact is always included here; callers that need conditional rendering
 * (e.g. hero nav filtering when no email is set) should filter client-side.
 */
export const PUBLIC_SECTION_NAV = [
  { label: "Shows",       href: "#shows",       id: "shows"       },
  { label: "Moments",     href: "#media",       id: "media"       },
  { label: "Music",       href: "#music",       id: "music"       },
  { label: "Performance", href: "#performance", id: "performance" },
  { label: "Contact",     href: "#contact",     id: "contact"     },
] as const

export type PublicNavItem = (typeof PUBLIC_SECTION_NAV)[number]
