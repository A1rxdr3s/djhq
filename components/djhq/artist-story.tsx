"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Constants ─────────────────────────────────────────────────────────────────

// Default bento view: first N items by sort_order (HQ-configured priority).
// The item at position 0 becomes the primary (lead) card.
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

function itemYear(item: CareerTimelineItem): string {
  return item.eventDate.slice(0, 4)
}

function itemCatLabel(item: CareerTimelineItem): string {
  return CATEGORY_LABELS[item.category] ?? item.category
}

// ── Shared metadata row ───────────────────────────────────────────────────────
// Category (primary signal type) · Year (precise metadata, subordinate).
// Year is intentionally small — it contextualises, not headlines.

function MetaRow({ item, className }: { item: CareerTimelineItem; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[5px]", className)}>
      <span className="shrink-0 text-[7px] font-bold uppercase tracking-[0.22em] text-accent/58">
        {itemCatLabel(item)}
      </span>
      <span className="shrink-0 text-[8px] text-foreground/16" aria-hidden>·</span>
      <span className="shrink-0 text-[9px] font-medium tabular-nums text-foreground/26">
        {itemYear(item)}
      </span>
    </div>
  )
}

// ── Primary card ──────────────────────────────────────────────────────────────
// Lead career signal. Position determined by sort_order in DB — no hardcoded logic.

function PrimaryCard({ item }: { item: CareerTimelineItem }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[oklch(0.105_0.005_160)] p-5 sm:p-[22px]">
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/52 via-accent/16 to-transparent"
        aria-hidden
      />

      <MetaRow item={item} />

      <h4 className="mt-[9px] text-[17px] font-black leading-[1.07] tracking-[-0.018em] text-foreground/93 sm:text-[19px]">
        {item.title}
      </h4>

      {item.location && (
        <p className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.16em] text-foreground/26">
          {item.location}
        </p>
      )}

      {item.description && (
        <p className="mt-[12px] flex-1 text-[12px] leading-[1.58] text-foreground/46">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Secondary card ────────────────────────────────────────────────────────────
// Supporting signals — 4 cards fill the 2×2 block beside/below the primary.

function SecondaryCard({ item }: { item: CareerTimelineItem }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-white/[0.05] bg-white/[0.020] p-[14px] transition-colors hover:border-white/[0.08] hover:bg-white/[0.032]">
      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/18 via-accent/5 to-transparent"
        aria-hidden
      />

      <MetaRow item={item} />

      <p className="mt-[5px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/80">
        {item.title}
      </p>

      {item.location && (
        <p className="mt-[2px] text-[8px] font-semibold uppercase tracking-[0.12em] text-foreground/21">
          {item.location}
        </p>
      )}

      {item.description && (
        <p className="mt-[8px] flex-1 text-[11px] leading-[1.46] text-foreground/38">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Chronology helpers ────────────────────────────────────────────────────────
// Year appears once per group — not repeated for every entry.
// This keeps the expanded view compact and avoids the "oversized year" problem.

type ChronologyGroup = { year: string; items: CareerTimelineItem[] }

function buildChronologyGroups(sorted: CareerTimelineItem[]): ChronologyGroup[] {
  const map = new Map<string, CareerTimelineItem[]>()
  for (const item of sorted) {
    const year = itemYear(item)
    const existing = map.get(year)
    if (existing) existing.push(item)
    else map.set(year, [item])
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }))
}

// ── Chronology year group ─────────────────────────────────────────────────────

function ChronologyYearGroup({
  group,
  isFirst,
}: {
  group:   ChronologyGroup
  isFirst: boolean
}) {
  return (
    <div className={cn(!isFirst && "mt-[10px]")}>
      {/* Year label — precise metadata, not a headline */}
      <div
        className={cn(
          "flex items-center gap-[8px] pb-[4px]",
          !isFirst && "border-t border-white/[0.05] pt-[10px]",
        )}
      >
        <span className="text-[8px] font-bold tabular-nums tracking-[0.04em] text-foreground/22">
          {group.year}
        </span>
        <div className="h-px flex-1 bg-white/[0.035]" aria-hidden />
      </div>

      {/* Entries within the year */}
      {group.items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "py-[7px]",
            i > 0 && "border-t border-white/[0.04]",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-[5px] gap-y-[1px]">
            <span className="text-[7px] font-bold uppercase tracking-[0.20em] text-accent/46">
              {itemCatLabel(item)}
            </span>
            {item.location && (
              <>
                <span className="text-[8px] text-foreground/14" aria-hidden>·</span>
                <span className="text-[7.5px] font-medium uppercase tracking-[0.09em] text-foreground/22">
                  {item.location}
                </span>
              </>
            )}
          </div>

          <p className="mt-[2px] text-[12px] font-semibold leading-snug tracking-[-0.006em] text-foreground/72">
            {item.title}
          </p>

          {item.description && (
            <p className="mt-[3px] text-[10.5px] leading-[1.44] text-foreground/34">
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── ArtistStory ───────────────────────────────────────────────────────────────
//
// Renders a compact career signals bento (default) and an expandable full
// chronology. Both derive from the same published milestone data — nothing
// is hardcoded here.
//
// Visibility:
//   • items arrives pre-filtered by the DB query (is_published = true).
//   • The component's own isPublished guard is a safety net for any leaks.
//   • Any milestone absent or marked unpublished in the DB is never shown.

export interface ArtistStoryProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function ArtistStory({ items, headline, intro }: ArtistStoryProps) {
  const [expanded, setExpanded] = useState(false)

  // Guard: only render items the DB has marked as published.
  const published = items.filter((item) => item.isPublished)
  if (published.length === 0) return null

  // Bento default view — first BENTO_LIMIT items by sort_order (HQ-set priority).
  const bentoItems             = published.slice(0, BENTO_LIMIT)
  const [primary, ...secondary] = bentoItems

  // Full chronology — all published items, oldest → newest, grouped by year.
  const chronologyGroups = buildChronologyGroups(
    [...published].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
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

        {/* ── Career signals bento ─────────────────────────────────────────
            Desktop (lg, 3 col):
              col 1, rows 1-2  = Primary (sort_order=1, HQ-configured)
              col 2-3, row 1   = Secondary 1 + 2
              col 2-3, row 2   = Secondary 3 + 4
            Tablet (sm, 2 col):
              cols 1-2, row 1  = Primary (full-width)
              rows 2-3         = Secondary 1-4 in 2×2
            Mobile: stacked in DOM order                                    */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <PrimaryCard item={primary} />
          </div>

          {secondary.map((item) => (
            <SecondaryCard key={item.id} item={item} />
          ))}

        </div>

        {/* ── Expand control ────────────────────────────────────────────────
            Pill button — deliberate secondary action, clearly visible.     */}
        <div className="mt-[18px]">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls="career-chronology"
            className="flex items-center gap-[7px] rounded-[5px] border border-white/[0.07] bg-white/[0.022] px-[14px] py-[7px] text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/44 transition-colors hover:border-white/[0.12] hover:bg-white/[0.038] hover:text-foreground/64 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

          {/* ── Full chronological timeline ──────────────────────────────
              All published milestones, oldest → newest, grouped by year.
              Year appears once per group — compact, no repeated anchors.  */}
          {expanded && (
            <div
              id="career-chronology"
              className="mt-[14px] border-t border-white/[0.05] pt-[6px]"
              role="region"
              aria-label="Full career chronology"
            >
              {chronologyGroups.map((group, i) => (
                <ChronologyYearGroup
                  key={group.year}
                  group={group}
                  isFirst={i === 0}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
