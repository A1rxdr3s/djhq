"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Gig } from "@/types/djhq"

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function parseGigDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    day: String(d.getUTCDate()),
    month: MONTHS[d.getUTCMonth()],
  }
}

// Selects up to 3 gigs for display.
// Prefers upcoming gigs; backfills with the most-recent past gigs when fewer
// than 3 upcoming exist. Input must be sorted ascending by date (as the DB provides).
// Output is also ascending: past gigs always precede upcoming gigs chronologically,
// so no secondary sort is required.
function selectGigsForDisplay(
  gigs: Gig[],
  today: string,
): { gig: Gig; isPast: boolean }[] {
  const upcoming = gigs.filter((g) => g.date.slice(0, 10) >= today)
  const past = gigs.filter((g) => g.date.slice(0, 10) < today)

  const selectedUpcoming = upcoming.slice(0, 3)
  const backfillCount = 3 - selectedUpcoming.length
  // Past gigs are ascending — most recent are at the tail; slice from the end.
  const selectedPast = backfillCount > 0 ? past.slice(-backfillCount) : []

  return [
    ...selectedPast.map((g) => ({ gig: g, isPast: true })),
    ...selectedUpcoming.map((g) => ({ gig: g, isPast: false })),
  ]
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
}

type GigsSectionProps = {
  gigs: Gig[]
}

export function GigsSection({ gigs }: GigsSectionProps) {
  if (gigs.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  const selected = selectGigsForDisplay(gigs, today)
  if (selected.length === 0) return null

  // NEXT label: only on the first upcoming gig in the display set.
  const firstUpcomingIndex = selected.findIndex((s) => !s.isPast)

  return (
    <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:col-start-2 lg:row-start-2 lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">
        Upcoming Gigs
      </h2>

      <motion.div
        className="mt-4 flex flex-col gap-1"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-24px" }}
      >
        {selected.map(({ gig, isPast }, i) => {
          const { day, month } = parseGigDate(gig.date)
          const isNext = i === firstUpcomingIndex && firstUpcomingIndex !== -1

          return (
            <motion.div key={gig.id} variants={item}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                  "border transition-colors duration-200",
                  isNext
                    ? "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04]"
                    : isPast
                    ? "border-transparent"
                    : "border-transparent hover:bg-white/[0.03]",
                )}
              >
                {/* Date tile — day prominent, month small */}
                <div
                  className={cn(
                    "flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-lg border",
                    isPast
                      ? "border-white/[0.04] bg-transparent"
                      : "border-white/[0.07] bg-white/[0.025]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[14px] font-black leading-none",
                      isPast ? "text-foreground/30" : "text-foreground/80",
                    )}
                  >
                    {day}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[6.5px] font-bold uppercase tracking-widest",
                      isPast
                        ? "text-muted-foreground/20"
                        : isNext
                        ? "text-accent/65"
                        : "text-muted-foreground/35",
                    )}
                  >
                    {month}
                  </span>
                </div>

                {/* Show info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    {isNext && (
                      <span className="shrink-0 text-[7px] font-bold uppercase tracking-[0.28em] text-accent/65">
                        Next
                      </span>
                    )}
                    <p
                      className={cn(
                        "truncate text-[13px] font-semibold leading-tight",
                        isPast ? "text-foreground/38" : "text-foreground/85",
                      )}
                    >
                      {gig.venue}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                      isPast ? "text-foreground/18" : "text-foreground/30",
                    )}
                  >
                    {gig.city}
                    {gig.country && (
                      <>
                        <span className="mx-1 text-foreground/12">·</span>
                        {gig.country}
                      </>
                    )}
                  </p>
                </div>

                {/* Ticket link */}
                {gig.ticketUrl ? (
                  <a
                    href={gig.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Tickets for ${gig.venue}`}
                    className={cn(
                      "shrink-0 transition-colors duration-200",
                      isPast
                        ? "text-muted-foreground/20 hover:text-muted-foreground/40"
                        : "text-accent/35 hover:text-accent/80",
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
