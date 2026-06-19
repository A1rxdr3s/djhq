/**
 * Shared helper for generating editorial video performance titles from structured metadata.
 *
 * Title generation rules:
 *   Event present: show event name only (no artist prefix)
 *   Venue only:    "Live at VENUE"
 *   No context:    null (caller falls back to stored title)
 *
 * Artist attribution is handled separately at the call site via the `attribution` field.
 */
export function computeVideoTitle(
  videoArtists: string[],
  event: string | undefined,
  venue: string | undefined,
  fallbackArtistName: string,
): string | null {
  // Unused but kept in signature for backwards compat with call sites.
  void videoArtists
  void fallbackArtistName

  const eventName = event?.trim()
  const venueName = venue?.trim()

  if (eventName) return eventName
  if (venueName) return `Live at ${venueName}`

  return null
}
