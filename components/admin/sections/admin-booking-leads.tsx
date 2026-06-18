"use client"

import { Inbox } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export function AdminBookingLeads() {
  return (
    <div>
      <AdminSectionHeader
        title="Booking Leads"
        description="Booking inquiries received across all artists."
      />

      {/* Explains why this is empty */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[12px] font-medium text-slate-700">Booking inquiries are email-only</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          When a promoter submits a booking request, an email is sent to the artist's booking address.
          Inquiries are not stored in the database yet — a <code className="font-mono text-[10px]">booking_inquiries</code> table would be needed.
          {/* TODO: create booking_inquiries table, capture form submissions, display here */}
        </p>
      </div>

      <AdminEmptyState
        icon={Inbox}
        title="No booking leads stored"
        description="Booking inquiries currently route via email only. No leads table exists in the database."
        todo="TODO: create booking_inquiries table + capture form submissions"
      />
    </div>
  )
}
