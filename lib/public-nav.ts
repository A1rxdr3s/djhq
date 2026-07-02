/**
 * Full public artist nav — five sections.
 * Performance & Sets remain in the page body but are reachable via MUSIC,
 * so PERFORMANCE is intentionally omitted as a top-level nav item.
 */
export const PUBLIC_SECTION_NAV = [
  { label: "Moments", href: "#media",   id: "media"   },
  { label: "Shows",   href: "#shows",   id: "shows"   },
  { label: "Music",   href: "#music",   id: "music"   },
  { label: "Story",   href: "#story",   id: "story"   },
  { label: "Contact", href: "#contact", id: "contact" },
] as const

/**
 * Mobile public nav — five items (matches desktop, no omissions).
 * Fits within 390px without horizontal scroll or clipping.
 * Used by the mobile sticky nav and the mobile hero nav.
 */
export const MOBILE_PUBLIC_NAV = [
  { label: "Moments", href: "#media-mobile", id: "media-mobile" },
  { label: "Shows",   href: "#shows",        id: "shows"        },
  { label: "Music",   href: "#music",        id: "music"        },
  { label: "Story",   href: "#story",        id: "story"        },
  { label: "Contact", href: "#contact",      id: "contact"      },
] as const

export type PublicNavItem       = (typeof PUBLIC_SECTION_NAV)[number]
export type MobilePublicNavItem = (typeof MOBILE_PUBLIC_NAV)[number]
