import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import type {
  ArtistStoryChapter,
  ArtistStoryMilestone,
  MilestoneImportance,
} from "@/types/djhq"

// ── Category display labels ───────────────────────────────────────────────────

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

// ── Importance-based typography tokens ───────────────────────────────────────
// All visual hierarchy is driven exclusively by milestone.importance.
// No title, venue, or artist-specific checks anywhere in this file.

const TITLE_CLASS: Record<MilestoneImportance, string> = {
  featured: "text-[14px] sm:text-[14.5px] font-black  tracking-[-0.018em] text-foreground/95 leading-snug",
  major:    "text-[13px] sm:text-[13.5px] font-bold   tracking-[-0.012em] text-foreground/84 leading-snug",
  standard: "text-[12.5px]               font-semibold tracking-[-0.007em] text-foreground/70 leading-snug",
  minor:    "text-[12px]                 font-semibold tracking-[-0.004em] text-foreground/52 leading-snug",
}

const CAT_CLASS: Record<MilestoneImportance, string> = {
  featured: "text-accent/70",
  major:    "text-accent/56",
  standard: "text-accent/44",
  minor:    "text-accent/32",
}

const DESC_CLASS: Record<MilestoneImportance, string> = {
  featured: "text-[11.5px] leading-[1.55] text-foreground/50",
  major:    "text-[11px]   leading-[1.52] text-foreground/44",
  standard: "text-[10.5px] leading-[1.50] text-foreground/38",
  minor:    "text-[10px]   leading-[1.48] text-foreground/30",
}

const MILESTONE_GAP: Record<MilestoneImportance, string> = {
  featured: "mt-[14px]",
  major:    "mt-[11px]",
  standard: "mt-[10px]",
  minor:    "mt-[9px]",
}

// ── Milestone entry ───────────────────────────────────────────────────────────

function MilestoneEntry({
  milestone,
  isFirst,
}: {
  milestone: ArtistStoryMilestone
  isFirst:   boolean
}) {
  const imp      = milestone.importance
  const catLabel = CATEGORY_LABELS[milestone.category] ?? milestone.category

  return (
    <div className={cn(!isFirst && MILESTONE_GAP[imp])}>
      {/* Category — Title · Location */}
      <div className="flex flex-wrap items-baseline gap-x-[5px] gap-y-[1px]">
        <span
          className={cn(
            "shrink-0 text-[7px] font-bold uppercase tracking-[0.22em]",
            CAT_CLASS[imp],
          )}
        >
          {catLabel}
        </span>
        <span className="shrink-0 text-[9px] text-foreground/16" aria-hidden>
          —
        </span>
        <span className={TITLE_CLASS[imp]}>{milestone.title}</span>
        {milestone.location && (
          <>
            <span className="shrink-0 text-[8px] text-foreground/14" aria-hidden>
              ·
            </span>
            <span className="shrink-0 text-[7.5px] font-medium uppercase tracking-[0.11em] text-foreground/26">
              {milestone.location}
            </span>
          </>
        )}
      </div>

      {/* Description */}
      <p className={cn("mt-[4px]", DESC_CLASS[imp])}>{milestone.description}</p>
    </div>
  )
}

// ── Year group ────────────────────────────────────────────────────────────────

function YearGroup({
  year,
  milestones,
  isFirst,
}: {
  year:       number
  milestones: ArtistStoryMilestone[]
  isFirst:    boolean
}) {
  return (
    <div
      className={cn(
        "flex gap-[18px] sm:gap-[22px]",
        !isFirst && "mt-[20px] border-t border-white/[0.05] pt-[20px]",
      )}
    >
      {/* Year anchor — large, muted */}
      <div className="w-[38px] shrink-0 pt-[3px] sm:w-[42px]">
        <span className="block text-[13px] font-black tabular-nums leading-none text-foreground/[0.20] sm:text-[14px]">
          {year}
        </span>
      </div>

      {/* Milestone entries */}
      <div className="min-w-0 flex-1">
        {milestones.map((m, i) => (
          <MilestoneEntry key={m.id} milestone={m} isFirst={i === 0} />
        ))}
      </div>
    </div>
  )
}

// ── Chapter column ────────────────────────────────────────────────────────────

type YearBand = { year: number; milestones: ArtistStoryMilestone[] }

function buildYearBands(milestones: ArtistStoryMilestone[]): YearBand[] {
  const map = new Map<number, ArtistStoryMilestone[]>()
  for (const m of milestones) {
    const existing = map.get(m.year)
    if (existing) existing.push(m)
    else map.set(m.year, [m])
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a) // newest year first
    .map(([year, ms]) => ({
      year,
      milestones: [...ms].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
}

function ChapterColumn({ chapter, milestones }: { chapter: ArtistStoryChapter; milestones: ArtistStoryMilestone[] }) {
  const yearBands = buildYearBands(milestones)
  if (yearBands.length === 0) return null

  return (
    <div>
      {/* Chapter header */}
      <div className="mb-[14px] border-b border-white/[0.05] pb-[9px]">
        <div className="flex items-baseline gap-[8px]">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.26em] text-foreground/32">
            {chapter.title}
          </span>
          {chapter.rangeLabel && (
            <span className="text-[7px] tabular-nums text-foreground/18">
              {chapter.rangeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Year bands */}
      {yearBands.map((band, i) => (
        <YearGroup
          key={band.year}
          year={band.year}
          milestones={band.milestones}
          isFirst={i === 0}
        />
      ))}
    </div>
  )
}

// ── Grid column class by chapter count ───────────────────────────────────────

function gridClass(count: number): string {
  if (count === 1) return "lg:grid-cols-1 lg:max-w-xl"
  if (count === 2) return "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
  return "lg:grid-cols-3"
}

// ── ArtistStory ───────────────────────────────────────────────────────────────

export interface ArtistStoryProps {
  chapters:   ArtistStoryChapter[]
  milestones: ArtistStoryMilestone[]
  headline?:  string
  intro?:     string
}

export function ArtistStory({ chapters, milestones, headline, intro }: ArtistStoryProps) {
  const visible = milestones.filter((m) => m.isVisible)
  if (visible.length === 0) return null

  // Sort chapters by order
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order)

  // Build a milestone lookup by chapterId
  const byChapter = new Map<string, ArtistStoryMilestone[]>()
  for (const m of visible) {
    const arr = byChapter.get(m.chapterId)
    if (arr) arr.push(m)
    else byChapter.set(m.chapterId, [m])
  }

  // Only render chapters that have at least one visible milestone
  const activeChapters = sortedChapters.filter((c) => (byChapter.get(c.id)?.length ?? 0) > 0)
  if (activeChapters.length === 0) return null

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

        {/* Two-column editorial layout — all milestones always visible */}
        <div
          className={cn(
            "mt-6 grid grid-cols-1 gap-x-10 gap-y-8 xl:gap-x-14",
            gridClass(activeChapters.length),
          )}
        >
          {activeChapters.map((chapter) => (
            <ChapterColumn
              key={chapter.id}
              chapter={chapter}
              milestones={byChapter.get(chapter.id) ?? []}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
