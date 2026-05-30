/**
 * Shared helper for generating editorial video performance titles from structured metadata.
 *
 * Title generation rules (matching the DJ Sets editorial convention):
 *   Multiple artists + event: "ARTIST b2b ARTIST × EVENT"
 *   Single artist + event:    "ARTIST × EVENT"
 *   Venue only:               "Live at VENUE"
 *   Event only:               "ARTIST × EVENT"
 *   No context:               null (caller falls back to stored title)
 */
export function computeVideoTitle(
  videoArtists: string[],
  event: string | undefined,
  venue: string | undefined,
  fallbackArtistName: string,
): string | null {
  const filled = videoArtists.filter(Boolean)
  const artistDisplay = filled.length > 0 ? filled.join(" b2b ") : fallbackArtistName
  const eventName = event?.trim()
  const venueName = venue?.trim()

  if (eventName) return `${artistDisplay} × ${eventName}`
  if (venueName) return `Live at ${venueName}`

  return null
}
