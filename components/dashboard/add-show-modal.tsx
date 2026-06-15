"use client"

import { useState, useEffect, useRef } from "react"
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
  /** In add mode: receives a new GigEntry. In edit mode: same id as initialGig. */
  onSave: (gig: GigEntry) => void
  /** Event names from the artist's existing shows — used for autocomplete suggestions. */
  existingEventNames?: string[]
}

/** Only the visible form fields. Hidden fields (eventStatus, paymentStatus)
 *  are passed through from initialGig or defaulted on save. */
type ShowForm = {
  eventName: string
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
  visibilityStatus: "announced" | "tba" | "tbc" | "cancelled"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyForm(): ShowForm {
  return {
    eventName: "",
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
    visibilityStatus: "announced",
  }
}

function fromGigEntry(gig: GigEntry): ShowForm {
  return {
    eventName: gig.eventName ?? "",
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
    visibilityStatus: gig.visibilityStatus ?? "announced",
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass = cn(
  "h-9 w-full rounded-lg border border-gray-200 bg-white",
  "px-3 text-sm font-medium text-gray-900",
  "placeholder:text-gray-400",
  "outline-none transition-colors duration-150",
  "focus:border-accent/40 focus:ring-2 focus:ring-accent/10",
)

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
      {children}
    </p>
  )
}

// ── Visibility segmented control ─────────────────────────────────────────────

const VIS_OPTIONS: { value: "announced" | "tba" | "tbc" | "cancelled"; label: string }[] = [
  { value: "announced", label: "Announced" },
  { value: "tba",       label: "TBA"       },
  { value: "tbc",       label: "TBC"       },
  { value: "cancelled", label: "Cancelled" },
]

function VisibilityControl({
  value,
  onChange,
}: {
  value: ShowForm["visibilityStatus"]
  onChange: (v: ShowForm["visibilityStatus"]) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {VIS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-[11px] font-semibold uppercase tracking-[0.10em] transition-all duration-150",
            value === opt.value
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
              : "text-gray-400 hover:text-gray-600",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Event name input with lightweight suggestion dropdown ─────────────────────

function EventNameInput({
  value,
  onChange,
  suggestions,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  autoFocus?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : suggestions.slice(0, 6)
  const showDropdown = open && filtered.length > 0

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setOpen(true); setActiveIndex(0); e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        e.preventDefault()
        break
      case "ArrowUp":
        setActiveIndex((i) => (i <= 0 ? -1 : i - 1))
        e.preventDefault()
        break
      case "Enter":
        if (activeIndex >= 0) { onChange(filtered[activeIndex]); setOpen(false); e.preventDefault() }
        break
      case "Escape":
        setOpen(false); e.preventDefault(); break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setActiveIndex(-1); setOpen(true) }}
        onFocus={() => { setOpen(true) }}
        onKeyDown={handleKeyDown}
        placeholder="Event or show name (optional)"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className={inputClass}
      />
      {showDropdown && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1",
            "overflow-hidden rounded-xl border border-gray-200",
            "bg-white shadow-lg shadow-gray-200/80",
          )}
        >
          {filtered.slice(0, 6).map((name, i) => (
            <div
              key={name}
              role="option"
              aria-selected={i === activeIndex}
              onPointerDown={(e) => { e.preventDefault(); onChange(name); setOpen(false) }}
              onPointerEnter={() => setActiveIndex(i)}
              className={cn(
                "cursor-default select-none px-3.5 py-2.5 text-[13px] font-semibold",
                "border-b border-gray-100 last:border-0",
                "transition-colors duration-75",
                i === activeIndex
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ShowModal ─────────────────────────────────────────────────────────────────

export function ShowModal({
  open,
  onOpenChange,
  initialGig,
  onSave,
  existingEventNames = [],
}: ShowModalProps) {
  const mode = initialGig ? "edit" : "add"
  const [form, setForm] = useState<ShowForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Populate or reset form on open. initialGig intentionally omitted from deps —
  // we only read it once when the modal transitions to open.
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

  const isValid = !!(
    form.venue.trim() &&
    form.date &&
    form.city.trim() &&
    form.country.trim()
  )

  async function handleSave() {
    if (!isValid) return
    setSaving(true)

    // Best-effort: upsert venue to global_venues for other users' autocomplete.
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
    }).catch(() => {})

    const gig: GigEntry = {
      id: initialGig?.id ?? crypto.randomUUID(),
      eventName: form.eventName.trim() || undefined,
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
      visibilityStatus: form.visibilityStatus,
      // Preserve hidden fields from existing show; default on create.
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
          "max-w-lg border-gray-200 bg-white p-0 shadow-xl shadow-gray-300/40 sm:max-w-lg",
          "[&>button]:text-gray-400 [&>button:hover]:text-gray-700",
        )}
      >
        <div className="flex max-h-[90dvh] flex-col">

          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-5">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-gray-900">
              {mode === "edit" ? "Edit Show" : "Add Show"}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">

              {/* ── EVENT NAME ─────────────────────────────────────────────────
                  The brand/series name for the event (e.g. "Afterlife", "MISA").
                  Optional — separate from the physical venue. */}
              <div>
                <SectionLabel>Event Name</SectionLabel>
                <EventNameInput
                  value={form.eventName}
                  onChange={(v) => set("eventName", v)}
                  suggestions={existingEventNames}
                  autoFocus
                />
                <div className="mt-2">
                  <VisibilityControl
                    value={form.visibilityStatus}
                    onChange={(v) => set("visibilityStatus", v)}
                  />
                  {form.visibilityStatus !== "announced" && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
                      Private event details remain stored but are hidden from the public profile.
                    </p>
                  )}
                </div>
              </div>

              {/* ── VENUE ───────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Venue</SectionLabel>
                <div className="space-y-2">
                  <VenueAutocomplete
                    value={form.venue}
                    onChange={(v) => set("venue", v)}
                    onSelect={handleVenueSelect}
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

              {/* ── DETAILS ──────────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Details</SectionLabel>
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

              {/* ── LINKS ───────────────────────────────────────────────────── */}
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

              {/* ── BOOKING / FEE ────────────────────────────────────────────── */}
              <div>
                <SectionLabel>Booking / Fee</SectionLabel>
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
                    placeholder="Fee amount (optional)"
                    className={cn(
                      inputClass,
                      "flex-1 [appearance:textfield]",
                      "[&::-webkit-inner-spin-button]:appearance-none",
                      "[&::-webkit-outer-spin-button]:appearance-none",
                    )}
                  />
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
          <div className="shrink-0 border-t border-gray-100 px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "h-9 rounded-lg border border-gray-200 bg-white px-4",
                  "text-[13px] font-medium text-gray-600",
                  "transition-colors duration-150 hover:border-gray-300 hover:text-gray-900",
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid || saving}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg bg-accent px-5",
                  "whitespace-nowrap text-[13px] font-semibold text-accent-foreground",
                  "transition-all duration-150 hover:opacity-90",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === "edit" ? "Save Changes" : "Save Show"}
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ShowModal as AddShowModal }
