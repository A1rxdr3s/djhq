"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Instagram, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
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

const STATUS_CONFIG: Record<GigEventStatus, { label: string; className: string }> = {
  upcoming:  { label: "Upcoming",  className: "border-accent/30 bg-accent/10 text-accent/75" },
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
        "group flex items-center gap-3 rounded-xl px-2 py-2",
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
          "flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg border",
          isPast
            ? "border-white/[0.04] bg-transparent"
            : isNext
            ? "border-accent/20 bg-accent/[0.06]"
            : "border-white/[0.07] bg-white/[0.025]",
        )}
      >
        <span
          className={cn(
            "text-[26px] font-black leading-none tracking-tight",
            isPast ? "text-foreground/22" : "text-foreground/82",
          )}
        >
          {day}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[7px] font-bold uppercase tracking-[0.18em]",
            isPast ? "text-muted-foreground/18" : "text-accent/60",
          )}
        >
          {month}
        </span>
      </div>

      {/* Content: event name → club venue → location */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[13px] font-semibold uppercase leading-tight tracking-[0.06em]",
              isPast ? "text-foreground/30" : "text-foreground/85",
            )}
          >
            {gig.venue}
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

        {gig.clubVenue && (
          <p
            className={cn(
              "mt-0.5 truncate text-sm leading-tight",
              isPast ? "text-white/18" : "text-white/60",
            )}
          >
            {gig.clubVenue}
          </p>
        )}

        {locationStr && (
          <p
            className={cn(
              "mt-0.5 truncate text-xs font-medium uppercase tracking-[0.08em]",
              isPast ? "text-white/14" : "text-white/50",
            )}
          >
            {locationStr}
          </p>
        )}
      </div>

      {/* Icon action buttons */}
      {(showTicket || !!gig.instagramUrl) && (
        <div className="flex shrink-0 items-center gap-2.5">
          {showTicket && gig.ticketUrl && (
            <a
              href={gig.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Tickets"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 bg-accent/5 text-accent/90 transition-all duration-150 hover:scale-[1.05] hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            >
              <Ticket className="h-5 w-5" />
            </a>
          )}
          {gig.instagramUrl && (
            <a
              href={gig.instagramUrl}
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

  const hasUpcoming = upcoming.length > 0
  const hasPast = past.length > 0

  // Primary list: upcoming (up to 3), or most recent past if no upcoming
  const primaryGigs = hasUpcoming ? upcoming.slice(0, 3) : past.slice(0, 3)
  if (primaryGigs.length === 0) return null

  const sectionTitle = hasUpcoming ? "Next Shows" : "Recent Shows"
  const PAST_PAGE = 10
  const visiblePast = showAllPast ? past : past.slice(0, PAST_PAGE)
  const hasMorePast = past.length > PAST_PAGE
  const pastGroups = hasPast ? groupByYear(visiblePast) : []

  return (
    <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:col-start-2 lg:row-start-2 lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">
        {sectionTitle}
      </h2>

      {/* Primary shows */}
      <motion.div
        className="mt-4 flex flex-col gap-1.5"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-24px" }}
      >
        {primaryGigs.map((gig, i) => (
          <motion.div key={gig.id} variants={item}>
            <GigRow gig={gig} isNext={hasUpcoming && i === 0} isPast={!hasUpcoming} />
          </motion.div>
        ))}
      </motion.div>

      {/* Past shows toggle — only shown when upcoming is the primary content */}
      {hasUpcoming && hasPast && (
        <button
          type="button"
          onClick={() => setPastExpanded((v) => !v)}
          className="mt-4 inline-flex w-full items-center gap-2 border-t border-white/[0.06] pt-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-white/50 transition-colors duration-150 hover:text-accent"
        >
          {pastExpanded ? "Hide Past Shows ↑" : "View Past Shows →"}
        </button>
      )}

      {/* Past shows — grouped by year, most recent first */}
      <AnimatePresence initial={false}>
        {hasUpcoming && pastExpanded && hasPast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-3 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Past Shows
              </p>
              <div className="space-y-4 opacity-75">
                {pastGroups.map(({ year, gigs: yearGigs }) => (
                  <div key={year}>
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">
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
                  className="text-xs font-medium uppercase tracking-[0.14em] text-white/35 transition-colors duration-150 hover:text-accent"
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
