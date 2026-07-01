/**
 * Shared favicon resolution for all artist-owned pages.
 * Must be used consistently across every route that belongs to an artist:
 *   /[handle]
 *   /[handle]/presskit
 *   /[handle]/shows      (future)
 *   /[handle]/booking    (future)
 *
 * Resolution order:
 *   1. Artist custom favicon URL   (Pro only)
 *   2. Initials-based generated icon via /api/favicon/:initials  (Pro only)
 *   3. Platform favicon /favicon.ico  (Free plan, or no artist match)
 */

/** Derive 1–2 uppercase initials from an artist display name. */
export function getArtistInitials(artistName: string): string {
  const parts = artistName.trim().split(/[\s:_-]+/).filter(Boolean)
  if (!parts.length) return "DJ"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Return the favicon href for a given artist, consistent across all their pages. */
export function resolveArtistFavicon(opts: {
  isPro: boolean
  faviconUrl?: string | null
  artistName: string
  /** Stable cache-busting key (e.g. brand assignment ID slice). Appended as ?v= to external URLs only. */
  cacheKey?: string | null
}): string {
  const { isPro, faviconUrl, artistName, cacheKey } = opts
  if (!isPro) return "/favicon.ico"
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.com").replace(/\/$/, "")
  const customUrl = faviconUrl?.trim()
  if (customUrl) {
    // Route through the favicon compositor so the artist's logo is always shown on
    // a solid dark background. Without this, white/transparent logos become invisible
    // when Google composites them against its white search results background (white circle).
    const params = new URLSearchParams({ url: customUrl })
    if (cacheKey) params.set("v", cacheKey)
    return `${appUrl}/api/favicon/artist-icon?${params.toString()}`
  }
  return `${appUrl}/api/favicon/${encodeURIComponent(getArtistInitials(artistName))}`
}
