"use client"

import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { VenueAutocomplete } from "./venue-autocomplete"
import { CityAutocomplete } from "./city-autocomplete"
import { TicketProviderBadge } from "./ticket-provider-badge"
import { findCityExact } from "@/lib/city-data"
import type { VenueEntry } from "@/lib/venue-data"
import type { CityOption } from "@/lib/city-data"

export type GigEntry = {
  id: string
  venue: string
  date: string // YYYY-MM-DD
  city: string
  country: string
  ticketUrl?: string
  feeAmount?: number | null
  feeCurrency?: string | null
  paymentStatus?: "pending" | "partial" | "paid" | "cancelled" | null
}

type GigCardProps = {
  gig: GigEntry
  onChange: (updated: GigEntry) => void
  onDelete: () => void
  initialExpanded?: boolean
}

// Framer Motion v12 requires a tuple literal for the ease array.
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const PAYMENT_STATUSES = [
  { value: "pending" as const,   label: "Pending",   activeClass: "bg-amber-500/[0.12] text-amber-400/80" },
  { value: "partial" as const,   label: "Partial",   activeClass: "bg-sky-500/[0.12] text-sky-400/80" },
  { value: "paid" as const,      label: "Paid",      activeClass: "bg-emerald-500/[0.12] text-emerald-400/80" },
  { value: "cancelled" as const, label: "Cancelled", activeClass: "bg-red-500/[0.12] text-red-400/70" },
]

function formatFee(amount: number): string {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function formatGigDatePreview(date: string): { day: string; month: string } | null {
  if (!date) return null
  const d = new Date(`${date}T00:00:00Z`)
  if (isNaN(d.getTime())) return null
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
  }
}

function field(className?: string) {
  return cn(
    "h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025]",
    "px-3 text-sm font-medium text-foreground",
    "placeholder:text-muted-foreground/30",
    "outline-none transition-colors duration-150",
    "focus:border-white/[0.14] focus:bg-white/[0.04]",
    className,
  )
}

const iconBtn = cn(
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
  "text-muted-foreground/25 transition-colors duration-150",
  "hover:bg-white/[0.06] hover:text-foreground/60",
)

export function GigCard({
  gig,
  onChange,
  onDelete,
  initialExpanded = false,
}: GigCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded)
  // overflow: hidden is required during the height animation but clips autocomplete dropdowns
  // when fully expanded. Switch to overflow: visible once the enter animation completes.
  const [formAnimating, setFormAnimating] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending confirm timer on unmount to prevent setState on dead component.
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

  const datePreview = formatGigDatePreview(gig.date)
  const locationStr = [gig.city, gig.country].filter(Boolean).join(" · ")

  // Fee header preview: "800 USD · pending" — shown only when fee or status is set.
  const feePreviewParts = [
    gig.feeAmount != null
      ? `${formatFee(gig.feeAmount)}${gig.feeCurrency ? ` ${gig.feeCurrency}` : ""}`
      : null,
    gig.paymentStatus ?? null,
  ].filter(Boolean)
  const feePreview = feePreviewParts.length > 0 ? feePreviewParts.join(" · ") : null

  function set<K extends keyof GigEntry>(key: K, value: GigEntry[K]) {
    onChange({ ...gig, [key]: value })
  }

  function handleVenueSelect(entry: VenueEntry) {
    onChange({ ...gig, venue: entry.name, city: entry.city, country: entry.country })
  }

  function handleCitySelect(option: CityOption) {
    // Dropdown selection: always fill city and country code.
    onChange({ ...gig, city: option.city, country: option.countryCode })
  }

  function handleCityBlur(typedValue: string) {
    // Autofill-on-blur: only fill country when it is currently empty.
    if (!typedValue.trim() || gig.country) return
    const match = findCityExact(typedValue)
    if (match) {
      onChange({ ...gig, city: typedValue, country: match.countryCode })
    }
  }

  function handleToggle() {
    // Begin animation: clip overflow to prevent content flash during height transition.
    setFormAnimating(true)
    setExpanded((v) => !v)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmingDelete) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      onDelete()
      return
    }
    setConfirmingDelete(true)
    confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000)
  }

  return (
    <div
      className={cn(
        "group/card rounded-xl border border-white/[0.06] bg-card/35",
        "transition-colors duration-150 hover:border-white/[0.09]",
      )}
    >
      {/* Header — always visible. Left area toggles expand; controls stay separate. */}
      <div className="flex items-center gap-1 px-2.5 py-2">
        {/* Toggle region: date tile + venue/location summary */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label="Toggle show details"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-0.5 py-0.5 text-left"
        >
          {/* Mini date tile */}
          <div className="flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
            {datePreview ? (
              <>
                <span className="text-[13px] font-black leading-none text-foreground/75">
                  {datePreview.day}
                </span>
                <span className="mt-0.5 text-[6.5px] font-bold uppercase tracking-widest text-accent/55">
                  {datePreview.month}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-foreground/18">—</span>
            )}
          </div>

          {/* Venue + location */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground/80">
              {gig.venue ? gig.venue : <span className="font-normal text-muted-foreground/30">Venue</span>}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/40">
              {locationStr || <span className="text-muted-foreground/18">Location</span>}
            </p>
          </div>

          {/* Ticket provider badge */}
          {gig.ticketUrl && (
            <span className="shrink-0">
              <TicketProviderBadge url={gig.ticketUrl} />
            </span>
          )}

          {/* Fee preview — subdued secondary metadata */}
          {feePreview && (
            <span className="shrink-0 tabular-nums text-[10px] font-medium text-muted-foreground/25">
              {feePreview}
            </span>
          )}

          {/* Expand chevron */}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>

        {/* Delete control */}
        <div className="flex shrink-0 items-center pl-1">
          <button
            type="button"
            onClick={handleDeleteClick}
            aria-label={confirmingDelete ? "Confirm: remove show" : "Remove show"}
            className={cn(
              iconBtn,
              confirmingDelete
                ? "bg-destructive/10 text-destructive/60 hover:bg-destructive/15 hover:text-destructive/80"
                : "",
            )}
          >
            {confirmingDelete ? (
              <span className="w-7 text-center text-[8px] font-bold uppercase tracking-wide">rm?</span>
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible edit form.
          overflow switches to "visible" after the enter animation so that
          autocomplete dropdowns are not clipped by the height-animating container. */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ overflow: formAnimating ? "hidden" : "visible" }}
            onAnimationComplete={() => {
              // Reset after enter animation so dropdowns can escape the container.
              // On exit, the element is removed by AnimatePresence — no cleanup needed.
              if (expanded) setFormAnimating(false)
            }}
          >
            <div className="space-y-2 border-t border-white/[0.04] px-2.5 pb-2.5 pt-2.5">
              {/* Row 1: venue autocomplete + date */}
              <div className="flex items-center gap-2">
                <VenueAutocomplete
                  value={gig.venue}
                  onChange={(v) => set("venue", v)}
                  onSelect={handleVenueSelect}
                  autoFocus={initialExpanded}
                />
                <input
                  type="date"
                  value={gig.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={cn(field("w-36 shrink-0 [color-scheme:dark]"))}
                />
              </div>

              {/* Row 2: city autocomplete + country + ticket URL */}
              <div className="flex items-center gap-2">
                <CityAutocomplete
                  value={gig.city}
                  onChange={(v) => set("city", v)}
                  onSelect={handleCitySelect}
                  onBlur={handleCityBlur}
                />
                <input
                  value={gig.country}
                  placeholder="CC"
                  maxLength={3}
                  onChange={(e) => set("country", e.target.value.toUpperCase())}
                  className={field("w-14 shrink-0 uppercase")}
                />
                <div className="relative min-w-0 flex-1">
                  <input
                    value={gig.ticketUrl ?? ""}
                    placeholder="Ticket URL"
                    onChange={(e) => set("ticketUrl", e.target.value || undefined)}
                    className={field(gig.ticketUrl ? "pr-14" : "")}
                  />
                  {gig.ticketUrl && (
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                      <TicketProviderBadge url={gig.ticketUrl} />
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: optional fee tracking — private, not shown on public profile */}
              <div className="flex flex-col gap-2 border-t border-white/[0.03] pt-2 sm:flex-row sm:items-center">
                {/* Fee amount */}
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={gig.feeAmount != null ? gig.feeAmount : ""}
                  placeholder="Fee"
                  onChange={(e) => {
                    const num = e.target.value === "" ? null : parseFloat(e.target.value)
                    set("feeAmount", num != null && !isNaN(num) ? num : null)
                  }}
                  className={cn(
                    field("sm:flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"),
                  )}
                />

                {/* Currency */}
                <input
                  list={`gig-currencies-${gig.id}`}
                  value={gig.feeCurrency ?? ""}
                  placeholder="USD"
                  maxLength={10}
                  onChange={(e) => set("feeCurrency", e.target.value.toUpperCase() || null)}
                  className={field("sm:w-20 sm:shrink-0 uppercase")}
                />
                <datalist id={`gig-currencies-${gig.id}`}>
                  <option value="USD" />
                  <option value="EUR" />
                  <option value="GBP" />
                  <option value="CLP" />
                </datalist>

                {/* Payment status — segmented control */}
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5">
                  {PAYMENT_STATUSES.map(({ value: statusValue, label, activeClass }) => (
                    <button
                      key={statusValue}
                      type="button"
                      onClick={() =>
                        set("paymentStatus", gig.paymentStatus === statusValue ? null : statusValue)
                      }
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        "transition-colors duration-100",
                        gig.paymentStatus === statusValue
                          ? activeClass
                          : "text-muted-foreground/25 hover:text-muted-foreground/45",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
