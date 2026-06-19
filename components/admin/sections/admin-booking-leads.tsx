"use client"

import { useState } from "react"
import { Inbox, X, Copy, Check, AlertTriangle, ChevronDown } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { adminUpdateBookingLeadStatus, adminDeleteBookingLead } from "@/app/actions/booking-lead-actions"
import type { AdminRealData, DbBookingLead, AdminBookingLeadStatus, EmailDeliveryStatus } from "@/types/admin"

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
  new:       "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined:  "bg-slate-100 text-slate-500 border-slate-200",
}

const DELIVERY_COLORS: Record<EmailDeliveryStatus, string> = {
  pending: "bg-slate-100 text-slate-500 border-slate-200",
  sent:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:  "bg-red-50 text-red-600 border-red-200",
}

function Pill({ label, color, title }: { label: string; color: string; title?: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${color}`}
      title={title}
    >
      {label}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900">Delete Booking Lead</h3>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 space-y-1.5 rounded-lg bg-slate-50 px-3 py-3 text-[12px]">
          <div className="flex gap-2"><span className="w-20 shrink-0 text-slate-400">Reference</span><span className="font-mono font-semibold text-slate-700">{lead.referenceId}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-slate-400">Requester</span><span className="text-slate-700">{lead.fullName}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-slate-400">Event date</span><span className="text-slate-700">{lead.eventDate}</span></div>
          <div className="flex gap-2"><span className="w-20 shrink-0 text-slate-400">Venue</span><span className="text-slate-700">{truncate(lead.venueOrPromoter, 40)}</span></div>
        </div>

        <p className="mb-4 text-[12px] text-slate-500">
          This will permanently delete this booking lead. This action cannot be undone.
        </p>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete Lead"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function DetailPanel({
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
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="font-mono text-[11px] font-semibold text-slate-400">{lead.referenceId}</p>
            <p className="text-[14px] font-semibold text-slate-900">{lead.fullName}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[12px]">

          {/* Status */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Status</p>
            <div className="flex items-center gap-2">
              <Pill label={STATUS_LABELS[lead.status]} color={STATUS_COLORS[lead.status]} />
              <div className="relative">
                <select
                  disabled={statusUpdating}
                  defaultValue={lead.status}
                  onChange={(e) => onStatusChange(lead.id, e.target.value as AdminBookingLeadStatus)}
                  className="appearance-none rounded-md border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-7 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  {(Object.keys(STATUS_LABELS) as AdminBookingLeadStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Requester</p>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 space-y-1.5">
              <Row label="Name"  value={lead.fullName} />
              <Row label="Email" value={lead.email} />
              {lead.phone && <Row label="Phone" value={lead.phone} />}
            </div>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy email"}
            </button>
          </div>

          {/* Event */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Event</p>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 space-y-1.5">
              <Row label="Date"    value={lead.eventDate} />
              <Row label="Type"    value={eventType} />
              <Row label="City"    value={lead.city} />
              <Row label="Venue"   value={lead.venueOrPromoter} />
              <Row label="Artist"  value={`@${lead.artistHandle}`} />
            </div>
          </div>

          {/* Details */}
          {eventDetails && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Event Details</p>
              <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 leading-relaxed">{eventDetails}</p>
            </div>
          )}

          {/* Delivery */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Email Delivery</p>
            <div className="flex items-center gap-2">
              <Pill label={lead.emailDeliveryStatus} color={DELIVERY_COLORS[lead.emailDeliveryStatus]} />
              {lead.emailError && <span className="text-[10px] text-red-500">{lead.emailError}</span>}
            </div>
            {lead.emailProviderMessageId && (
              <p className="font-mono text-[10px] text-slate-300">{lead.emailProviderMessageId}</p>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">Timeline</p>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 space-y-1.5">
              <Row label="Received" value={lead.createdAt} />
              {lead.updatedAt && <Row label="Updated" value={lead.updatedAt} />}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={() => onDeleteRequest(lead)}
            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-100"
          >
            Delete Lead
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700 break-all">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdminBookingLeadsProps {
  realData: AdminRealData
}

export function AdminBookingLeads({ realData }: AdminBookingLeadsProps) {
  const [leads, setLeads] = useState(realData.bookingLeads)
  const [selectedLead, setSelectedLead] = useState<DbBookingLead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DbBookingLead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  async function handleStatusChange(id: string, status: AdminBookingLeadStatus) {
    setStatusUpdating(true)
    const result = await adminUpdateBookingLeadStatus(id, status)
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
    const result = await adminDeleteBookingLead(deleteTarget.id)
    if (result.success) {
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      if (selectedLead?.id === deleteTarget.id) setSelectedLead(null)
      setDeleteTarget(null)
    } else {
      setDeleteError(result.error ?? "Deletion failed.")
    }
    setIsDeleting(false)
  }

  if (leads.length === 0) {
    return (
      <div>
        <AdminSectionHeader
          title="Booking Leads"
          description="Booking inquiries received across all artists."
        />
        <AdminEmptyState
          icon={Inbox}
          title="No booking leads yet"
          description="Incoming booking requests from all artists will appear here."
        />
      </div>
    )
  }

  return (
    <div>
      <AdminSectionHeader
        title="Booking Leads"
        description={`${leads.length} lead${leads.length !== 1 ? "s" : ""} · all artists`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Reference", "Artist", "Name", "Email", "City", "Type", "Event Date", "Venue / Promoter", "Status", "Email", "Received"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedLead?.id === lead.id ? "bg-blue-50/40" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">{lead.referenceId}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">@{lead.artistHandle}</span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{lead.fullName}</td>
                  <td className="px-3 py-2.5 text-slate-500">{truncate(lead.email, 28)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{lead.city}</td>
                  <td className="px-3 py-2.5 text-slate-400">{truncate(extractEventType(lead.eventDetails), 16)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{lead.eventDate}</td>
                  <td className="px-3 py-2.5 text-slate-500">{truncate(lead.venueOrPromoter, 28)}</td>
                  <td className="px-3 py-2.5">
                    <Pill label={STATUS_LABELS[lead.status]} color={STATUS_COLORS[lead.status]} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill
                      label={lead.emailDeliveryStatus}
                      color={DELIVERY_COLORS[lead.emailDeliveryStatus]}
                      title={lead.emailError ?? lead.emailProviderMessageId ?? undefined}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{lead.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onDeleteRequest={(l) => { setDeleteTarget(l); setSelectedLead(null) }}
          statusUpdating={statusUpdating}
        />
      )}

      {/* Delete modal */}
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
