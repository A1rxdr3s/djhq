"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { MOCK_BOOKING_LEADS } from "@/lib/admin/mock-data"

export function AdminBookingLeads() {
  return (
    <div>
      <AdminSectionHeader
        title="Booking Leads"
        description={`${MOCK_BOOKING_LEADS.length} booking inquiries received across all artists.`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Artist", "Requester", "Email", "City", "Type", "Event Date", "Venue / Promoter", "Status", "Created"].map((h) => (
                <th
                  key={h}
                  className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.10em] text-white/30 first:pl-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {MOCK_BOOKING_LEADS.map((lead) => (
              <tr key={lead.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4 font-semibold text-foreground/80">{lead.artistName}</td>
                <td className="py-2.5 pr-4 text-foreground/70">{lead.requesterName}</td>
                <td className="py-2.5 pr-4 text-white/45">{lead.email}</td>
                <td className="py-2.5 pr-4 text-white/55">{lead.city}</td>
                <td className="py-2.5 pr-4 text-white/50">{lead.eventType}</td>
                <td className="py-2.5 pr-4 text-white/45">{lead.eventDate}</td>
                <td className="py-2.5 pr-4 text-white/45">{lead.venueOrPromoter}</td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={lead.status} />
                </td>
                <td className="py-2.5 pr-4 text-white/30">{lead.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-white/20">
        {/* TODO: connect to gig booking inquiry table in Supabase */}
        Showing mock booking lead data. Real data will be queried from the gig_inquiries table.
      </p>
    </div>
  )
}
