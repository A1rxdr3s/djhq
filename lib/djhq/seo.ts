import type { Artist } from "@/types/djhq"

/**
 * Returns the canonical public base URL for the current deployment.
 * Fallback order:
 *   1. NEXT_PUBLIC_SITE_URL
 *   2. NEXT_PUBLIC_APP_URL
 *   3. https://VERCEL_PROJECT_PRODUCTION_URL (non-preview builds only)
 *   4. https://djhq.com
 * Never emits a localhost URL in production.
 */
export function getPublicBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]
  for (const c of candidates) {
    if (c?.trim() && !c.includes("localhost")) return c.trim().replace(/\/$/, "")
  }
  return "https://djhq.com"
}

/**
 * Converts a URL to an absolute URL.
 * - Absolute https/http URLs pass through unchanged.
 * - Root-relative paths (/foo) are prefixed with baseUrl.
 * - Empty or missing input returns undefined — callers skip broken metadata.
 */
export function toAbsoluteUrl(
  url: string | null | undefined,
  baseUrl: string,
): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed
  if (trimmed.startsWith("/")) return `${baseUrl}${trimmed}`
  return undefined
}

/**
 * Generates a concise meta description grounded in real artist data.
 * Uses only published/visible data — never invents achievements.
 * Falls back to shortBio, then a generic safe string.
 */
export function buildArtistDescription(artist: Artist): string {
  if (artist.shortBio?.trim()) return artist.shortBio.trim()
  return `Official artist profile for ${artist.artistName}. Explore shows, releases, artist story, and booking information.`
}

/**
 * Generates JSON-LD structured data for a DJ/producer artist profile page.
 *
 * Rules:
 * - Uses only real, configured data from the artist object.
 * - Hidden/unpublished milestones and cancelled gigs are excluded.
 * - sameAs is populated from social links only (no invented links).
 * - MusicEvent entries are created only for upcoming announced gigs with real dates.
 */
export function buildArtistJsonLd(
  artist: Artist,
  canonicalUrl: string,
): Record<string, unknown> {
  const baseUrl = getPublicBaseUrl()

  const imageUrl = toAbsoluteUrl(
    artist.seo?.ogImageUrl || artist.heroImageUrl,
    baseUrl,
  )

  // sameAs: deduplicated from configured social links + canonical domain
  const sameAsSet = new Set<string>()
  for (const link of artist.socialLinks ?? []) {
    if (link.url?.trim()) sameAsSet.add(link.url.trim())
  }
  if (canonicalUrl) sameAsSet.add(canonicalUrl)
  const sameAs = [...sameAsSet]

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist.artistName,
    url: canonicalUrl,
    description: buildArtistDescription(artist),
    jobTitle: "DJ & Producer",
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(artist.genres?.length > 0 ? { knowsAbout: artist.genres } : {}),
  }

  // MusicEvent: only published, announced upcoming gigs with a real date
  const events = (artist.upcomingGigs ?? []).filter(
    (g) =>
      g.date &&
      g.eventStatus !== "cancelled" &&
      (g.visibilityStatus === "announced" || !g.visibilityStatus),
  )

  if (events.length > 0) {
    jsonLd.performerIn = events.map((gig) => ({
      "@type": "MusicEvent",
      name: gig.eventName || gig.venue,
      startDate: gig.date,
      location: {
        "@type": "Place",
        name: gig.venue,
        address: {
          "@type": "PostalAddress",
          addressLocality: gig.city,
          addressCountry: gig.country,
        },
      },
      performer: { "@type": "Person", name: artist.artistName },
      ...(gig.ticketUrl ? { url: gig.ticketUrl } : { url: canonicalUrl }),
      eventStatus: "https://schema.org/EventScheduled",
    }))
  }

  return jsonLd
}
