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
    year: String(d.getUTCFullYear()),
  }
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const card = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: EASE },
  },
}

function NextShowCard({ gig }: { gig: Gig }) {
  const { day, month, year } = parseGigDate(gig.date)

  return (
    <motion.div variants={card}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-3xl",
          "border border-white/[0.08] bg-gradient-to-br from-card/70 via-card/35 to-background/50",
          "shadow-xl shadow-black/30",
          "transition-all duration-500 ease-out",
          "hover:border-white/[0.15] hover:shadow-2xl hover:shadow-black/40",
        )}
      >
        {/* Hover glow */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_0%_0%,_hsl(var(--accent)/0.09),_transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-0 sm:p-8 lg:p-10">
          {/* Date block */}
          <div className="flex shrink-0 flex-row items-baseline gap-4 sm:flex-col sm:items-start sm:gap-0.5 sm:w-24 lg:w-28">
            <span className="font-mono text-[3.25rem] font-black leading-none tracking-[-0.04em] text-foreground sm:text-[4.5rem] lg:text-[5rem]">
              {day}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">{month}</span>
              <span className="font-mono text-[11px] text-muted-foreground/50">{year}</span>
            </div>
          </div>

          {/* Vertical rule */}
          <div className="hidden h-20 w-px shrink-0 bg-white/[0.07] sm:mx-8 sm:block lg:mx-10" />

          {/* Show info */}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[9px] font-bold uppercase tracking-[0.36em] text-accent/55">
              Next Show
            </span>
            <h3 className="mt-1.5 text-[2rem] font-black leading-[1.0] tracking-[-0.02em] text-foreground sm:text-[2.5rem] lg:text-[3rem]">
              {gig.venue}
            </h3>
            <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-foreground/40">
              {gig.city}
              <span className="mx-2.5 text-foreground/20">·</span>
              {gig.country}
            </p>
          </div>

          {/* Ticket CTA */}
          {gig.ticketUrl ? (
            <a
              href={gig.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group/btn mt-2 inline-flex w-fit shrink-0 items-center gap-2 sm:mt-0 sm:ml-8",
                "rounded-full border border-accent/25 bg-accent/10 px-6 py-3",
                "text-sm font-semibold tracking-wide text-accent",
                "transition-all duration-300 ease-out",
                "hover:border-accent/55 hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/10",
              )}
            >
              Get Tickets
              <ExternalLink className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

function UpcomingCard({ gig }: { gig: Gig }) {
  const { day, month, year } = parseGigDate(gig.date)

  return (
    <motion.div variants={card}>
      <div
        className={cn(
          "group relative flex items-center overflow-hidden rounded-2xl",
          "border border-white/[0.05] bg-card/20",
          "px-5 py-4 sm:px-7 sm:py-5",
          "transition-all duration-300 ease-out",
          "hover:border-white/[0.10] hover:bg-card/35",
        )}
      >
        {/* Date */}
        <div className="flex w-12 shrink-0 flex-col items-center text-center sm:w-14">
          <span className="font-mono text-[1.875rem] font-black leading-none tracking-tight text-foreground/75 sm:text-[2.25rem]">
            {day}
          </span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">
            {month} {year}
          </span>
        </div>

        <div className="mx-5 h-10 w-px shrink-0 bg-white/[0.06] sm:mx-7" />

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-[1.0625rem] font-bold leading-tight tracking-[-0.01em] text-foreground">
            {gig.venue}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
            {gig.city}
            <span className="mx-1.5 text-foreground/20">·</span>
            {gig.country}
          </p>
        </div>

        {/* Ticket link */}
        {gig.ticketUrl ? (
          <a
            href={gig.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/70 transition-colors duration-200 hover:text-accent"
          >
            Tickets
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </motion.div>
  )
}

type GigsSectionProps = {
  gigs: Gig[]
}

export function GigsSection({ gigs }: GigsSectionProps) {
  if (gigs.length === 0) return null

  const [next, ...upcoming] = gigs

  return (
    <section>
      <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">
        Upcoming Gigs
      </h2>

      <motion.div
        className="mt-4 flex flex-col gap-3"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-48px" }}
      >
        <NextShowCard gig={next} />

        {upcoming.length > 0 ? (
          <>
            <div className="mt-1 px-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-foreground/25">
                Upcoming
              </span>
            </div>
            {upcoming.map((gig) => (
              <UpcomingCard key={gig.id} gig={gig} />
            ))}
          </>
        ) : null}
      </motion.div>
    </section>
  )
}
