"use client"

import { useState, useEffect } from "react"
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

type ShowModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the modal opens in Edit mode with fields pre-filled. */
  initialGig?: GigEntry
  /** Receives the complete GigEntry. In edit mode the id matches the original. */
  onSave: (gig: GigEntry) => void
}

/** Only the fields the modal manages. Hidden fields (eventStatus, paymentStatus)
 *  are passed through from initialGig or defaulted at save time. */
type ShowForm = {
  venue: string
  clubVenue: string
  date: string
  city: string
  country: string
  ticketUrl: string
  flyerUrl: string
  instagramUrl: string
  feeAmount: number | null
  feeCurrency: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyForm(): ShowForm {
  return {
    venue: "",
    clubVenue: "",
    date: "",
    city: "",
    country: "",
    ticketUrl: "",
    flyerUrl: "",
    instagramUrl: "",
    feeAmount: null,
    feeCurrency: "USD",
  }
}

function fromGigEntry(gig: GigEntry): ShowForm {
  return {
    venue: gig.venue,
    clubVenue: gig.clubVenue ?? "",
    date: gig.date,
    city: gig.city,
    country: gig.country,
    ticketUrl: gig.ticketUrl ?? "",
    flyerUrl: gig.flyerUrl ?? "",
    instagramUrl: gig.instagramUrl ?? "",
    feeAmount: gig.feeAmount ?? null,
    feeCurrency: gig.feeCurrency ?? "USD",
  }
}

// ── Field style ───────────────────────────────────────────────────────────────

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

export function ShowModal({ open, onOpenChange, initialGig, onSave }: ShowModalProps) {
  const mode = initialGig ? "edit" : "add"
  const [form, setForm] = useState<ShowForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Populate or reset form whenever the modal opens.
  // initialGig is intentionally omitted from deps — we only read it at open time.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      setForm(initialGig ? fromGigEntry(initialGig) : emptyForm())
      setSaving(false)
    }, 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isValid = !!(form.venue.trim() && form.date && form.city.trim() && form.country.trim())

  async function handleSave() {
    if (!isValid) return
    setSaving(true)

    // Best-effort: upsert venue to global_venues for autocomplete enrichment.
    fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.venue.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        instagramUrl: form.instagramUrl.trim() || null,
        source: "user_created",
      }),
    }).catch(() => {
      // non-critical — venue upsert failure must not block show creation
    })

    const gig: GigEntry = {
      // Preserve id in edit mode; generate new in add mode
      id: initialGig?.id ?? crypto.randomUUID(),
      venue: form.venue.trim(),
      date: form.date,
      city: form.city.trim(),
      country: form.country.trim(),
      clubVenue: form.clubVenue.trim() || undefined,
      ticketUrl: form.ticketUrl.trim() || undefined,
      flyerUrl: form.flyerUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      feeAmount: form.feeAmount,
      feeCurrency: form.feeCurrency.trim() || null,
      // Preserve hidden fields from existing gig when editing;
      // default to "upcoming" / null when creating.
      eventStatus: initialGig?.eventStatus ?? "upcoming",
      paymentStatus: initialGig?.paymentStatus ?? null,
    }

    onSave(gig)
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg border-white/[0.08] bg-[#0e1117] p-0 sm:max-w-lg",
          "[&>button]:text-white/30 [&>button:hover]:text-white/60",
        )}
      >
        <div className="flex max-h-[90dvh] flex-col">

          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-white/[0.06] px-6 pb-4 pt-5">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {mode === "edit" ? "Edit Show" : "Add Show"}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">

              {/* ── Event Venue ─────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Event Venue</SectionLabel>
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

              {/* ── Event Details ────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Event Details</SectionLabel>
                <div className="space-y-2">
                  <DatePicker
                    value={form.date}
                    onChange={(v) => set("date", v)}
                    triggerClassName={cn(inputClass, "justify-start")}
                    align="start"
                  />
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

              {/* ── Links ───────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Links</SectionLabel>
                <div className="space-y-2">
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
                {/* Fee amount + currency side by side */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
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
                      placeholder="Fee amount (optional)"
                      className={cn(
                        inputClass,
                        "[appearance:textfield]",
                        "[&::-webkit-inner-spin-button]:appearance-none",
                        "[&::-webkit-outer-spin-button]:appearance-none",
                      )}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <input
                      list="show-modal-currencies"
                      value={form.feeCurrency}
                      onChange={(e) => set("feeCurrency", e.target.value.toUpperCase())}
                      placeholder="USD"
                      maxLength={10}
                      className={cn(inputClass, "uppercase")}
                    />
                    <datalist id="show-modal-currencies">
                      <option value="USD" />
                      <option value="EUR" />
                      <option value="GBP" />
                      <option value="CLP" />
                    </datalist>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
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
                    "flex h-9 items-center gap-2 rounded-lg bg-accent px-5",
                    "text-[13px] font-semibold text-accent-foreground",
                    "transition-all duration-150",
                    "hover:bg-accent/90 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {mode === "edit" ? "Save Changes" : "Save Show"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

// Backward-compat alias — the old name is still imported in dashboard-client.tsx
// and will be updated there; this keeps any other potential importers working.
export { ShowModal as AddShowModal }
