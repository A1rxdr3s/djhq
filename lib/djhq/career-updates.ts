import type { CareerTimelineItem } from "@/types/djhq"

// ── Public filtering ──────────────────────────────────────────────────────────
//
// These are the authoritative functions that control what appears on the
// public artist profile. They must NEVER:
//   • expose draft/hidden/unpublished items
//   • use previewImageUrl (HQ-only field)
//   • reference any hardcoded milestone content
//
// The DB query already enforces is_published = true at the SQL level.
// These functions are a defence-in-depth layer and apply the featured/priority
// sort order that the public component uses.

/**
 * Returns only items that are safe to display publicly, in public display order:
 * 1. Featured items first (is_featured = true)
 * 2. Then by sort_order ascending (null last)
 * 3. Then most recent event_date descending
 *
 * Items missing a title are excluded as malformed.
 */
export function getPublicCareerUpdates(
  items: CareerTimelineItem[],
): CareerTimelineItem[] {
  return items
    .filter((item) => item.isPublished && !!item.title?.trim())
    .sort((a, b) => {
      // Featured items always lead
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      // Then explicit sort_order (ascending, null treated as 9999)
      const aOrd = a.sortOrder ?? 9999
      const bOrd = b.sortOrder ?? 9999
      if (aOrd !== bOrd) return aOrd - bOrd
      // Finally, most recent event
      return b.eventDate.localeCompare(a.eventDate)
    })
}

/**
 * Returns only featured public items in public display order.
 */
export function getFeaturedCareerUpdates(
  items: CareerTimelineItem[],
): CareerTimelineItem[] {
  return getPublicCareerUpdates(items).filter((i) => i.isFeatured)
}

/**
 * Alias — named to match the prompt's suggested function name.
 */
export const sortCareerUpdatesForPublicProfile = getPublicCareerUpdates

// ── HQ preview filtering ──────────────────────────────────────────────────────
//
// HQ-side helpers that can include drafts and preview-only assets.
// These must NEVER be used in the public component.

/**
 * Returns all items for HQ management, including unpublished drafts.
 * Sorted by sort_order then date, same as the DB query.
 */
export function getAllCareerUpdatesForHQ(
  items: CareerTimelineItem[],
): CareerTimelineItem[] {
  return [...items].sort((a, b) => {
    const aOrd = a.sortOrder ?? 9999
    const bOrd = b.sortOrder ?? 9999
    if (aOrd !== bOrd) return aOrd - bOrd
    return b.eventDate.localeCompare(a.eventDate)
  })
}

// ── Chronology helpers ────────────────────────────────────────────────────────

export type ChronologyGroup = { year: string; items: CareerTimelineItem[] }

/**
 * Groups items by year (from eventDate), in the order they arrive.
 * Call with items already sorted into the desired display order.
 */
export function buildChronologyGroups(
  items: CareerTimelineItem[],
): ChronologyGroup[] {
  const map = new Map<string, CareerTimelineItem[]>()
  for (const item of items) {
    const year = item.eventDate.slice(0, 4)
    const existing = map.get(year)
    if (existing) existing.push(item)
    else map.set(year, [item])
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }))
}
