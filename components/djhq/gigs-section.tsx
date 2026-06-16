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
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: MONTHS[d.getUTCMonth()],
  }
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

// ── Shared content derivation ──────────────────────────────────────────────────

function deriveGigDisplay(gig: Gig) {
  const vis = gig.visibilityStatus ?? "announced"
  const isHidden = vis === "tba" || vis === "tbc" || vis === "cancelled"
  const hasEventName = !isHidden &&
    !!gig.eventName?.trim() &&
    gig.eventName.trim().toLowerCase() !== (gig.venue ?? "").trim().toLowerCase()
  const displayTitle = isHidden
    ? vis === "tba" ? "TBA" : vis === "tbc" ? "TBC" : "CANCELLED"
    : hasEventName ? (gig.eventName ?? gig.venue) : gig.venue
  return { isHidden, hasEventName, displayTitle }
}

// ── Featured show card (first in primary list) ─────────────────────────────────

type GigRowProps = {
  gig: Gig
  isNext: boolean
  isPast: boolean
}

function GigRow({ gig, isNext, isPast }: GigRowProps) {
  const { day, month } = parseGigDate(gig.date)
  const { isHidden, hasEventName, displayTitle } = deriveGigDisplay(gig)
  const statusConfig = gig.eventStatus ? STATUS_CONFIG[gig.eventStatus] : null
  const locationStr = [gig.city, gig.country].filter(Boolean).join(" • ")
  const showTicket = !isPast && !isHidden && !!gig.ticketUrl
  const showInstagram = !isHidden && !!gig.instagramUrl

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
            {displayTitle}
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

        {/* Venue context line — height always reserved; invisible when event name absent or equals venue */}
        {!isHidden && (
          <p
            className={cn(
              "mt-0.5 truncate text-xs font-medium leading-tight",
              isPast ? "text-white/18" : "text-white/55",
              !hasEventName && "invisible",
            )}
          >
            {gig.venue || " "}
          </p>
        )}

        {!isHidden && gig.clubVenue && (
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

      {/* Icon action buttons — hidden for TBA/TBC/Cancelled shows */}
      {(showTicket || showInstagram) && (
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
          {showInstagram && gig.instagramUrl && resolveSafeHref(gig.instagramUrl) && (
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

// ── Compact show row (shows 2–N in the primary list) ──────────────────────────

function GigRowCompact({ gig, isPast }: { gig: Gig; isPast: boolean }) {
  const { day, month } = parseGigDate(gig.date)
  const { isHidden, hasEventName, displayTitle } = deriveGigDisplay(gig)
  const locationStr = [gig.city, gig.country].filter(Boolean).join(" • ")
  const showTicket = !isPast && !isHidden && !!gig.ticketUrl
  const showInstagram = !isHidden && !!gig.instagramUrl

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-white/[0.05] px-2 py-[7px] xl:px-3",
        "transition-colors duration-150",
        isPast ? "hover:bg-white/[0.012]" : "hover:bg-white/[0.025]",
      )}
    >
      {/* Date — compact stacked */}
      <div className="flex w-9 shrink-0 flex-col items-center leading-none">
        <span
          className={cn(
            "text-[1.05rem] font-black leading-none tracking-tight tabular-nums",
            isPast ? "text-foreground/25" : "text-foreground/72",
          )}
        >
          {day}
        </span>
        <span
          className={cn(
            "mt-[3px] text-[7px] font-bold uppercase tracking-[0.18em]",
            isPast ? "text-white/15" : "text-accent/52",
          )}
        >
          {month}
        </span>
      </div>

      {/* Title → optional venue sub → location */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-semibold uppercase leading-tight tracking-[0.04em]",
            isPast ? "text-foreground/32" : "text-foreground/82",
          )}
        >
          {displayTitle}
        </p>
        {hasEventName && gig.venue && (
          <p
            className={cn(
              "truncate text-[10px] font-medium leading-tight",
              isPast ? "text-white/18" : "text-white/38",
            )}
          >
            {gig.venue}
          </p>
        )}
        {locationStr && (
          <p
            className={cn(
              "mt-[2px] truncate text-[10px] font-medium uppercase tracking-[0.08em]",
              isPast ? "text-white/18" : "text-white/30",
            )}
          >
            {locationStr}
          </p>
        )}
      </div>

      {/* Fixed-width action slot — always rendered so rows without actions stay aligned.
          Width = 2 × h-7 icons (28px) + gap-1.5 (6px) = 62px. */}
      <div className="flex w-[62px] shrink-0 items-center justify-end gap-1.5">
        {showTicket && gig.ticketUrl && resolveSafeHref(gig.ticketUrl) && (
          <a
            href={resolveSafeHref(gig.ticketUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Tickets"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.05] text-accent/80 transition-all duration-150 hover:scale-[1.05] hover:border-accent/35 hover:bg-accent/10 hover:text-accent"
          >
            <Ticket className="h-3.5 w-3.5" />
          </a>
        )}
        {showInstagram && gig.instagramUrl && resolveSafeHref(gig.instagramUrl) && (
          <a
            href={resolveSafeHref(gig.instagramUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-150",
              isPast
                ? "border-white/[0.06] text-white/18 hover:text-white/30"
                : "border-accent/[0.18] bg-accent/[0.04] text-accent/75 hover:scale-[1.05] hover:border-accent/[0.32] hover:bg-accent/[0.08] hover:text-accent",
            )}
          >
            <Instagram className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Past show archive row (expanded "View Past Shows" list) ───────────────────

function GigRowPast({ gig }: { gig: Gig }) {
  const { day, month } = parseGigDate(gig.date)
  const { isHidden, displayTitle } = deriveGigDisplay(gig)
  const locationStr = [gig.city, gig.country].filter(Boolean).join(" • ")
  const showInstagram = !isHidden && !!gig.instagramUrl

  return (
    <div className="flex items-center gap-2 border-t border-white/[0.035] py-[5px] first:border-0">
      {/* Inline date — "31 MAY" */}
      <span className="w-[46px] shrink-0 text-[10px] font-bold tabular-nums tracking-[0.02em] text-white/22">
        {day} {month}
      </span>

      {/* Title */}
      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-foreground/30">
        {displayTitle}
      </p>

      {/* Location */}
      {locationStr && (
        <p className="shrink-0 max-w-[38%] truncate text-[9px] font-medium uppercase tracking-[0.08em] text-white/18">
          {locationStr}
        </p>
      )}

      {/* Fixed-width Instagram slot — bare icon, always present for alignment */}
      <div className="flex w-5 shrink-0 items-center justify-end">
        {showInstagram && gig.instagramUrl && resolveSafeHref(gig.instagramUrl) && (
          <a
            href={resolveSafeHref(gig.instagramUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="-m-2 p-2 text-white/20 transition-colors duration-150 hover:text-white/45"
          >
            <Instagram className="h-[11px] w-[11px]" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── GigsSection ───────────────────────────────────────────────────────────────

type GigsSectionProps = {
  /** Future shows sorted ascending (soonest first). Pre-filtered by the server. */
  futureGigs: Gig[]
  /** Past shows sorted descending (most recent first). Pre-filtered by the server. */
  pastGigs: Gig[]
}

export function GigsSection({ futureGigs, pastGigs }: GigsSectionProps) {
  const [showAllFuture, setShowAllFuture] = useState(false)
  const [pastExpanded, setPastExpanded] = useState(false)

  if (futureGigs.length === 0 && pastGigs.length === 0) return null

  // Scenario A — 0 future shows: display up to 5 most recent past shows as primary content
  // Scenario B — 1-5 future shows: display all upcoming
  // Scenario C — 6+ future shows: display first 5, with "View All" expansion
  const scenarioA = futureGigs.length === 0
  const scenarioC = futureGigs.length > 5

  const primaryRows: Gig[] = scenarioA
    ? pastGigs.slice(0, 5)
    : scenarioC && !showAllFuture
    ? futureGigs.slice(0, 5)
    : futureGigs

  const primaryIsPast = scenarioA

  // Past shows for the toggle — in Scenario A, skip rows already shown as primary
  const pastForToggle = scenarioA ? pastGigs.slice(5) : pastGigs
  const hasPastToggle = pastForToggle.length > 0

  const sectionTitle = scenarioA ? "Recent Shows" : "Shows"

  // First show gets the full featured card; the rest render as compact rows.
  const featuredGig = primaryRows[0]
  const compactGigs = primaryRows.slice(1)

  return (
    <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:flex lg:h-full lg:flex-col lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5 xl:p-7 xl:pt-6">
      <SectionHeader>{sectionTitle}</SectionHeader>

      <div className="mt-4 lg:flex-1">
        <motion.div
          className="flex flex-col"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-24px" }}
        >
          {/* Featured show — full card treatment */}
          {featuredGig && (
            <motion.div variants={item}>
              <GigRow
                gig={featuredGig}
                isNext={!primaryIsPast}
                isPast={primaryIsPast}
              />
            </motion.div>
          )}

          {/* Compact list — remaining shows grouped in a single bordered block */}
          {compactGigs.length > 0 && (
            <motion.div
              variants={item}
              className="mt-1.5 overflow-hidden rounded-xl border border-white/[0.06]"
            >
              {compactGigs.map((gig) => (
                <GigRowCompact key={gig.id} gig={gig} isPast={primaryIsPast} />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Scenario C — expand to show all upcoming shows */}
      {scenarioC && !showAllFuture && (
        <button
          type="button"
          onClick={() => setShowAllFuture(true)}
          className="mt-4 inline-flex w-full items-center gap-2 border-t border-white/[0.06] pt-3 text-left text-xs font-semibold uppercase tracking-[0.20em] text-white/45 transition-colors duration-200 hover:text-accent lg:mt-auto"
        >
          View All Shows ({futureGigs.length}) →
        </button>
      )}

      {/* Past shows toggle — hidden when "View All Shows" is the primary CTA to avoid competition */}
      {hasPastToggle && !(scenarioC && !showAllFuture) && (
        <button
          type="button"
          onClick={() => setPastExpanded((v) => !v)}
          className="mt-4 inline-flex w-full items-center gap-2 border-t border-white/[0.06] pt-3 text-left text-xs font-semibold uppercase tracking-[0.20em] text-white/45 transition-colors duration-200 hover:text-accent lg:mt-auto"
        >
          {pastExpanded ? "Hide Past Shows ↑" : "View Past Shows →"}
        </button>
      )}

      {/* Past shows — compact archive, up to 3 most recent */}
      <AnimatePresence initial={false}>
        {pastExpanded && hasPastToggle && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-2 border-t border-white/[0.05] pt-2.5">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/28">
                Past Shows
              </p>
              {pastForToggle.slice(0, 3).map((gig) => (
                <GigRowPast key={gig.id} gig={gig} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
