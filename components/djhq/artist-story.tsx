import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Column definitions ────────────────────────────────────────────────────────
// `tour` items are routed to the featured strip; they never enter columns.

const COLUMNS = [
  {
    id:         "international",
    label:      "International Stages",
    categories: new Set<string>(["international"]),
  },
  {
    id:         "releases",
    label:      "Releases & Recognition",
    categories: new Set<string>(["chart", "festival", "release", "press"]),
  },
  {
    id:         "roots",
    label:      "Residencies & Roots",
    categories: new Set<string>(["residency", "club_show", "other"]),
  },
]

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

// ── Visual prominence ─────────────────────────────────────────────────────────
// International Stages = high   (important bookings, slightly more visual weight)
// Releases & Recognition = medium
// Residencies & Roots = standard (compact, readable, clearly secondary)

type Prominence = "high" | "medium" | "standard"

const TITLE_CLASSES: Record<Prominence, string> = {
  high:     "text-[13px] sm:text-[14px] font-black   text-foreground/90 tracking-[-0.014em] leading-snug",
  medium:   "text-[12.5px] sm:text-[13.5px] font-bold text-foreground/80 tracking-[-0.012em] leading-snug",
  standard: "text-[12px] sm:text-[12px]    font-semibold text-foreground/68 tracking-[-0.008em] leading-snug",
}

const LOCATION_CLASSES: Record<Prominence, string> = {
  high:     "text-foreground/30",
  medium:   "text-foreground/24",
  standard: "text-foreground/20",
}

// ── Milestone row ─────────────────────────────────────────────────────────────

function Milestone({ item, p }: { item: CareerTimelineItem; p: Prominence }) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div>
      {/* Year · Category */}
      <div className="flex items-baseline gap-[7px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/35">
          {year}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.24em] text-accent/62">
          {catLabel}
        </span>
      </div>

      {/* Title */}
      <div className="mt-[4px]">
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("group/link transition-colors duration-150 hover:text-foreground", TITLE_CLASSES[p])}
          >
            {item.title}
            <ExternalLink
              className="ml-1 inline h-[8px] w-[8px] translate-y-[-1px] text-foreground/18 transition-colors duration-150 group-hover/link:text-accent/45"
              aria-hidden
            />
          </a>
        ) : (
          <p className={TITLE_CLASSES[p]}>{item.title}</p>
        )}
      </div>

      {/* Location */}
      {item.location && (
        <p className={cn("mt-[3px] text-[8px] font-semibold uppercase tracking-[0.16em]", LOCATION_CLASSES[p])}>
          {item.location}
        </p>
      )}

      {/* Description */}
      {item.description && (
        <p className="mt-[5px] max-w-[240px] text-[11px] leading-[1.52] text-foreground/36">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function StoryColumn({ label, items, prominence }: {
  label:      string
  items:      CareerTimelineItem[]
  prominence: Prominence
}) {
  return (
    <div>
      {/* Header — thin green left rail */}
      <div className="mb-[14px] border-l-[1.5px] border-accent/22 pl-[9px]">
        <h4 className="text-[8px] font-bold uppercase tracking-[0.26em] text-accent/56">
          {label}
        </h4>
      </div>

      <ul className="list-none">
        {items.map((item, ii) => (
          <li key={item.id} className={cn(ii > 0 && "mt-3 border-t border-white/[0.04] pt-3")}>
            <Milestone item={item} p={prominence} />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Featured strip ────────────────────────────────────────────────────────────

function FeaturedStrip({ items }: { items: CareerTimelineItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="relative mt-5 overflow-hidden rounded-[8px] border border-white/[0.09] bg-[oklch(0.106_0.008_160)]">
      {/* Green top accent gradient — "current career signal" indicator */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent" />

      <div className="px-5 py-4 sm:px-6 sm:py-[18px]">
        {items.map((item, ii) => {
          const year     = item.eventDate.slice(0, 4)
          const catLabel = CATEGORY_LABELS[item.category] ?? item.category

          return (
            <div key={item.id} className={cn(ii > 0 && "mt-4 border-t border-white/[0.06] pt-4")}>
              <div className="flex items-start justify-between gap-5">

                {/* Left: metadata + title + description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-[9px]">
                    <span className="text-[10px] font-bold tabular-nums text-foreground/45">{year}</span>
                    <span className="text-[7.5px] font-bold uppercase tracking-[0.26em] text-accent/78">
                      {catLabel}
                    </span>
                  </div>

                  <div className="mt-[4px]">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link text-[17px] font-black tracking-[-0.02em] text-foreground/96 transition-colors duration-150 hover:text-foreground sm:text-[18px]"
                      >
                        {item.title}
                        <ExternalLink
                          className="ml-1.5 inline h-[10px] w-[10px] translate-y-[-1px] text-foreground/22 transition-colors duration-150 group-hover/link:text-accent/55"
                          aria-hidden
                        />
                      </a>
                    ) : (
                      <p className="text-[17px] font-black tracking-[-0.02em] text-foreground/96 sm:text-[18px]">
                        {item.title}
                      </p>
                    )}
                  </div>

                  {item.description && (
                    <p className="mt-1.5 max-w-xl text-[12px] leading-[1.58] text-foreground/44">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Right: location */}
                {item.location && (
                  <div className="shrink-0 pt-[3px]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.20em] text-foreground/35">
                      {item.location}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )
        })}
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
  if (items.length === 0) return null

  // Route items: tour → featured strip; others → columns by category
  const featured: CareerTimelineItem[]      = []
  const columns:  CareerTimelineItem[][] = [[], [], []]

  for (const item of items) {
    if (item.category === "tour") {
      featured.push(item)
      continue
    }
    let placed = false
    for (let ci = 0; ci < COLUMNS.length; ci++) {
      if (COLUMNS[ci].categories.has(item.category)) {
        columns[ci].push(item)
        placed = true
        break
      }
    }
    if (!placed) columns[2].push(item)
  }

  const hasColumns = columns.some((c) => c.length > 0)
  if (featured.length === 0 && !hasColumns) return null

  const PROMINENCE: Prominence[] = ["high", "medium", "standard"]

  return (
    <section className="mt-10 lg:mt-12">
      <div className="mx-auto max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <SectionHeader>Artist Story</SectionHeader>

        {headline && (
          <h3 className="mt-3 max-w-xl text-[19px] font-black tracking-[-0.022em] text-foreground/84 sm:text-[22px]">
            {headline}
          </h3>
        )}

        {intro && (
          <p className="mt-2 max-w-2xl text-[12px] leading-[1.65] text-foreground/44 sm:text-[12.5px]">
            {intro}
          </p>
        )}

        {/* ── Featured strip ──────────────────────────────────────────────── */}
        <FeaturedStrip items={featured} />

        {/* ── 3-column matrix ─────────────────────────────────────────────── */}
        {hasColumns && (
          <div className={cn(
            "overflow-hidden rounded-[10px] border border-white/[0.05] bg-white/[0.018]",
            featured.length > 0 ? "mt-3" : "mt-5",
          )}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {COLUMNS.map((colDef, ci) => {
                const colItems = columns[ci]
                if (colItems.length === 0) return null

                return (
                  <div
                    key={colDef.id}
                    className={cn(
                      "p-5",
                      // Tablet: Roots column spans both cols (below row 1)
                      ci === 2 && "md:col-span-2 lg:col-span-1",
                      // Internal separators — responsive
                      // Col 1: top border on mobile → left border on tablet+
                      ci === 1 && "border-t border-white/[0.05] md:border-t-0 md:border-l",
                      // Col 2: top border on mobile+tablet → left border on desktop
                      ci === 2 && "border-t border-white/[0.05] lg:border-t-0 lg:border-l",
                    )}
                  >
                    <StoryColumn
                      label={colDef.label}
                      items={colItems}
                      prominence={PROMINENCE[ci]}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
