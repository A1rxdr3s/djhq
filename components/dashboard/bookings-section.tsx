"use client"

// TODO: add role-based permissions for non-owner team members
// TODO: add Cloudflare Turnstile to booking form for bot protection

import { useEffect, useState } from "react"
import { Inbox, X, Copy, Check, ChevronDown, AlertTriangle, Loader2 } from "lucide-react"
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
  declined:  "border-border bg-secondary text-muted-foreground/55",
}

const DELIVERY_COLORS: Record<string, string> = {
  pending: "border-border bg-secondary text-muted-foreground/55",
  sent:    "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400",
  failed:  "border-red-500/25 bg-red-500/[0.07] text-red-400",
}

function StatusPill({ status }: { status: AdminBookingLeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str
}

function extractEventType(eventDetails: string): string {
  const match = eventDetails.match(/^Event Type: (.+?)(\n|$)/)
  return match ? match[1].trim() : "—"
}

// ---------------------------------------------------------------------------
// Delete modal
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

        <div className="mb-4 space-y-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-3 text-[12px]">
          <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground/50">Reference</span><span className="font-mono font-semibold text-foreground/70">{lead.referenceId}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground/50">Requester</span><span className="text-foreground/70">{lead.fullName}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground/50">Event date</span><span className="text-foreground/70">{lead.eventDate}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground/50">Venue</span><span className="text-foreground/70">{truncate(lead.venueOrPromoter, 40)}</span></div>
        </div>

        <p className="mb-4 text-[12px] text-muted-foreground/60">
          This will permanently delete this booking lead. This action cannot be undone.
        </p>

        {error && (
          <div className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">{error}</div>
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
            {isDeleting ? "Deleting…" : "Delete"}
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
  artistId,
  onClose,
  onStatusChange,
  onDeleteRequest,
  statusUpdating,
}: {
  lead: DbBookingLead
  artistId: string
  onClose: () => void
  onStatusChange: (id: string, status: AdminBookingLeadStatus) => Promise<void>
  onDeleteRequest: (lead: DbBookingLead) => void
  statusUpdating: boolean
}) {
  const [copied, setCopied] = useState(false)
  const eventType = extractEventType(lead.eventDetails)
  const eventDetails = lead.eventDetails.replace(/^Event Type: .+?\n\n/, "").trim()

  function copyEmail() {
    navigator.clipboard.writeText(lead.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-[11px] text-accent/60">{lead.referenceId}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-foreground">{lead.fullName}</p>
          </div>
          <button onClick={onClose} className="mt-0.5 rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-[12px]">

          {/* Status */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">Status</p>
            <div className="flex items-center gap-2">
              <StatusPill status={lead.status} />
              <div className="relative">
                <select
                  disabled={statusUpdating}
                  defaultValue={lead.status}
                  onChange={(e) => onStatusChange(lead.id, e.target.value as AdminBookingLeadStatus)}
                  className="appearance-none rounded-md border border-border bg-secondary py-1 pl-2.5 pr-7 text-[11px] text-muted-foreground hover:bg-secondary/80 disabled:opacity-50 cursor-pointer"
                >
                  {(Object.keys(STATUS_LABELS) as AdminBookingLeadStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">Requester</p>
            <div className="rounded-lg border border-border bg-card/30 px-3 py-3 space-y-1.5">
              <FieldRow label="Name"  value={lead.fullName} />
              <FieldRow label="Email" value={lead.email} />
              {lead.phone && <FieldRow label="Phone" value={lead.phone} />}
            </div>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary/80"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy email"}
            </button>
          </div>

          {/* Event */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">Event</p>
            <div className="rounded-lg border border-border bg-card/30 px-3 py-3 space-y-1.5">
              <FieldRow label="Date"  value={lead.eventDate} />
              <FieldRow label="Type"  value={eventType} />
              <FieldRow label="City"  value={lead.city} />
              <FieldRow label="Venue" value={lead.venueOrPromoter} />
            </div>
          </div>

          {/* Details */}
          {eventDetails && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">Event Details</p>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-card/30 px-3 py-3 text-muted-foreground/80 leading-relaxed">
                {eventDetails}
              </p>
            </div>
          )}

          {/* Received */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">Timeline</p>
            <div className="rounded-lg border border-border bg-card/30 px-3 py-3 space-y-1.5">
              <FieldRow label="Received" value={lead.createdAt} />
              {lead.updatedAt && <FieldRow label="Updated" value={lead.updatedAt} />}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <button
            onClick={() => onDeleteRequest(lead)}
            className="w-full rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] font-semibold text-red-400 hover:bg-red-500/10"
          >
            Delete Lead
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 text-muted-foreground/40">{label}</span>
      <span className="text-right text-muted-foreground/80 break-all">{value}</span>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Bookings</h2>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Incoming booking requests from your public profile.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
        </div>
      )}

      {fetchError && !loading && (
        <div className="rounded-xl border border-border bg-card/40 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground/60">{fetchError}</p>
        </div>
      )}

      {!loading && !fetchError && leads.length === 0 && (
        <div className="rounded-xl border border-border bg-card/40 px-5 py-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
          <p className="text-[14px] font-medium text-foreground/60">No booking requests yet.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/40">
            New booking inquiries from your public profile will appear here.
          </p>
        </div>
      )}

      {!loading && !fetchError && leads.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["Reference", "Name", "City", "Type", "Event Date", "Venue", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`cursor-pointer transition-colors hover:bg-secondary/40 ${selectedLead?.id === lead.id ? "bg-accent/[0.04]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground/50">{lead.referenceId}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground/85">{lead.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground/60">{lead.city}</td>
                    <td className="px-4 py-3 text-muted-foreground/50">{truncate(extractEventType(lead.eventDetails), 16)}</td>
                    <td className="px-4 py-3 text-muted-foreground/60">{lead.eventDate}</td>
                    <td className="px-4 py-3 text-muted-foreground/50">{truncate(lead.venueOrPromoter, 24)}</td>
                    <td className="px-4 py-3"><StatusPill status={lead.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground/30">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} · click a row to view details
            </p>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedLead && (
        <DetailDrawer
          lead={selectedLead}
          artistId={artistId}
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
