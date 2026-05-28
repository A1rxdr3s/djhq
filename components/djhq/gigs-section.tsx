"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Gig } from "@/types/djhq"

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function parseGigDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: MONTHS[d.getUTCMonth()],
  }
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const row = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
}

type GigsSectionProps = {
  gigs: Gig[]
}

export function GigsSection({ gigs }: GigsSectionProps) {
  if (gigs.length === 0) return null

  const [next, ...rest] = gigs
  const { day: nd, month: nm } = parseGigDate(next.date)

  return (
    <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:col-start-2 lg:row-start-2 lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">
        Upcoming Gigs
      </h2>

      <motion.div
        className="mt-4 flex flex-col gap-2"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-24px" }}
      >
        {/* NEXT — date tile is the primary visual anchor */}
        <motion.div variants={row}>
          <div
            className={cn(
              "group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5",
              "transition-colors duration-300 ease-out",
              "hover:bg-white/[0.04]",
            )}
          >
            {/* Category label — reads first but visually quiet */}
            <span className="mb-2.5 block text-[8px] font-bold uppercase tracking-[0.36em] text-accent/50">
              Next
            </span>

            <div className="flex items-center gap-3.5">
              {/* Date tile — the dominant visual element */}
              <div
                className={cn(
                  "flex w-14 shrink-0 flex-col items-center rounded-xl",
                  "border border-white/[0.08] bg-white/[0.05]",
                  "py-3 transition-colors duration-300",
                  "group-hover:border-white/[0.14]",
                )}
              >
                <span className="text-[2.5rem] font-black leading-none tracking-[-0.04em] text-foreground">
                  {nd}
                </span>
                <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.26em] text-accent">
                  {nm}
                </span>
              </div>

              {/* Show info — secondary to the date */}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-foreground/90">
                  {next.venue}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/35">
                  {next.city}
                  <span className="mx-1.5 text-foreground/18">·</span>
                  {next.country}
                </p>
                {next.ticketUrl ? (
                  <a
                    href={next.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent/60 transition-colors duration-200 hover:text-accent"
                  >
                    Tickets
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Compact rows — remaining gigs */}
        {rest.map((gig) => {
          const { day, month } = parseGigDate(gig.date)
          return (
            <motion.div key={gig.id} variants={row}>
              <div
                className={cn(
                  "group flex items-center gap-4 rounded-xl px-3 py-2.5",
                  "transition-colors duration-200 hover:bg-white/[0.04]",
                )}
              >
                <span className="w-12 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground/50">
                  {day} {month}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-foreground/80">
                  {gig.venue}
                </span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/28">
                  {gig.city}
                </span>
                {gig.ticketUrl ? (
                  <a
                    href={gig.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Tickets for ${gig.venue}`}
                    className="shrink-0 text-accent/40 transition-colors duration-200 hover:text-accent"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="h-3 w-3 shrink-0" aria-hidden="true" />
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
