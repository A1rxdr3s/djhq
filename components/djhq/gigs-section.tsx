"use client"

import { useState } from "react"
import { SectionHeader } from "@/components/djhq/section-header"
import { motion, AnimatePresence } from "framer-motion"
import { Instagram, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveSafeHref } from "@/lib/safe-url"
import type { Gig, GigEventStatus } from "@/types/djhq"

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function parseGigDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    day: String(d.getUTCDate()),
    month: MONTHS[d.getUTCMonth()],
  }
}

function groupByYear(gigs: Gig[]): { year: number; gigs: Gig[] }[] {
  const map = new Map<number, Gig[]>()
  for (const gig of gigs) {
    const y = new Date(gig.date).getUTCFullYear()
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(gig)
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, gigs]) => ({ year, gigs }))
}

// "upcoming" is intentionally omitted: it is the default state for any future show
// and is already communicated by the section heading and the isNext accent highlight.
// Only non-default, actionable states get a visible badge.
const STATUS_CONFIG: Partial<Record<GigEventStatus, { label: string; className: string }>> = {
  sold_out:  { label: "Sold Out",  className: "border-amber-500/30 bg-amber-500/10 text-amber-400/80" },
  cancelled: { label: "Cancelled", className: "border-red-500/30 bg-red-500/10 text-red-400/70" },
  past:      { label: "Past",      className: "border-white/[0.12] bg-white/[0.04] text-white/35" },
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

type GigRowProps = {
  gig: Gig
  isNext: boolean
  isPast: boolean
}

function GigRow({ gig, isNext, isPast }: GigRowProps) {
  const { day, month } = parseGigDate(gig.date)
  const statusConfig = gig.eventStatus ? STATUS_CONFIG[gig.eventStatus] : null
  const locationStr = [gig.city, gig.country].filter(Boolean).join(" • ")
  const showTicket = !isPast && !!gig.ticketUrl

  return (
    <div
      className={cn(
        "group flex items-center gap-3.5 rounded-xl px-2.5 py-3 xl:px-4 xl:py-4",
        "border transition-colors duration-200",
        isNext
          ? "border-accent/25 bg-accent/[0.04] hover:bg-accent/[0.06]"
          : isPast
          ? "border-transparent hover:bg-white/[0.015]"
          : "border-transparent hover:bg-white/[0.025]",
      )}
    >
      {/* Date tile */}
      <div
        className={cn(
          "flex h-16 w-[3rem] lg:h-[4.5rem] lg:w-[3.25rem] xl:h-[4.75rem] xl:w-[3.5rem] shrink-0 flex-col items-center justify-center rounded-xl border",
          isPast
            ? "border-white/[0.04] bg-transparent"
            : isNext
            ? "border-accent/20 bg-accent/[0.06]"
            : "border-white/[0.07] bg-white/[0.025]",
        )}
      >
        <span
          className={cn(
            "text-2xl lg:text-[1.75rem] xl:text-[2rem] font-black leading-none tracking-tight",
            isPast ? "text-foreground/22" : "text-foreground/82",
          )}
        >
          {day}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em]",
            isPast ? "text-muted-foreground/18" : "text-accent/60",
          )}
        >
          {month}
        </span>
      </div>

      {/* Content: event name → venue → room → location */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[15px] xl:text-[17px] font-semibold uppercase leading-tight tracking-[0.04em]",
              isPast ? "text-foreground/30" : "text-foreground/92",
            )}
          >
            {/* If event name exists, show it as primary; otherwise fall back to venue */}
            {gig.eventName || gig.venue}
          </p>
          {statusConfig && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                statusConfig.className,
              )}
            >
              {statusConfig.label}
            </span>
          )}
        </div>

        {/* Venue shown as context line only when event name is displayed above it */}
        {gig.eventName && gig.venue && (
          <p
            className={cn(
              "mt-0.5 truncate text-xs font-medium leading-tight",
              isPast ? "text-white/18" : "text-white/55",
            )}
          >
            {gig.venue}
          </p>
        )}

        {gig.clubVenue && (
          <p
            className={cn(
              "mt-0.5 truncate text-xs leading-tight",
              isPast ? "text-white/14" : "text-white/40",
            )}
          >
            {gig.clubVenue}
          </p>
        )}

        {locationStr && (
          <p
            className={cn(
              "mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.08em]",
              isPast ? "text-white/14" : "text-white/35",
            )}
          >
            {locationStr}
          </p>
        )}
      </div>

      {/* Icon action buttons */}
      {(showTicket || !!gig.instagramUrl) && (
        <div className="flex shrink-0 items-center gap-2.5">
          {showTicket && gig.ticketUrl && resolveSafeHref(gig.ticketUrl) && (
            <a
              href={resolveSafeHref(gig.ticketUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Tickets"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 bg-accent/5 text-accent/90 transition-all duration-150 hover:scale-[1.05] hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            >
              <Ticket className="h-5 w-5" />
            </a>
          )}
          {gig.instagramUrl && resolveSafeHref(gig.instagramUrl) && (
            <a
              href={resolveSafeHref(gig.instagramUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150",
                isPast
                  ? "border-white/[0.08] bg-white/[0.02] text-white/25 hover:bg-white/[0.04] hover:text-white/40"
                  : "border-accent/20 bg-accent/5 text-accent/90 hover:scale-[1.05] hover:border-accent/40 hover:bg-accent/10 hover:text-accent",
              )}
            >
              <Instagram className="h-5 w-5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

type GigsSectionProps = {
  gigs: Gig[]
}

export function GigsSection({ gigs }: GigsSectionProps) {
  const [pastExpanded, setPastExpanded] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)

  if (gigs.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = gigs.filter((g) => g.date.slice(0, 10) >= today)
  // Reverse so most recent past is first
  const past = [...gigs.filter((g) => g.date.slice(0, 10) < today)].reverse()

  // Fill primary list to a minimum of 3 rows: upcoming first, then most recent past
  const upcomingSlice = upcoming.slice(0, 3)
  const fillCount = 3 - upcomingSlice.length
  const fillFromPast = past.slice(0, fillCount)
  const primaryGigs = [...upcomingSlice, ...fillFromPast]
  if (primaryGigs.length === 0) return null

  // Past shows available for the toggle — exclude rows already shown as fill
  const pastForToggle = past.slice(fillCount)
  const hasPastToggle = pastForToggle.length > 0

  const PAST_PAGE = 10
  const visiblePast = showAllPast ? pastForToggle : pastForToggle.slice(0, PAST_PAGE)
  const hasMorePast = pastForToggle.length > PAST_PAGE
  const pastGroups = hasPastToggle ? groupByYear(visiblePast) : []

  return (
    <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:flex lg:h-full lg:flex-col lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5 xl:p-7 xl:pt-6">
      <SectionHeader>Shows</SectionHeader>

      <div className="mt-4 lg:flex-1">
        {/* Upcoming rows */}
        {upcomingSlice.length > 0 && (
          <motion.div
            className="flex flex-col gap-1.5"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-24px" }}
          >
            {upcomingSlice.map((gig, i) => (
              <motion.div key={gig.id} variants={item}>
                <GigRow gig={gig} isNext={i === 0} isPast={false} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Divider — only in the mixed state */}
        {upcomingSlice.length > 0 && fillFromPast.length > 0 && (
          <div className="mt-3 mb-3 h-px bg-white/[0.08]" />
        )}

        {/* Recent filler rows */}
        {fillFromPast.length > 0 && (
          <motion.div
            className="flex flex-col gap-1.5"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-24px" }}
          >
            {fillFromPast.map((gig) => (
              <motion.div key={gig.id} variants={item}>
                <GigRow gig={gig} isNext={false} isPast={false} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Past shows toggle */}
      {hasPastToggle && (
        <button
          type="button"
          onClick={() => setPastExpanded((v) => !v)}
          className="mt-4 inline-flex w-full items-center gap-2 border-t border-white/[0.06] pt-3 text-left text-xs font-semibold uppercase tracking-[0.20em] text-white/45 transition-colors duration-200 hover:text-accent lg:mt-auto"
        >
          {pastExpanded ? "Hide Past Shows ↑" : "View Past Shows →"}
        </button>
      )}

      {/* Past shows — grouped by year, most recent first */}
      <AnimatePresence initial={false}>
        {pastExpanded && hasPastToggle && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-3 space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/48">
                Past Shows
              </p>
              <div className="space-y-4 opacity-75">
                {pastGroups.map(({ year, gigs: yearGigs }) => (
                  <div key={year}>
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/32">
                      {year}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {yearGigs.map((gig) => (
                        <GigRow key={gig.id} gig={gig} isNext={false} isPast />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {hasMorePast && !showAllPast && (
                <button
                  type="button"
                  onClick={() => setShowAllPast(true)}
                  className="text-xs font-semibold uppercase tracking-[0.20em] text-white/38 transition-colors duration-200 hover:text-accent"
                >
                  Show More →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
