export type PerformanceType = "dj_set" | "live_set" | "vinyl_set" | "b2b" | "b3b" | "other"

/**
 * Generates an editorial display title from raw performance context fields.
 * Returns null when both fields are empty so the caller can fall back to the stored title.
 *
 * Priority / rules:
 *   1. "festival" (exact word)  → "{source} Set"           — avoids "Festival Festival Set"
 *   2. "feztival" / "fest"      → "{source} Festival Set"  — non-standard spellings
 *   3. sunset/rooftop/terrace/beach → "{source} Session"   — ambient/atmospheric context
 *   4. event exists             → return event as-is       — clean editorial primary
 *   5. venue only               → "Live at {venue}"        — venue fallback
 *
 * Examples:
 *   event="MISA"           venue="Club Room"       → "MISA"
 *   event="Sky Sunset"     venue="Sky Costanera"   → "Sky Sunset Session"
 *   event="ICE Feztival"   venue=""                → "ICE Feztival Festival Set"
 *   event="Sonar Festival" venue=""                → "Sonar Festival Set"
 *   event=""               venue="Pacha Barcelona" → "Live at Pacha Barcelona"
 *   event=""               venue="W Rooftop"       → "W Rooftop Session"
 *   event=""               venue=""                → null (caller uses stored title)
 */
export function formatPerformanceTitle(
  event: string | undefined,
  venue: string | undefined,
): string | null {
  const eventName = event?.trim() ?? ""
  const venueName = venue?.trim() ?? ""
  const primary = eventName || venueName

  if (!primary) return null

  const lower = primary.toLowerCase()

  if (/\bfestival\b/.test(lower)) return `${primary} Set`
  if (/\b(feztival|fest)\b/.test(lower)) return `${primary} Festival Set`
  if (/\b(sunset|rooftop|terrace|beach)\b/.test(lower)) return `${primary} Session`

  if (eventName) return eventName
  return `Live at ${venueName}`
}

/**
 * Builds the secondary metadata line that accompanies a generated performance title.
 * Omits any field already represented in the title to avoid duplication.
 *
 * When event drives the title: shows venue + date (venue is new information)
 * When venue drives the title ("Live at X"): shows date only (venue already in title)
 *
 * Examples:
 *   event="MISA"  venue="Club Room"  date="Jul 27, 2025" → "Club Room · Jul 27, 2025"
 *   event=""      venue="Club Room"  date="Jul 27, 2025" → "Jul 27, 2025"
 *   event="MISA"  venue=""           date="Jul 27, 2025" → "Jul 27, 2025"
 *   event=""      venue=""           date="Jul 27, 2025" → "Jul 27, 2025"
 */
export function formatPerformanceMetadata(
  event: string | undefined,
  venue: string | undefined,
  formattedDate: string | null,
): string | null {
  const eventName = event?.trim() ?? ""
  const venueName = venue?.trim() ?? ""
  const titleUsesVenue = !eventName && !!venueName

  const parts: string[] = []
  if (!titleUsesVenue && venueName) parts.push(venueName)
  if (formattedDate) parts.push(formattedDate)

  return parts.length > 0 ? parts.join(" · ") : null
}

export const PERFORMANCE_TYPE_LABELS: Record<PerformanceType, string> = {
  dj_set: "DJ Set",
  live_set: "Live Set",
  vinyl_set: "Vinyl Set",
  b2b: "B2B",
  b3b: "B3B",
  other: "Performance",
}

export function computeDjSetTitle(
  type: PerformanceType,
  artists: string[],
  customType: string | undefined,
  event: string | undefined,
  venue: string | undefined,
  fallbackArtistName: string,
): string {
  const filled = artists.map((a) => a.trim()).filter(Boolean)
  const context = event?.trim() || venue?.trim()

  if (type === "b2b") {
    const artistStr = filled.length >= 2 ? filled.join(" b2b ") : filled[0] || fallbackArtistName
    return context ? `${artistStr} — ${context}` : artistStr
  }

  if (type === "b3b") {
    const artistStr = filled.length >= 3 ? filled.join(" b3b ") : filled.join(" b3b ") || fallbackArtistName
    return context ? `${artistStr} — ${context}` : artistStr
  }

  const artistStr = filled[0] || fallbackArtistName
  const typeLabel =
    type === "other"
      ? customType?.trim() || PERFORMANCE_TYPE_LABELS.other
      : PERFORMANCE_TYPE_LABELS[type]

  return context ? `${artistStr} — ${typeLabel} at ${context}` : `${artistStr} — ${typeLabel}`
}
