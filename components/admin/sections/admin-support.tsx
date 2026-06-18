"use client"

import { HeadphonesIcon } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export function AdminSupport() {
  return (
    <div>
      <AdminSectionHeader
        title="Support"
        description="Customer support tickets and issue tracking."
      />

      {/* Explains why empty */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[12px] font-medium text-slate-700">No ticketing system connected</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Support tickets require an integration with a ticketing service or a custom
          <code className="mx-1 font-mono text-[10px]">support_tickets</code> table in Supabase.
          {/* TODO: integrate with Linear, Intercom, or create support_tickets table */}
        </p>
      </div>

      <AdminEmptyState
        icon={HeadphonesIcon}
        title="No support tickets"
        description="Tickets will appear here once a support integration is configured."
        todo="TODO: connect Linear / Intercom / Supabase support_tickets table"
      />

      {/* What email support looks like today */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-4">
        <p className="text-[12px] font-semibold text-slate-700">Current support channel</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Artists contact support via{" "}
          <a href="mailto:support@djhq.app" className="text-green-700 underline underline-offset-2">
            support@djhq.app
          </a>
          . Responses are handled manually.
        </p>
      </div>
    </div>
  )
}
