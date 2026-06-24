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

// ── Primary card (sort_order 1) ───────────────────────────────────────────────
// The section's strongest signal. Taller on desktop — anchors the left column.
// Slightly green-tinted surface to distinguish it from the secondary grid.

function PrimaryCard({ item }: { item: CareerTimelineItem }) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[oklch(0.105_0.005_160)] p-5 sm:p-6">
      {/* Stronger green top accent — marks primary hierarchy */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent"
        aria-hidden
      />

      {/* Year + Category */}
      <div className="flex items-center gap-[7px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/34">
          {year}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.24em] text-accent/66">
          {catLabel}
        </span>
      </div>

      {/* Title — largest in the section */}
      <h4 className="mt-[10px] text-[19px] font-black leading-[1.06] tracking-[-0.018em] text-foreground/94 sm:text-[21px]">
        {item.title}
      </h4>

      {/* Location */}
      {item.location && (
        <p className="mt-[5px] text-[8.5px] font-semibold uppercase tracking-[0.17em] text-foreground/30">
          {item.location}
        </p>
      )}

      {/* Description — editorial copy, 2–3 lines */}
      {item.description && (
        <p className="mt-[14px] text-[12px] leading-[1.60] text-foreground/50">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Secondary card (sort_order 2–5) ──────────────────────────────────────────
// Four compact signals that form a 2×2 grid to the right of the primary card
// on desktop. Equal internal treatment — their differentiation comes from
// the content (category, location) not from varying box sizes.

function SecondaryCard({ item }: { item: CareerTimelineItem }) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.024] p-4 transition-colors duration-150 hover:border-white/[0.08] hover:bg-white/[0.036]">
      {/* Thin top accent — restrained */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/24 via-accent/8 to-transparent"
        aria-hidden
      />

      {/* Year + Category */}
      <div className="flex items-center gap-[6px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/28">
          {year}
        </span>
        <span className="text-[7px] font-bold uppercase tracking-[0.20em] text-accent/52">
          {catLabel}
        </span>
      </div>

      {/* Title */}
      <p className="mt-[6px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/80">
        {item.title}
      </p>

      {/* Location */}
      {item.location && (
        <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.13em] text-foreground/24">
          {item.location}
        </p>
      )}

      {/* Description */}
      {item.description && (
        <p className="mt-[8px] text-[11px] leading-[1.48] text-foreground/40">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Foundation card (sort_order 6) ───────────────────────────────────────────
// Full-width horizontal strip at the bottom of the bento.
// Reads like a career base layer — calmer, more grounded than the signals above.
// Horizontal layout on sm+ creates a distinct reading pattern from the cards.

function FoundationCard({ item }: { item: CareerTimelineItem }) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/[0.04] bg-white/[0.016]">
      {/* Very subtle left accent rail instead of top line — grounding, different rhythm */}
      <div
        className="absolute inset-y-0 left-0 w-[1.5px] bg-gradient-to-b from-accent/22 via-accent/8 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-3 px-5 py-[14px] sm:flex-row sm:items-center sm:gap-6">
        {/* Meta column — category + year */}
        <div className="shrink-0 sm:w-[90px]">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-accent/46">
            {catLabel}
          </span>
          <p className="mt-[2px] text-[10px] font-bold tabular-nums text-foreground/24">
            {year}
          </p>
        </div>

        {/* Vertical separator on desktop */}
        <div className="hidden w-px self-stretch bg-white/[0.05] sm:block" aria-hidden />

        {/* Title + location */}
        <div className="min-w-0 sm:w-[200px] sm:shrink-0">
          <p className="text-[13px] font-semibold leading-snug tracking-[-0.007em] text-foreground/70">
            {item.title}
          </p>
          {item.location && (
            <p className="mt-[2px] text-[8px] font-semibold uppercase tracking-[0.13em] text-foreground/22">
              {item.location}
            </p>
          )}
        </div>

        {/* Description — takes remaining width on desktop */}
        {item.description && (
          <p className="flex-1 text-[11px] leading-[1.48] text-foreground/36">
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Chronological timeline entry ──────────────────────────────────────────────
// Compact supporting layer. Year gutter on the left, content on the right.
// Intentionally quieter than the bento above — this is the deeper data view.

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

interface ArtistStoryProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function ArtistStory({ items, headline, intro }: ArtistStoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  // Bento hierarchy derived from sort_order (artist-controlled in HQ):
  //   primary    = sort_order 1  → large left column card
  //   secondary  = sort_order 2–5 → 2×2 compact grid (right column on desktop)
  //   foundation = sort_order 6  → full-width horizontal base strip
  const top6 = items.slice(0, 6)
  const [primary, ...rest] = top6
  const secondary  = rest.slice(0, 4)
  const foundation = rest.length >= 5 ? rest[4] : null

  // Full chronology: all published items, oldest → newest (for the reveal panel)
  const chronologicalItems = [...items].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )

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

        {/* ── Career signals bento ────────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-[10px]">

          {/* Upper cluster — primary left + secondary 2×2 right on desktop */}
          {primary && (
            <div className="flex flex-col gap-[10px] lg:flex-row lg:items-stretch">

              {/* Primary: full width on mobile/tablet, 37% on desktop */}
              <div className="lg:w-[37%] lg:shrink-0">
                <PrimaryCard item={primary} />
              </div>

              {/* Secondary 2×2: 1-col on mobile, 2-col on sm+ */}
              {secondary.length > 0 && (
                <div className="grid flex-1 grid-cols-1 gap-[10px] sm:grid-cols-2">
                  {secondary.map((item) => (
                    <SecondaryCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Foundation strip — full width, horizontal layout on sm+ */}
          {foundation && <FoundationCard item={foundation} />}

        </div>

        {/* ── Expand control ──────────────────────────────────────────────── */}
        {chronologicalItems.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="flex items-center gap-[6px] rounded-[4px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 transition-colors duration-150 hover:text-foreground/58 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

            {/* Full chronological timeline — revealed on expand */}
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
