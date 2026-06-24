"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

const CATEGORY_LABELS: Record<string, string> = {
  residency:     "Residency",
  festival:      "Festival",
  club_show:     "Club Show",
  international: "International",
  release:       "Release",
  press:         "Press",
  chart:         "Chart",
  tour:          "Tour",
  other:         "Other",
}

// ── Milestone box ─────────────────────────────────────────────────────────────
// "isLeading" applies to the #1 sort_order item (e.g. Euro Tour 2026):
//   same box size, same grid cell, but slightly stronger title weight/color.
// All boxes use the same padding and border so the grid stays rhythmic.

function MilestoneBox({
  item,
  isLeading = false,
}: {
  item: CareerTimelineItem
  isLeading?: boolean
}) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[8px] border p-4 transition-colors duration-150",
        isLeading
          ? "border-white/[0.08] bg-white/[0.036] hover:border-accent/[0.12] hover:bg-white/[0.052]"
          : "border-white/[0.06] bg-white/[0.026] hover:border-white/[0.09] hover:bg-white/[0.04]",
      )}
    >
      {/* Thin green top accent — restrained, not colorful */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r to-transparent",
          isLeading ? "from-accent/36 via-accent/12" : "from-accent/22 via-accent/7",
        )}
        aria-hidden
      />

      {/* Year + Category micro-label */}
      <div className="flex items-center gap-[6px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/30">
          {year}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-accent/56">
          {catLabel}
        </span>
      </div>

      {/* Title — primary signal, clearly readable */}
      <p
        className={cn(
          "mt-[7px] leading-snug",
          isLeading
            ? "text-[14px] font-black tracking-[-0.015em] text-foreground/92"
            : "text-[13px] font-bold  tracking-[-0.010em] text-foreground/82",
        )}
      >
        {item.title}
      </p>

      {/* Location — muted metadata */}
      {item.location && (
        <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.15em] text-foreground/26">
          {item.location}
        </p>
      )}

      {/* Description — short, legible, supporting context */}
      {item.description && (
        <p className="mt-[8px] text-[11px] leading-[1.5] text-foreground/42">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Chronological timeline entry ──────────────────────────────────────────────
// Compact row: year gutter + category · location + title + description.
// Intentionally smaller and quieter than the featured boxes — supporting detail only.

function TimelineEntry({
  item,
  isFirst,
}: {
  item: CareerTimelineItem
  isFirst: boolean
}) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div
      className={cn(
        "flex gap-[14px] py-[9px]",
        !isFirst && "border-t border-white/[0.04]",
      )}
    >
      {/* Year — narrow left gutter */}
      <div className="w-[32px] shrink-0 pt-[1px]">
        <span className="text-[10.5px] font-bold tabular-nums leading-none text-foreground/28">
          {year}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Category + location in one compact row */}
        <div className="flex flex-wrap items-center gap-x-[6px] gap-y-0">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.20em] text-accent/50">
            {catLabel}
          </span>
          {item.location && (
            <>
              <span className="text-[8px] text-foreground/16" aria-hidden>·</span>
              <span className="text-[8px] font-medium uppercase tracking-[0.10em] text-foreground/24">
                {item.location}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <p className="mt-[3px] text-[12px] font-semibold leading-snug tracking-[-0.006em] text-foreground/72">
          {item.title}
        </p>

        {/* Description */}
        {item.description && (
          <p className="mt-[4px] text-[10.5px] leading-[1.46] text-foreground/38">
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ── ArtistStory ───────────────────────────────────────────────────────────────

interface ArtistStoryProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function ArtistStory({ items, headline, intro }: ArtistStoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  // Featured grid: top 6 by sort_order (artist-controlled priority in HQ).
  // The first item (lowest sort_order) receives leading visual treatment.
  const featuredItems = items.slice(0, 6)

  // Full chronology: all published items sorted oldest → newest for the reveal panel.
  const chronologicalItems = [...items].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )

  const [leadingItem, ...secondaryItems] = featuredItems

  return (
    <section id="story" className="mt-10 lg:mt-12">
      <div className="mx-auto max-w-5xl">

        {/* ── Section header ──────────────────────────────────────────────── */}
        <SectionHeader>Artist Story</SectionHeader>

        {headline && (
          <h3 className="mt-3 max-w-xl text-[19px] font-black tracking-[-0.022em] text-foreground/84 sm:text-[21px]">
            {headline}
          </h3>
        )}

        {intro && (
          <p className="mt-[7px] max-w-2xl text-[12px] leading-[1.62] text-foreground/44 sm:text-[12.5px]">
            {intro}
          </p>
        )}

        {/* ── Featured milestone grid ─────────────────────────────────────── */}
        {/* Desktop: 3-col × 2-row  |  Tablet: 2-col × 3-row  |  Mobile: 1-col */}
        {featuredItems.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {leadingItem && (
              <MilestoneBox item={leadingItem} isLeading />
            )}
            {secondaryItems.map((item) => (
              <MilestoneBox key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* ── Expand control ──────────────────────────────────────────────── */}
        {chronologicalItems.length > 0 && (
          <div className="mt-[18px]">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="group flex items-center gap-[6px] rounded-[4px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 transition-colors duration-150 hover:text-foreground/58 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronDown
                className={cn(
                  "h-[11px] w-[11px] transition-transform duration-200",
                  expanded && "rotate-180",
                )}
                aria-hidden
              />
              {expanded ? "Hide full chronology" : "View full chronology"}
            </button>

            {/* ── Full chronological timeline — revealed on expand ──────── */}
            {expanded && (
              <div
                className="mt-4 border-t border-white/[0.05] pt-[2px]"
                role="region"
                aria-label="Full career chronology"
              >
                {chronologicalItems.map((item, i) => (
                  <TimelineEntry key={item.id} item={item} isFirst={i === 0} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  )
}
