"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Curated career signals ─────────────────────────────────────────────────────
// The bento grid shows editorially curated highlights.
// These are static because the design requires specific year ranges ("2024 / 2025"),
// combined labels ("Santiago Residencies"), and precise copy that the DB schema
// can't produce from individual CareerTimelineItem rows.
//
// The full chronological timeline (expand panel) remains fully data-driven
// from the artist.careerTimeline prop.

type BentoSignal = {
  yearDisplay: string
  catLabel:    string
  title:       string
  location:    string
  description: string
}

const PRIMARY: BentoSignal = {
  yearDisplay: "2024 / 2025",
  catLabel:    "International",
  title:       "Pacha Barcelona",
  location:    "Barcelona, Spain",
  description: "European debut and return appearance at one of Barcelona's most recognized club stages.",
}

const SECONDARY: BentoSignal[] = [
  {
    yearDisplay: "2026",
    catLabel:    "International",
    title:       "TABU Bali",
    location:    "Bali, Indonesia",
    description: "Asian debut and new international chapter for the project.",
  },
  {
    yearDisplay: "2025",
    catLabel:    "International",
    title:       "Miami Music Week",
    location:    "Miami, USA",
    description: "Miami Music Week appearance during one of electronic music's key global gatherings.",
  },
  {
    yearDisplay: "2025",
    catLabel:    "Chart",
    title:       "Dark Room Mind",
    location:    "Beatport",
    description: "Beatport Staff Picks and Best New Hype Tech House recognition.",
  },
  {
    yearDisplay: "2025",
    catLabel:    "Festival",
    title:       "ICE Festival",
    location:    "Viña del Mar, Chile",
    description: "Major festival appearance in Viña del Mar.",
  },
]

const FOUNDATION: BentoSignal = {
  yearDisplay: "2018–present",
  catLabel:    "Residency",
  title:       "Santiago Residencies",
  location:    "Chile",
  description: "Club Room and MISA anchor the project's long-running presence in Chile's electronic music circuit.",
}

// ── Category labels for the chronology (DB items) ────────────────────────────

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

// ── Primary card ──────────────────────────────────────────────────────────────
// Largest visual item. Spans 2 grid rows on desktop so it anchors the bento.
// Green-tinted surface and stronger accent line mark its hierarchy.

function PrimaryCard({ s }: { s: BentoSignal }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[oklch(0.105_0.005_160)] p-5 sm:p-6">
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent"
        aria-hidden
      />

      {/* Year range + category */}
      <div className="flex items-center gap-[7px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/34">
          {s.yearDisplay}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.24em] text-accent/66">
          {s.catLabel}
        </span>
      </div>

      {/* Title */}
      <h4 className="mt-[10px] text-[19px] font-black leading-[1.05] tracking-[-0.018em] text-foreground/94 sm:text-[21px]">
        {s.title}
      </h4>

      {/* Location */}
      <p className="mt-[5px] text-[8.5px] font-semibold uppercase tracking-[0.17em] text-foreground/30">
        {s.location}
      </p>

      {/* Description */}
      <p className="mt-[14px] text-[12px] leading-[1.60] text-foreground/50">
        {s.description}
      </p>
    </div>
  )
}

// ── Secondary card ────────────────────────────────────────────────────────────
// Four equal-weight signals that form a 2×2 grid beside and below primary.
// Compact — the 2×2 density is what creates visual richness, not oversized cards.

function SecondaryCard({ s }: { s: BentoSignal }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.024] p-4 transition-colors duration-150 hover:border-white/[0.08] hover:bg-white/[0.036]">
      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/22 via-accent/7 to-transparent"
        aria-hidden
      />

      {/* Year + category */}
      <div className="flex items-center gap-[6px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/28">
          {s.yearDisplay}
        </span>
        <span className="text-[7px] font-bold uppercase tracking-[0.20em] text-accent/52">
          {s.catLabel}
        </span>
      </div>

      {/* Title */}
      <p className="mt-[6px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/80">
        {s.title}
      </p>

      {/* Location */}
      <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.13em] text-foreground/24">
        {s.location}
      </p>

      {/* Description */}
      <p className="mt-[8px] text-[11px] leading-[1.48] text-foreground/42">
        {s.description}
      </p>
    </div>
  )
}

// ── Foundation strip ──────────────────────────────────────────────────────────
// Full-width horizontal strip at the bottom of the bento.
// A left accent rail (instead of a top line) creates a different reading axis
// from the cards above — this reads as "base layer", not another card.
// Horizontal layout on sm+ places year/category on the left as metadata.

function FoundationStrip({ s }: { s: BentoSignal }) {
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/[0.04] bg-white/[0.016]">
      <div
        className="absolute inset-y-0 left-0 w-[1.5px] bg-gradient-to-b from-accent/24 via-accent/8 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-3 px-5 py-[14px] sm:flex-row sm:items-center sm:gap-6">
        {/* Year + category — narrow left meta column on desktop */}
        <div className="shrink-0 sm:w-[96px]">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-accent/46">
            {s.catLabel}
          </span>
          <p className="mt-[2px] text-[10px] font-bold tabular-nums text-foreground/24">
            {s.yearDisplay}
          </p>
        </div>

        {/* Divider on sm+ */}
        <div className="hidden w-px self-stretch bg-white/[0.05] sm:block" aria-hidden />

        {/* Title + location */}
        <div className="min-w-0 sm:w-[190px] sm:shrink-0">
          <p className="text-[13px] font-semibold leading-snug tracking-[-0.007em] text-foreground/70">
            {s.title}
          </p>
          <p className="mt-[2px] text-[8px] font-semibold uppercase tracking-[0.13em] text-foreground/22">
            {s.location}
          </p>
        </div>

        {/* Description — takes remaining width on sm+ */}
        <p className="flex-1 text-[11px] leading-[1.5] text-foreground/38">
          {s.description}
        </p>
      </div>
    </div>
  )
}

// ── Timeline entry (chronology) ───────────────────────────────────────────────
// Used in the expand panel. Quieter than the bento — data layer, not feature.

function TimelineEntry({
  item,
  isFirst,
}: {
  item:    CareerTimelineItem
  isFirst: boolean
}) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div className={cn("flex gap-[14px] py-[9px]", !isFirst && "border-t border-white/[0.04]")}>
      {/* Year gutter */}
      <div className="w-[32px] shrink-0 pt-[1px]">
        <span className="text-[10.5px] font-bold tabular-nums leading-none text-foreground/28">
          {year}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-[6px]">
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

  // Full chronology — DB items sorted oldest → newest.
  const chronologicalItems = [...items].sort((a, b) =>
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

        {/* ── Bento grid ────────────────────────────────────────────────────
            Desktop (lg, 3 col):
              col 1, rows 1-2  = Primary (Pacha)
              col 2-3, row 1   = TABU Bali + Miami MMW
              col 2-3, row 2   = Dark Room Mind + ICE Festival
              col 1-3, row 3   = Santiago Residencies (full width)
            Tablet (sm, 2 col):
              col 1-2, row 1   = Primary (full width)
              col 1, row 2     = TABU / col 2, row 2 = Miami
              col 1, row 3     = Dark Room / col 2, row 3 = ICE
              col 1-2, row 4   = Foundation (full width)
            Mobile (1 col): stacked in DOM order                          */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          {/* Primary — full width on mobile/tablet, tall left column on desktop */}
          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <PrimaryCard s={PRIMARY} />
          </div>

          {/* Four secondary signals — auto-placed into the 2×2 right block on desktop */}
          {SECONDARY.map((sig) => (
            <SecondaryCard key={sig.title} s={sig} />
          ))}

          {/* Foundation strip — full width in all breakpoints */}
          <div className="sm:col-span-2 lg:col-span-3">
            <FoundationStrip s={FOUNDATION} />
          </div>

        </div>

        {/* ── Expand control ─────────────────────────────────────────────── */}
        {/* Pill button — more deliberate than plain text, more premium than a big CTA */}
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

          {/* ── Full chronological timeline ───────────────────────────────── */}
          {expanded && (
            <div
              className="mt-4 border-t border-white/[0.05] pt-[2px]"
              role="region"
              aria-label="Full career chronology"
            >
              {chronologicalItems.length > 0 ? (
                chronologicalItems.map((item, i) => (
                  <TimelineEntry key={item.id} item={item} isFirst={i === 0} />
                ))
              ) : (
                <p className="py-4 text-[11px] text-foreground/28">No timeline entries yet.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
