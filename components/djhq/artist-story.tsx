"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Constants ─────────────────────────────────────────────────────────────────

// How many milestones appear in the default "career signals" bento.
// Items are ordered by sort_order from the DB (HQ-configured priority).
// The first item becomes the primary card; the rest fill secondary slots.
const BENTO_LIMIT = 5

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemYear(item: CareerTimelineItem): string {
  return item.eventDate.slice(0, 4)
}

function itemCatLabel(item: CareerTimelineItem): string {
  return CATEGORY_LABELS[item.category] ?? item.category
}

// ── Primary card ──────────────────────────────────────────────────────────────
// Largest surface in the default view.
// Position is determined by sort_order in the DB — the HQ configures which
// milestone leads. No artist-specific logic here.

function PrimaryCard({ item }: { item: CareerTimelineItem }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[oklch(0.105_0.005_160)] p-5 sm:p-6">
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent"
        aria-hidden
      />

      <div className="flex items-center gap-[7px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/34">
          {itemYear(item)}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.24em] text-accent/66">
          {itemCatLabel(item)}
        </span>
      </div>

      <h4 className="mt-[10px] text-[19px] font-black leading-[1.05] tracking-[-0.018em] text-foreground/94 sm:text-[21px]">
        {item.title}
      </h4>

      {item.location && (
        <p className="mt-[5px] text-[8.5px] font-semibold uppercase tracking-[0.17em] text-foreground/30">
          {item.location}
        </p>
      )}

      {item.description && (
        <p className="mt-[14px] flex-1 text-[12px] leading-[1.60] text-foreground/50">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Secondary card ────────────────────────────────────────────────────────────
// Four supporting signals that fill the 2×2 block beside the primary on desktop.

function SecondaryCard({ item }: { item: CareerTimelineItem }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.024] p-4 transition-colors duration-150 hover:border-white/[0.08] hover:bg-white/[0.036]">
      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/22 via-accent/7 to-transparent"
        aria-hidden
      />

      <div className="flex items-center gap-[6px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/28">
          {itemYear(item)}
        </span>
        <span className="text-[7px] font-bold uppercase tracking-[0.20em] text-accent/52">
          {itemCatLabel(item)}
        </span>
      </div>

      <p className="mt-[6px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/80">
        {item.title}
      </p>

      {item.location && (
        <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.13em] text-foreground/24">
          {item.location}
        </p>
      )}

      {item.description && (
        <p className="mt-[8px] flex-1 text-[11px] leading-[1.48] text-foreground/42">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Timeline entry ────────────────────────────────────────────────────────────
// Compact row used in the expanded full chronology.
// Renders as a scan-friendly list — no cards, no decorative elements.

function TimelineEntry({
  item,
  isFirst,
}: {
  item:    CareerTimelineItem
  isFirst: boolean
}) {
  return (
    <div
      className={cn(
        "flex gap-[14px] py-[10px]",
        !isFirst && "border-t border-white/[0.04]",
      )}
    >
      {/* Year gutter */}
      <div className="w-[32px] shrink-0 pt-[2px]">
        <span className="text-[10.5px] font-bold tabular-nums leading-none text-foreground/28">
          {itemYear(item)}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.20em] text-accent/50">
            {itemCatLabel(item)}
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

        <p className="mt-[3px] text-[12px] font-semibold leading-snug tracking-[-0.006em] text-foreground/72">
          {item.title}
        </p>

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
// Renders a career signals bento (compact default) + expandable full chronology.
//
// Data contract:
//   items — published CareerTimelineItem[] already sorted by sort_order asc
//           from the DB query (is_published = true filter applied at query time).
//           First item = highest HQ-configured priority → primary card.
//
// Visibility rules:
//   • Only items with isPublished = true are rendered (guard against any leak).
//   • The DB query already enforces this; the filter here is a safety net.
//   • Milestones absent from, or marked unpublished in, the DB never appear.

export interface ArtistStoryProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function ArtistStory({ items, headline, intro }: ArtistStoryProps) {
  const [expanded, setExpanded] = useState(false)

  // Safety filter: only render published items (DB query already enforces this)
  const published = items.filter((item) => item.isPublished)
  if (published.length === 0) return null

  // Default view: first BENTO_LIMIT items by sort_order (HQ-configured priority)
  const bentoItems = published.slice(0, BENTO_LIMIT)
  const [primary, ...secondary] = bentoItems

  // Full chronology: all published items sorted oldest → newest
  const chronology = [...published].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )

  return (
    <section id="story" className="mt-10 lg:mt-12">
      <div className="mx-auto max-w-5xl">

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

        {/* ── Career signals bento ───────────────────────────────────────────
            Desktop (lg, 3 col):
              col 1, rows 1-2  = Primary (HQ sort_order=1 milestone)
              col 2, row 1     = Secondary 1
              col 3, row 1     = Secondary 2
              col 2, row 2     = Secondary 3
              col 3, row 2     = Secondary 4
            Tablet (sm, 2 col):
              cols 1-2, row 1  = Primary (full width)
              col 1+2, rows 2-3 = Secondary 1-4 in 2×2
            Mobile (1 col): stacked in DOM order                            */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <PrimaryCard item={primary} />
          </div>

          {secondary.map((item) => (
            <SecondaryCard key={item.id} item={item} />
          ))}

        </div>

        {/* ── Expand control ─────────────────────────────────────────────────
            Pill button — deliberate secondary action, not tiny metadata.     */}
        <div className="mt-[18px]">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="flex items-center gap-[7px] rounded-[5px] border border-white/[0.07] bg-white/[0.022] px-[14px] py-[7px] text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/44 transition-colors duration-150 hover:border-white/[0.12] hover:bg-white/[0.038] hover:text-foreground/64 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronDown
              className={cn(
                "h-[10px] w-[10px] transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
            {expanded ? "Hide full career chronology" : "View full career chronology"}
          </button>

          {/* ── Full chronological timeline ─────────────────────────────────
              All published milestones, oldest → newest.
              Compact scan-friendly list — no cards, no oversized elements.  */}
          {expanded && (
            <div
              className="mt-4 border-t border-white/[0.05] pt-[2px]"
              role="region"
              aria-label="Full career chronology"
            >
              {chronology.map((item, i) => (
                <TimelineEntry key={item.id} item={item} isFirst={i === 0} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
