"use client"

import { useState } from "react"
import Image from "next/image"
import { Music2 } from "lucide-react"
import type { Release } from "@/types/djhq"
import { SelectedReleasesCarousel } from "@/components/djhq/selected-releases-carousel"

// Number of recent releases shown in the always-visible carousel strip
const CAROUSEL_LIMIT = 6

type Props = {
  featured: Release | null
  all: Release[]
}

export function CollapsibleMobileReleases({ featured, all }: Props) {
  const [viewAll, setViewAll] = useState(false)

  if (!featured && all.length === 0) return null

  // all[0] is featured (shown in the card above); rest are non-featured
  const recentReleases = all.slice(1, CAROUSEL_LIMIT + 1)
  const remainingReleases = all.slice(CAROUSEL_LIMIT + 1)
  const hasMore = remainingReleases.length > 0

  return (
    <div>
      {/* Featured release — compact card, always visible */}
      {featured && (
        <a
          href={featured.platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors duration-200 active:bg-white/[0.04]"
        >
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md shadow-black/30">
            {featured.artworkUrl?.trim() ? (
              <Image
                src={featured.artworkUrl}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-accent/50" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-between py-0.5">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent/60">
                {featured.type}
              </p>
              <p className="mt-0.5 truncate text-sm font-black tracking-[-0.01em] text-white">
                {featured.title}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">
                {featured.label}
                {featured.releaseDate ? ` · ${featured.releaseDate.slice(0, 4)}` : ""}
              </p>
            </div>
            <span className="mt-2 inline-flex h-6 w-fit items-center rounded-full border border-accent/20 px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
              Listen ↗
            </span>
          </div>
        </a>
      )}

      {/* Recent releases carousel — always visible, 4–6 items */}
      {recentReleases.length > 0 && (
        <div className="mt-4">
          <SelectedReleasesCarousel releases={recentReleases} />
        </div>
      )}

      {/* Remaining releases — shown when expanded */}
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
