import { ExternalLink } from "lucide-react"
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

function groupByYear(items: CareerTimelineItem[]) {
  const result: { year: string; items: CareerTimelineItem[] }[] = []
  for (const item of items) {
    const year = item.eventDate.slice(0, 4)
    const last = result[result.length - 1]
    if (last?.year === year) {
      last.items.push(item)
    } else {
      result.push({ year, items: [item] })
    }
  }
  return result
}

function YearGroup({
  year,
  items,
  isFirstGroup,
  isTopOfSection,
  compact = false,
}: {
  year: string
  items: CareerTimelineItem[]
  isFirstGroup: boolean
  isTopOfSection: boolean
  compact?: boolean
}) {
  return (
    <div className={cn("flex gap-5 sm:gap-6", !isFirstGroup && "mt-5 border-t border-white/[0.05] pt-5")}>
      {/* Year rail */}
      <div className="w-10 shrink-0 pt-[3px] sm:w-[46px]">
        <span className="text-[11px] font-black tabular-nums leading-none tracking-tight text-foreground/26 sm:text-[12px]">
          {year}
        </span>
      </div>

      {/* Milestones */}
      <div className="flex-1 min-w-0">
        {items.map((item, ii) => {
          const isHero = isTopOfSection && ii === 0
          const titleSize = isHero
            ? "text-[15px] sm:text-[16px]"
            : compact
            ? "text-[12px] sm:text-[13px]"
            : "text-[13px] sm:text-[14px]"
          const titleColor = isHero ? "text-foreground/92" : "text-foreground/82"

          return (
            <div key={item.id} className={cn(ii > 0 && "mt-4 border-t border-white/[0.04] pt-4")}>

              {/* Category + location — metadata row */}
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent/55">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                {item.location && (
                  <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-foreground/20">
                    {item.location}
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="mt-[3px]">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group/link font-black leading-snug tracking-[-0.012em] transition-colors duration-150 hover:text-foreground",
                      titleSize,
                      titleColor,
                    )}
                  >
                    {item.title}
                    <ExternalLink
                      className="ml-1 inline h-[9px] w-[9px] translate-y-[-1px] text-foreground/18 transition-colors duration-150 group-hover/link:text-accent/50"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <p className={cn("font-black leading-snug tracking-[-0.012em]", titleSize, titleColor)}>
                    {item.title}
                  </p>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p className="mt-1 max-w-[300px] text-[11px] leading-[1.58] text-foreground/33">
                  {item.description}
                </p>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ArtistStoryProps {
  items: CareerTimelineItem[]
  headline?: string
}

export function ArtistStory({ items, headline }: ArtistStoryProps) {
  if (items.length === 0) return null

  const mid = Math.ceil(items.length / 2)
  const leftGroups = groupByYear(items.slice(0, mid))
  const rightGroups = groupByYear(items.slice(mid))

  return (
    <section className="mt-10 lg:mt-14">
      <div className="mx-auto max-w-5xl">
        <SectionHeader>Artist Story</SectionHeader>

        {headline && (
          <h3 className="mt-3 max-w-xl text-[21px] font-black tracking-[-0.022em] text-foreground/75 sm:text-[24px]">
            {headline}
          </h3>
        )}

        <div className="mt-6 grid grid-cols-1 gap-x-10 lg:mt-7 lg:grid-cols-2">

          {/* Left — current arc */}
          <div>
            {leftGroups.map((group, gi) => (
              <YearGroup
                key={group.year}
                year={group.year}
                items={group.items}
                isFirstGroup={gi === 0}
                isTopOfSection={gi === 0}
              />
            ))}
          </div>

          {/* Right — foundation arc */}
          {rightGroups.length > 0 && (
            <div className="mt-8 border-t border-white/[0.05] pt-8 lg:mt-0 lg:border-t-0 lg:pt-0">
              {rightGroups.map((group, gi) => (
                <YearGroup
                  key={group.year}
                  year={group.year}
                  items={group.items}
                  isFirstGroup={gi === 0}
                  isTopOfSection={false}
                  compact
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
