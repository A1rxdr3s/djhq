"use client"

import { Inbox } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import type { AdminRealData, DbBookingLead, AdminBookingLeadStatus } from "@/types/admin"

const STATUS_LABELS: Record<AdminBookingLeadStatus, string> = {
  new:       "New",
  contacted: "Contacted",
  qualified: "Qualified",
  declined:  "Declined",
  converted: "Converted",
}

const STATUS_COLORS: Record<AdminBookingLeadStatus, string> = {
  new:       "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined:  "bg-slate-100 text-slate-500 border-slate-200",
  converted: "bg-green-50 text-green-700 border-green-200",
}

function LeadStatusBadge({ status }: { status: AdminBookingLeadStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str
}

interface AdminBookingLeadsProps {
  realData: AdminRealData
}

export function AdminBookingLeads({ realData }: AdminBookingLeadsProps) {
  const { bookingLeads } = realData

  if (bookingLeads.length === 0) {
    return (
      <div>
        <AdminSectionHeader
          title="Booking Leads"
          description="Booking inquiries received across all artists."
        />
        <AdminEmptyState
          icon={Inbox}
          title="No booking leads yet"
          description="Submitted booking inquiries will appear here once the booking form is used."
        />
      </div>
    )
  }

  return (
    <div>
      <AdminSectionHeader
        title="Booking Leads"
        description={`${bookingLeads.length} lead${bookingLeads.length !== 1 ? "s" : ""} · all artists`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Artist", "Name", "Email", "City", "Event Date", "Venue / Promoter", "Status", "Received"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookingLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      @{lead.artistHandle}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{lead.fullName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{lead.email}</td>
                  <td className="px-4 py-2.5 text-slate-500">{lead.city}</td>
                  <td className="px-4 py-2.5 text-slate-500">{lead.eventDate}</td>
                  <td className="px-4 py-2.5 text-slate-500">{truncate(lead.venueOrPromoter, 40)}</td>
                  <td className="px-4 py-2.5">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{lead.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
