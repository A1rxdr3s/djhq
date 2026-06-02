"use client"

import { useState } from "react"
import type { Release } from "@/types/djhq"
import { SelectedReleasesCarousel } from "@/components/djhq/selected-releases-carousel"

// Initial carousel depth — shows enough to signal an active catalog
const CAROUSEL_LIMIT = 8

type Props = {
  featured: Release | null
  all: Release[]
}

export function CollapsibleMobileReleases({ all }: Props) {
  const [viewAll, setViewAll] = useState(false)

  if (all.length === 0) return null

  const carouselReleases = all.slice(0, CAROUSEL_LIMIT)
  const remainingReleases = all.slice(CAROUSEL_LIMIT)
  const hasMore = remainingReleases.length > 0

  return (
    <div>
      {/* Releases carousel — always visible, 5–8 items */}
      <SelectedReleasesCarousel releases={carouselReleases} />

      {/* Overflow releases — appended when user requests more */}
      {viewAll && remainingReleases.length > 0 && (
        <div className="mt-2">
          <SelectedReleasesCarousel releases={remainingReleases} />
        </div>
      )}

      {/* View All CTA — gateway to full discography */}
      {hasMore && !viewAll && (
        <button
          type="button"
          onClick={() => setViewAll(true)}
          className="mt-3 inline-flex w-full items-center gap-2 border-t border-white/[0.06] pt-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-white/50 transition-colors duration-150 hover:text-accent"
        >
          View All Releases →
        </button>
      )}
    </div>
  )
}
