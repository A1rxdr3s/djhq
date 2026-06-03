"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { VenueAutocomplete } from "@/components/dashboard/venue-autocomplete"
import { CityAutocomplete } from "@/components/dashboard/city-autocomplete"
import { TicketProviderBadge } from "@/components/dashboard/ticket-provider-badge"
import { findCityExact } from "@/lib/city-data"
import { cn } from "@/lib/utils"
import type { VenueEntry } from "@/lib/venue-data"
import type { CityOption } from "@/lib/city-data"
import type { GigEntry } from "@/components/dashboard/gig-card"

// ── Types ─────────────────────────────────────────────────────────────────────

type AddShowModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (gig: GigEntry) => void
}

type ShowForm = {
  venue: string
  date: string
  city: string
  country: string
  clubVenue: string
  eventStatus: "upcoming" | "sold_out" | "cancelled" | null
  ticketUrl: string
  flyerUrl: string
  instagramUrl: string
  feeAmount: number | null
  feeCurrency: string | null
  paymentStatus: "pending" | "partial" | "paid" | "cancelled" | null
}

const EVENT_STATUSES = [
  { value: "upcoming"  as const, label: "Upcoming",  activeClass: "bg-accent/[0.12] text-accent/75" },
  { value: "sold_out"  as const, label: "Sold Out",  activeClass: "bg-amber-500/[0.12] text-amber-400/80" },
  { value: "cancelled" as const, label: "Cancelled", activeClass: "bg-red-500/[0.12] text-red-400/70" },
]

const PAYMENT_STATUSES = [
  { value: "pending"   as const, label: "Pending",   activeClass: "bg-amber-500/[0.12] text-amber-400/80" },
  { value: "partial"   as const, label: "Partial",   activeClass: "bg-sky-500/[0.12] text-sky-400/80" },
  { value: "paid"      as const, label: "Paid",      activeClass: "bg-emerald-500/[0.12] text-emerald-400/80" },
  { value: "cancelled" as const, label: "Cancelled", activeClass: "bg-red-500/[0.12] text-red-400/70" },
]

function emptyForm(): ShowForm {
  return {
    venue: "",
    date: "",
    city: "",
    country: "",
    clubVenue: "",
    eventStatus: "upcoming",
    ticketUrl: "",
    flyerUrl: "",
    instagramUrl: "",
    feeAmount: null,
    feeCurrency: null,
    paymentStatus: null,
  }
}

// ── Field style helpers ───────────────────────────────────────────────────────

const inputClass = cn(
  "h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025]",
  "px-3 text-sm font-medium text-foreground",
  "placeholder:text-muted-foreground/30",
  "outline-none transition-colors duration-150",
  "focus:border-white/[0.14] focus:bg-white/[0.04]",
)

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
      {children}
    </p>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddShowModal({ open, onOpenChange, onSave }: AddShowModalProps) {
  const [form, setForm] = useState<ShowForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const venueInputRef = useRef<HTMLInputElement>(null)

  // Reset form each time the modal opens (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      setForm(emptyForm())
      setSaving(false)
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  function set<K extends keyof ShowForm>(key: K, value: ShowForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleVenueSelect(entry: VenueEntry) {
    setForm((f) => ({
      ...f,
      venue: entry.name,
      city: f.city || entry.city,
      country: f.country || entry.country,
    }))
  }

  function handleCitySelect(option: CityOption) {
    setForm((f) => ({ ...f, city: option.city, country: option.countryCode }))
  }

  function handleCityBlur(typedValue: string) {
    if (!typedValue.trim() || form.country) return
    const match = findCityExact(typedValue)
    if (match) setForm((f) => ({ ...f, city: typedValue, country: match.countryCode }))
  }

  const isValid = form.venue.trim() && form.date && form.city.trim() && form.country.trim()

  async function handleSave() {
    if (!isValid) return
    setSaving(true)

    // Best-effort: create the venue in global_venues so other users see it.
    // Non-blocking — a failed upsert must not prevent the show from being saved.
    const venuePayload = {
      name: form.venue.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      instagramUrl: form.instagramUrl.trim() || null,
      source: "user_created",
    }
    fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venuePayload),
    }).catch(() => {
      // non-critical
    })

    const gig: GigEntry = {
      id: crypto.randomUUID(),
      venue: form.venue.trim(),
      date: form.date,
      city: form.city.trim(),
      country: form.country.trim(),
      clubVenue: form.clubVenue.trim() || undefined,
      eventStatus: form.eventStatus,
      ticketUrl: form.ticketUrl.trim() || undefined,
      flyerUrl: form.flyerUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      feeAmount: form.feeAmount,
      feeCurrency: form.feeCurrency,
      paymentStatus: form.paymentStatus,
    }

    onSave(gig)
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg border-white/[0.08] bg-[#0e1117] p-0",
          "sm:max-w-lg",
          "[&>button]:text-white/30 [&>button:hover]:text-white/60",
        )}
      >
        {/* Scrollable body — safe on short mobile screens */}
        <div className="flex max-h-[90dvh] flex-col">

          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-white/[0.06] px-6 pb-4 pt-5">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Add Show
            </DialogTitle>
          </DialogHeader>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">

              {/* ── Venue ──────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Venue</SectionLabel>
                <div className="space-y-2">
                  <VenueAutocomplete
                    value={form.venue}
                    onChange={(v) => set("venue", v)}
                    onSelect={handleVenueSelect}
                    autoFocus
                  />
                  <input
                    value={form.clubVenue}
                    onChange={(e) => set("clubVenue", e.target.value)}
                    placeholder="Room / Stage (optional)"
                    maxLength={120}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── Event ──────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Event</SectionLabel>
                <div className="space-y-2">
                  {/* Date */}
                  <DatePicker
                    value={form.date}
                    onChange={(v) => set("date", v)}
                    triggerClassName={cn(inputClass, "justify-start")}
                    align="start"
                  />

                  {/* City + Country */}
                  <div className="flex gap-2">
                    <CityAutocomplete
                      value={form.city}
                      onChange={(v) => set("city", v)}
                      onSelect={handleCitySelect}
                      onBlur={handleCityBlur}
                    />
                    <input
                      value={form.country}
                      onChange={(e) => set("country", e.target.value.toUpperCase())}
                      placeholder="CC"
                      maxLength={3}
                      className={cn(inputClass, "w-16 shrink-0 uppercase")}
                    />
                  </div>
                </div>
              </div>

              {/* ── Status ─────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Status</SectionLabel>
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5">
                  {EVENT_STATUSES.map(({ value: v, label, activeClass }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("eventStatus", form.eventStatus === v ? null : v)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
                        "transition-colors duration-100",
                        form.eventStatus === v
                          ? activeClass
                          : "text-muted-foreground/30 hover:text-muted-foreground/55",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Links ──────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Links</SectionLabel>
                <div className="space-y-2">
                  {/* Ticket URL */}
                  <div className="relative">
                    <input
                      value={form.ticketUrl}
                      onChange={(e) => set("ticketUrl", e.target.value)}
                      placeholder="Ticket URL"
                      className={cn(inputClass, form.ticketUrl ? "pr-14" : "")}
                    />
                    {form.ticketUrl && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                        <TicketProviderBadge url={form.ticketUrl} />
                      </span>
                    )}
                  </div>

                  <input
                    value={form.flyerUrl}
                    onChange={(e) => set("flyerUrl", e.target.value)}
                    placeholder="Flyer URL"
                    className={inputClass}
                  />
                  <input
                    value={form.instagramUrl}
                    onChange={(e) => set("instagramUrl", e.target.value)}
                    placeholder="Instagram URL"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── Booking / Fee ───────────────────────────────────────────── */}
              <div>
                <SectionLabel>Booking / Fee</SectionLabel>
                <div className="space-y-2">
                  {/* Fee + currency row */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={form.feeAmount ?? ""}
                      onChange={(e) => {
                        const v = e.target.value
                        set("feeAmount", v === "" ? null : parseFloat(v) || null)
                      }}
                      placeholder="Fee"
                      className={cn(
                        inputClass,
                        "flex-1 [appearance:textfield]",
                        "[&::-webkit-inner-spin-button]:appearance-none",
                        "[&::-webkit-outer-spin-button]:appearance-none",
                      )}
                    />
                    <input
                      list="add-show-currencies"
                      value={form.feeCurrency ?? ""}
                      onChange={(e) => set("feeCurrency", e.target.value.toUpperCase() || null)}
                      placeholder="USD"
                      maxLength={10}
                      className={cn(inputClass, "w-20 shrink-0 uppercase")}
                    />
                    <datalist id="add-show-currencies">
                      <option value="USD" />
                      <option value="EUR" />
                      <option value="GBP" />
                      <option value="CLP" />
                    </datalist>
                  </div>

                  {/* Payment status */}
                  <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                    {PAYMENT_STATUSES.map(({ value: v, label, activeClass }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set("paymentStatus", form.paymentStatus === v ? null : v)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          "transition-colors duration-100",
                          form.paymentStatus === v
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

            </div>
          </div>

          {/* Footer — required fields note + action buttons */}
          <div className="shrink-0 border-t border-white/[0.05] px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground/30">
                Venue, date, city and country are required.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "h-9 rounded-lg border border-white/[0.07] bg-transparent px-4",
                    "text-[13px] font-medium text-muted-foreground/60",
                    "transition-colors duration-150 hover:border-white/[0.12] hover:text-foreground/70",
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className={cn(
                    "h-9 rounded-lg bg-accent px-5",
                    "text-[13px] font-semibold text-accent-foreground",
                    "transition-all duration-150",
                    "hover:bg-accent/90 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    "flex items-center gap-2",
                  )}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Show
                </button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
