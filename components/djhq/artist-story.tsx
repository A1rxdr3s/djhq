import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id:         "international",
    label:      "International Momentum",
    categories: new Set(["tour", "international"]),
  },
  {
    id:         "releases",
    label:      "Releases & Recognition",
    categories: new Set(["chart", "festival", "release", "press"]),
  },
  {
    id:         "roots",
    label:      "Residencies & Roots",
    categories: new Set(["residency", "club_show", "other"]),
  },
] as const

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
// Column 0 item 0 = featured (Euro Tour 2026)
// Column 0 others = high (international milestones)
// Column 1        = medium (releases, chart, festival)
// Column 2        = standard (residencies, roots)

type Prominence = "featured" | "high" | "medium" | "standard"

function prominence(colIdx: number, itemIdx: number): Prominence {
  if (colIdx === 0 && itemIdx === 0) return "featured"
  if (colIdx === 0) return "high"
  if (colIdx === 1) return "medium"
  return "standard"
}

const TITLE_CLASS: Record<Prominence, string> = {
  featured: "text-[14px] sm:text-[15px] font-black  text-foreground/92 tracking-[-0.014em]",
  high:     "text-[13px] sm:text-[14px] font-black  text-foreground/85 tracking-[-0.012em]",
  medium:   "text-[13px] sm:text-[14px] font-bold   text-foreground/78 tracking-[-0.010em]",
  standard: "text-[12px] sm:text-[12px] font-semibold text-foreground/65 tracking-[-0.008em]",
}

const LOCATION_CLASS: Record<Prominence, string> = {
  featured: "text-foreground/26",
  high:     "text-foreground/22",
  medium:   "text-foreground/20",
  standard: "text-foreground/16",
}

// ── Milestone entry ───────────────────────────────────────────────────────────

function Milestone({ item, p }: { item: CareerTimelineItem; p: Prominence }) {
  const year = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div>
      {/* Year · Category */}
      <div className="flex items-baseline gap-[7px]">
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/26">
          {year}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.24em] text-accent/55">
          {catLabel}
        </span>
      </div>

      {/* Title */}
      <div className="mt-[3px]">
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/link leading-snug transition-colors duration-150 hover:text-foreground",
              TITLE_CLASS[p],
            )}
          >
            {item.title}
            <ExternalLink
              className="ml-1 inline h-[8px] w-[8px] translate-y-[-1px] text-foreground/16 transition-colors duration-150 group-hover/link:text-accent/45"
              aria-hidden
            />
          </a>
        ) : (
          <p className={cn("leading-snug", TITLE_CLASS[p])}>
            {item.title}
          </p>
        )}
      </div>

      {/* Location */}
      {item.location && (
        <p className={cn("mt-[3px] text-[8px] font-semibold uppercase tracking-[0.16em]", LOCATION_CLASS[p])}>
          {item.location}
        </p>
      )}

      {/* Description */}
      {item.description && (
        <p className="mt-[5px] max-w-[260px] text-[11px] leading-[1.52] text-foreground/32">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({
  label,
  items,
  colIdx,
}: {
  label: string
  items: CareerTimelineItem[]
  colIdx: number
}) {
  return (
    <div>
      {/* Column header — thin green left rail */}
      <div className="mb-4 border-l-[1.5px] border-accent/20 pl-[10px]">
        <h4 className="text-[8px] font-bold uppercase tracking-[0.24em] text-accent/58">
          {label}
        </h4>
      </div>

      {/* Milestone list */}
      <ul className="list-none">
        {items.map((item, ii) => (
          <li
            key={item.id}
            className={cn(ii > 0 && "mt-[14px] border-t border-white/[0.04] pt-[14px]")}
          >
            <Milestone item={item} p={prominence(colIdx, ii)} />
          </li>
        ))}
      </ul>
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

  // Distribute items into columns by category, preserving DB sort order
  const columns: CareerTimelineItem[][] = [[], [], []]
  for (const item of items) {
    let placed = false
    for (let ci = 0; ci < COLUMNS.length; ci++) {
      if (COLUMNS[ci].categories.has(item.category)) {
        columns[ci].push(item)
        placed = true
        break
      }
    }
    // Unmapped categories fall to roots column
    if (!placed) columns[2].push(item)
  }

  const hasContent = columns.some((c) => c.length > 0)
  if (!hasContent) return null

  return (
    <section className="mt-10 lg:mt-12">
      <div className="mx-auto max-w-5xl">

        {/* Section label */}
        <SectionHeader>Artist Story</SectionHeader>

        {/* Editorial headline */}
        {headline && (
          <h3 className="mt-3 max-w-xl text-[19px] font-black tracking-[-0.022em] text-foreground/76 sm:text-[22px]">
            {headline}
          </h3>
        )}

        {/* Intro paragraph */}
        {intro && (
          <p className="mt-2 max-w-2xl text-[12px] leading-[1.65] text-foreground/40 sm:text-[12.5px]">
            {intro}
          </p>
        )}

        {/* 3-column career matrix
            Mobile:  single column (stacked, top-border separators)
            Tablet:  2 columns — col 0 + col 1 side by side, col 2 below spanning both
            Desktop: true 3-column grid */}
        <div className={cn(
          "mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3",
          (headline || intro) ? "lg:mt-7" : "lg:mt-6",
        )}>

          {COLUMNS.map((colDef, ci) => {
            const colItems = columns[ci]
            if (colItems.length === 0) return null

            return (
              <div
                key={colDef.id}
                className={cn(
                  // Tablet: col 2 spans both columns (below row 1)
                  ci === 2 && "md:col-span-2 lg:col-span-1",
                  // Col 1 — top border on mobile only (removed at md since it's beside col 0)
                  ci === 1 && "mt-7 border-t border-white/[0.05] pt-7 md:mt-0 md:border-t-0 md:pt-0",
                  // Col 2 — top border on mobile + tablet (below row 1); removed at lg (joins row)
                  ci === 2 && "mt-7 border-t border-white/[0.05] pt-7 lg:mt-0 lg:border-t-0 lg:pt-0",
                )}
              >
                <Column label={colDef.label} items={colItems} colIdx={ci} />
              </div>
            )
          })}

        </div>
      </div>
    </section>
  )
}
