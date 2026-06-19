"use client"

// TODO: add role-based permissions for non-owner team members
// TODO: add Cloudflare Turnstile to booking form for bot protection

import { useEffect, useState } from "react"
import {
  AlertTriangle, Check, ChevronDown, ChevronRight,
  Copy, Inbox, Loader2, Mail, MessageCircle, Phone, X,
} from "lucide-react"
import {
  hqListBookingLeads,
  hqUpdateBookingLeadStatus,
  hqDeleteBookingLead,
} from "@/app/actions/booking-lead-actions"
import type { DbBookingLead, AdminBookingLeadStatus } from "@/types/admin"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<AdminBookingLeadStatus, string> = {
  new:       "New",
  contacted: "Contacted",
  qualified: "Qualified",
  confirmed: "Confirmed",
  declined:  "Declined",
}

const STATUS_COLORS: Record<AdminBookingLeadStatus, string> = {
  new:       "border-accent/25 bg-accent/[0.07] text-accent",
  contacted: "border-amber-500/25 bg-amber-500/[0.07] text-amber-400",
  qualified: "border-violet-500/25 bg-violet-500/[0.07] text-violet-400",
  confirmed: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400",
  declined:  "border-border bg-secondary text-muted-foreground/40",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str
}

function extractEventType(eventDetails: string): string {
  const match = eventDetails.match(/^Event Type: (.+?)(\n|$)/)
  return match ? match[1].trim() : "—"
}

function extractEventBody(eventDetails: string): string {
  return eventDetails.replace(/^Event Type: .+?\n\n/, "").trim()
}

function normalizePhoneForWA(phone: string): string {
  return phone.replace(/[^0-9]/g, "")
}

function buildLeadSummary(lead: DbBookingLead, eventType: string, eventBody: string): string {
  const lines: string[] = [
    `Booking Request ${lead.referenceId}`,
    ``,
    `Artist: @${lead.artistHandle}`,
    `Requester: ${lead.fullName}`,
    `Email: ${lead.email}`,
    ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
    ``,
    `Event:`,
    `Date: ${lead.eventDate}`,
    ...(eventType !== "—" ? [`Type: ${eventType}`] : []),
    `City: ${lead.city}`,
    `Venue: ${lead.venueOrPromoter}`,
    ...(eventBody ? [``, `Details:`, eventBody] : []),
  ]
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: AdminBookingLeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function ContactLink({
  href,
  icon: Icon,
  label,
  disabled = false,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/25 cursor-not-allowed select-none">
        <Icon className="h-3 w-3" />
        {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-border/80 hover:bg-secondary/80 hover:text-foreground transition-colors"
    >
      <Icon className="h-3 w-3" />
      {label}
    </a>
  )
}

function CopyButton({
  value,
  label,
  copiedKey,
  myKey,
  onCopy,
}: {
  value: string
  label: string
  copiedKey: string | null
  myKey: string
  onCopy: (key: string, value: string) => void
}) {
  const isCopied = copiedKey === myKey
  return (
    <button
      onClick={() => onCopy(myKey, value)}
      className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
    >
      {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {isCopied ? "Copied" : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteModal({
  lead,
  onConfirm,
  onClose,
  isDeleting,
  error,
}: {
  lead: DbBookingLead
  onConfirm: () => void
  onClose: () => void
  isDeleting: boolean
  error: string | null
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">Delete Booking Lead</p>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-[12px]">
          <InfoRow label="Reference" value={lead.referenceId} mono />
          <InfoRow label="Requester" value={lead.fullName} />
          <InfoRow label="Event date" value={lead.eventDate} />
          <InfoRow label="Venue"      value={truncate(lead.venueOrPromoter, 40)} />
        </div>

        <p className="mb-4 text-[12px] text-muted-foreground/55">
          This will permanently delete this booking lead. This action cannot be undone.
        </p>

        {error && (
          <div className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-[12px] font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete lead"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

function DetailDrawer({
  lead,
  onClose,
  onStatusChange,
  onDeleteRequest,
  statusUpdating,
}: {
  lead: DbBookingLead
  onClose: () => void
  onStatusChange: (id: string, status: AdminBookingLeadStatus) => Promise<void>
  onDeleteRequest: (lead: DbBookingLead) => void
  statusUpdating: boolean
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const eventType = extractEventType(lead.eventDetails)
  const eventBody = extractEventBody(lead.eventDetails)
  const hasPhone  = Boolean(lead.phone?.trim())
  const waPhone   = hasPhone ? normalizePhoneForWA(lead.phone!) : ""

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1800)
    })
  }

  function copySummary() {
    copy("summary", buildLeadSummary(lead, eventType, eventBody))
  }

  // Summary line shown under the name in the header
  const summaryLine = [
    eventType !== "—" ? eventType : null,
    lead.city,
    lead.eventDate,
  ].filter(Boolean).join(" · ")

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold text-accent/50 tracking-wider">
                {lead.referenceId}
              </p>
              <p className="mt-0.5 truncate text-[16px] font-semibold text-foreground">
                {lead.fullName}
              </p>
              {summaryLine && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/45 truncate">
                  {summaryLine}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status row */}
          <div className="mt-3 flex items-center gap-2">
            <StatusPill status={lead.status} />
            <div className="relative">
              <select
                value={lead.status}
                disabled={statusUpdating}
                onChange={(e) => onStatusChange(lead.id, e.target.value as AdminBookingLeadStatus)}
                className="appearance-none rounded-md border border-border bg-secondary py-1 pl-2.5 pr-6 text-[11px] text-muted-foreground hover:bg-secondary/80 disabled:opacity-50 cursor-pointer focus:outline-none"
              >
                {(Object.keys(STATUS_LABELS) as AdminBookingLeadStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
            </div>
            {statusUpdating && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/30" />
            )}
          </div>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Requester & contact actions */}
          <div className="px-5 py-4 space-y-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
              Requester
            </p>

            {/* Values */}
            <div className="space-y-1 text-[12px]">
              <p className="font-semibold text-foreground/85">{lead.fullName}</p>
              <p className="text-muted-foreground/65">{lead.email}</p>
              {hasPhone && (
                <p className="text-muted-foreground/65">{lead.phone}</p>
              )}
            </div>

            {/* Contact action buttons */}
            <div className="flex flex-wrap gap-1.5">
              <ContactLink
                href={`mailto:${lead.email}`}
                icon={Mail}
                label="Email"
              />
              <ContactLink
                href={hasPhone ? `https://wa.me/${waPhone}` : "#"}
                icon={MessageCircle}
                label="WhatsApp"
                disabled={!hasPhone}
              />
              <ContactLink
                href={hasPhone ? `tel:${lead.phone!}` : "#"}
                icon={Phone}
                label="Call"
                disabled={!hasPhone}
              />
              <CopyButton
                myKey="email"
                value={lead.email}
                label="Copy email"
                copiedKey={copiedKey}
                onCopy={copy}
              />
              {hasPhone && (
                <CopyButton
                  myKey="phone"
                  value={lead.phone!}
                  label="Copy phone"
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              )}
            </div>
          </div>

          {/* Event details */}
          <div className="px-5 py-4 space-y-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
              Event
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <Field label="Date"   value={lead.eventDate} />
              <Field label="Type"   value={eventType} />
              <Field label="City"   value={lead.city} />
              <Field label="Venue"  value={lead.venueOrPromoter} />
            </div>
          </div>

          {/* Event details / message */}
          {eventBody && (
            <div className="px-5 py-4 space-y-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
                Details
              </p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
                {eventBody}
              </p>
            </div>
          )}

          {/* Copy lead summary */}
          <div className="px-5 py-4 border-b border-border">
            <button
              onClick={copySummary}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-[12px] text-muted-foreground hover:bg-secondary transition-colors"
            >
              <span className="font-medium">Copy lead summary</span>
              {copiedKey === "summary"
                ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                : <Copy className="h-3.5 w-3.5 text-muted-foreground/40" />
              }
            </button>
            <p className="mt-1.5 text-[10px] text-muted-foreground/30">
              Copies name, contact, event info as formatted text.
            </p>
          </div>

          {/* Timeline */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
              Timeline
            </p>
            <div className="text-[12px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground/40">Received</span>
                <span className="text-muted-foreground/65">{lead.createdAt}</span>
              </div>
              {lead.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground/40">Updated</span>
                  <span className="text-muted-foreground/65">{lead.updatedAt}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Footer: delete ─────────────────────────────────────────── */}
        <div className="border-t border-border px-5 py-4">
          <button
            onClick={() => onDeleteRequest(lead)}
            className="w-full rounded-lg border border-red-500/15 bg-red-500/[0.05] px-3 py-2 text-[12px] font-semibold text-red-400/80 hover:bg-red-500/[0.09] hover:text-red-400 transition-colors"
          >
            Delete lead
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground/35">{label}</p>
      <p className="text-foreground/70">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-muted-foreground/45">{label}</span>
      <span className={`text-foreground/70 ${mono ? "font-mono font-semibold" : ""}`}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BookingsSectionProps {
  artistId: string
}

export function BookingsSection({ artistId }: BookingsSectionProps) {
  const [leads, setLeads] = useState<DbBookingLead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<DbBookingLead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DbBookingLead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    hqListBookingLeads(artistId)
      .then((data) => { setLeads(data); setLoading(false) })
      .catch(() => { setFetchError("Could not load booking leads."); setLoading(false) })
  }, [artistId])

  async function handleStatusChange(id: string, status: AdminBookingLeadStatus) {
    setStatusUpdating(true)
    const result = await hqUpdateBookingLeadStatus(id, status, artistId)
    if (result.success) {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
      setSelectedLead((prev) => prev?.id === id ? { ...prev, status } : prev)
    }
    setStatusUpdating(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await hqDeleteBookingLead(deleteTarget.id, artistId)
    if (result.success) {
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      if (selectedLead?.id === deleteTarget.id) setSelectedLead(null)
      setDeleteTarget(null)
    } else {
      setDeleteError(result.error ?? "Deletion failed.")
    }
    setIsDeleting(false)
  }

  function openLead(lead: DbBookingLead) {
    setSelectedLead(lead)
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Bookings</h2>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Incoming booking requests from your public profile.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
        </div>
      )}

      {/* Fetch error */}
      {fetchError && !loading && (
        <div className="rounded-xl border border-border bg-card/40 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground/60">{fetchError}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && leads.length === 0 && (
        <div className="rounded-xl border border-border bg-card/40 px-5 py-14 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
          <p className="text-[14px] font-medium text-foreground/60">No booking requests yet.</p>
          <p className="mt-1.5 text-[12px] text-muted-foreground/40 max-w-[260px] mx-auto leading-relaxed">
            Requests submitted from your public profile will appear here.
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/28">
            Make sure your booking email is configured in Booking settings.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !fetchError && leads.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          {/* Help text */}
          <div className="px-4 pt-3 pb-0">
            <p className="text-[11px] text-muted-foreground/35">
              Select a request to view details and manage status.
            </p>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["Reference", "Name", "City", "Type", "Event Date", "Venue", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/35"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openLead(lead)}
                      className={`cursor-pointer transition-colors duration-100 ${
                        isSelected
                          ? "bg-accent/[0.05]"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-muted-foreground/45">{lead.referenceId}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground/80">{lead.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground/55">{lead.city}</td>
                      <td className="px-4 py-3 text-muted-foreground/45">{truncate(extractEventType(lead.eventDetails), 14)}</td>
                      <td className="px-4 py-3 text-muted-foreground/55">{lead.eventDate}</td>
                      <td className="px-4 py-3 text-muted-foreground/45">{truncate(lead.venueOrPromoter, 22)}</td>
                      <td className="px-4 py-3"><StatusPill status={lead.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); openLead(lead) }}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            isSelected
                              ? "text-accent"
                              : "text-muted-foreground/40 hover:text-foreground/70"
                          }`}
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground/28">
              {leads.length} request{leads.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedLead && (
        <DetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onDeleteRequest={(l) => { setDeleteTarget(l); setSelectedLead(null) }}
          statusUpdating={statusUpdating}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteModal
          lead={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </div>
  )
}
