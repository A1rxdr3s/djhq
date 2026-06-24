import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Column definitions ────────────────────────────────────────────────────────
// `tour` category → featured strip above the matrix (not placed in any column).

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

// ── Prominence ────────────────────────────────────────────────────────────────
// high     = International Stages (TABU Bali, Pacha, MMW — strong secondaries)
// medium   = Releases & Recognition (ICE Festival, Dark Room Mind — prominent)
// standard = Residencies & Roots (Club Room, Misa, La Feria — foundation items)

type Prominence = "high" | "medium" | "standard"

const TITLE_CLASSES: Record<Prominence, string> = {
  high:     "text-[13px] sm:text-[14px] font-black   text-foreground/92 tracking-[-0.014em] leading-snug",
  medium:   "text-[12.5px] sm:text-[13px] font-bold  text-foreground/83 tracking-[-0.011em] leading-snug",
  standard: "text-[11.5px] sm:text-[12px] font-medium text-foreground/68 tracking-[-0.006em] leading-snug",
}

const LOCATION_CLASSES: Record<Prominence, string> = {
  high:     "text-foreground/32",
  medium:   "text-foreground/26",
  standard: "text-foreground/20",
}

// ── Milestone entry ───────────────────────────────────────────────────────────

function Milestone({ item, p }: { item: CareerTimelineItem; p: Prominence }) {
  const year     = item.eventDate.slice(0, 4)
  const catLabel = CATEGORY_LABELS[item.category] ?? item.category

  return (
    <div>
      {/* Year · Category — green signal dot marks high/medium prominence items */}
      <div className="flex items-center gap-[5px]">
        {p !== "standard" && (
          <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-accent/40" aria-hidden />
        )}
        <span className="text-[10px] font-bold tabular-nums leading-none text-foreground/36">
          {year}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-accent/60">
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
            className={cn("group/link transition-colors duration-150 hover:text-foreground", TITLE_CLASSES[p])}
          >
            {item.title}
            <ExternalLink
              className="ml-1 inline h-[8px] w-[8px] translate-y-[-1px] text-foreground/16 transition-colors duration-150 group-hover/link:text-accent/42"
              aria-hidden
            />
          </a>
        ) : (
          <p className={TITLE_CLASSES[p]}>{item.title}</p>
        )}
      </div>

      {/* Location */}
      {item.location && (
        <p className={cn("mt-[2px] text-[8px] font-semibold uppercase tracking-[0.15em]", LOCATION_CLASSES[p])}>
          {item.location}
        </p>
      )}

      {/* Description — slightly tighter than before, improved contrast */}
      {item.description && (
        <p className="mt-[4px] max-w-[240px] text-[11px] leading-[1.46] text-foreground/42">
          {item.description}
        </p>
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function StoryColumn({
  label,
  items,
  prominence,
}: {
  label:      string
  items:      CareerTimelineItem[]
  prominence: Prominence
}) {
  return (
    <div>
      {/* Column header — green left rail keeps columns distinct without boxing them */}
      <div className="mb-3 border-l-[1.5px] border-accent/20 pl-[9px]">
        <h4 className="text-[7.5px] font-bold uppercase tracking-[0.26em] text-accent/55">
          {label}
        </h4>
      </div>

      <ul className="list-none">
        {items.map((item, ii) => (
          <li
            key={item.id}
            className={cn(ii > 0 && "mt-[9px] border-t border-white/[0.035] pt-[9px]")}
          >
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
    // Slightly green-tinted dark bg + thin border + 1px green accent line.
    // Intentionally compact — a signal, not a card.
    <div className="relative mt-5 overflow-hidden rounded-[5px] border border-white/[0.06] bg-[oklch(0.105_0.007_160)]">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/48 via-accent/14 to-transparent" />

      <div className="px-5 py-[13px] sm:py-[15px]">
        {items.map((item, ii) => {
          const year     = item.eventDate.slice(0, 4)
          const catLabel = CATEGORY_LABELS[item.category] ?? item.category

          return (
            <div key={item.id} className={cn(ii > 0 && "mt-3 border-t border-white/[0.05] pt-3")}>
              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0 flex-1">
                  {/* Year + Category */}
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[10px] font-bold tabular-nums text-foreground/44">{year}</span>
                    <span className="text-[7.5px] font-bold uppercase tracking-[0.26em] text-accent/72">
                      {catLabel}
                    </span>
                  </div>

                  {/* Title — strongest item in section */}
                  <div className="mt-[4px]">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link text-[15px] font-black tracking-[-0.018em] text-foreground/96 transition-colors duration-150 hover:text-foreground sm:text-[16px]"
                      >
                        {item.title}
                        <ExternalLink
                          className="ml-1.5 inline h-[9px] w-[9px] translate-y-[-1px] text-foreground/20 transition-colors duration-150 group-hover/link:text-accent/52"
                          aria-hidden
                        />
                      </a>
                    ) : (
                      <p className="text-[15px] font-black tracking-[-0.018em] text-foreground/96 sm:text-[16px]">
                        {item.title}
                      </p>
                    )}
                  </div>

                  {item.description && (
                    <p className="mt-[6px] max-w-lg text-[11.5px] leading-[1.55] text-foreground/46">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Location — right-aligned, editorial metadata */}
                {item.location && (
                  <div className="shrink-0 pt-[2px]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-foreground/34">
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
  const featured: CareerTimelineItem[]   = []
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

        {/* ── Section header ─────────────────────────────────────────────── */}
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

        {/* ── Featured strip ──────────────────────────────────────────────── */}
        <FeaturedStrip items={featured} />

        {/* ── 3-column career matrix ──────────────────────────────────────── */}
        {hasColumns && (
          <div
            className={cn(
              // Faint panel — barely-there background + very subtle border.
              // Avoids the pricing-table look while keeping columns visually grouped.
              "overflow-hidden rounded-[7px] border border-white/[0.04] bg-white/[0.012]",
              featured.length > 0 ? "mt-2.5" : "mt-5",
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {COLUMNS.map((colDef, ci) => {
                const colItems = columns[ci]
                if (colItems.length === 0) return null

                return (
                  <div
                    key={colDef.id}
                    className={cn(
                      "p-4",
                      // Tablet: Roots spans both columns (below International + Releases)
                      ci === 2 && "md:col-span-2 lg:col-span-1",
                      // Col 1: top border on mobile → left border on tablet+
                      ci === 1 && "border-t border-white/[0.04] md:border-t-0 md:border-l",
                      // Col 2: top border on mobile+tablet → left border on desktop
                      ci === 2 && "border-t border-white/[0.04] lg:border-t-0 lg:border-l",
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
