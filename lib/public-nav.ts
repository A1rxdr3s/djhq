/**
 * Full public artist nav — all six sections.
 * Used by the desktop hero nav where there is enough horizontal room.
 */
export const PUBLIC_SECTION_NAV = [
  { label: "Shows",       href: "#shows",       id: "shows"       },
  { label: "Moments",     href: "#media",       id: "media"       },
  { label: "Music",       href: "#music",       id: "music"       },
  { label: "Story",       href: "#story",       id: "story"       },
  { label: "Performance", href: "#performance", id: "performance" },
  { label: "Contact",     href: "#contact",     id: "contact"     },
] as const

/**
 * Mobile public nav — five items, no Performance.
 * Fits within 390px without horizontal scroll or clipping.
 * Used by the mobile sticky nav and to determine which hero nav items
 * are visible on narrow screens (Performance is hidden via CSS on mobile).
 */
export const MOBILE_PUBLIC_NAV = [
  { label: "Shows",   href: "#shows",   id: "shows"   },
  { label: "Moments", href: "#media",   id: "media"   },
  { label: "Music",   href: "#music",   id: "music"   },
  { label: "Story",   href: "#story",   id: "story"   },
  { label: "Contact", href: "#contact", id: "contact" },
] as const

export type PublicNavItem       = (typeof PUBLIC_SECTION_NAV)[number]
export type MobilePublicNavItem = (typeof MOBILE_PUBLIC_NAV)[number]
