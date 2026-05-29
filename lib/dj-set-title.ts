export type PerformanceType = "dj_set" | "live_set" | "vinyl_set" | "b2b" | "b3b" | "other"

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
