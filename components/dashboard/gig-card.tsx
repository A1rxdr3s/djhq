"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { VenueAutocomplete } from "./venue-autocomplete"
import { TicketProviderBadge } from "./ticket-provider-badge"
import type { VenueEntry } from "@/lib/venue-data"

export type GigEntry = {
  id: string
  venue: string
  date: string // YYYY-MM-DD
  city: string
  country: string
  ticketUrl?: string
}

type GigCardProps = {
  gig: GigEntry
  onChange: (updated: GigEntry) => void
  onDelete: () => void
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

export function GigCard({ gig, onChange, onDelete }: GigCardProps) {
  function set<K extends keyof GigEntry>(key: K, value: GigEntry[K]) {
    onChange({ ...gig, [key]: value })
  }

  function handleVenueSelect(entry: VenueEntry) {
    onChange({
      ...gig,
      venue: entry.name,
      city: entry.city,
      country: entry.country,
    })
  }

  return (
    <div
      className={cn(
        "group/card rounded-xl border border-white/[0.06] bg-card/35 p-3",
        "transition-colors duration-150 hover:border-white/[0.09]",
      )}
    >
      {/* Row 1: venue + date + delete */}
      <div className="flex items-center gap-2">
        <VenueAutocomplete
          value={gig.venue}
          onChange={(v) => set("venue", v)}
          onSelect={handleVenueSelect}
        />

        {/* Date */}
        <input
          type="date"
          value={gig.date}
          onChange={(e) => set("date", e.target.value)}
          className={cn(field("w-36 shrink-0 [color-scheme:dark]"))}
        />

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove show"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            "text-muted-foreground/30 transition-colors duration-150",
            "hover:bg-white/[0.06] hover:text-destructive/70",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Row 2: city + country + ticket URL */}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={gig.city}
          placeholder="City"
          onChange={(e) => set("city", e.target.value)}
          className={field("w-28 shrink-0")}
        />

        <input
          value={gig.country}
          placeholder="CC"
          maxLength={3}
          onChange={(e) => set("country", e.target.value.toUpperCase())}
          className={field("w-14 shrink-0 uppercase")}
        />

        {/* Ticket URL + provider badge */}
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
    </div>
  )
}
