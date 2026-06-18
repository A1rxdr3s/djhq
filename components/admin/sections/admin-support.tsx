"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { MOCK_SUPPORT_TICKETS } from "@/lib/admin/mock-data"
import type { AdminSupportTicket } from "@/types/admin"

const TYPE_LABELS: Record<AdminSupportTicket["type"], string> = {
  payment_failed:    "Payment Failed",
  upload_failed:     "Upload Failed",
  profile_error:     "Profile Error",
  domain_issue:      "Domain Issue",
  suspicious_activity: "Suspicious Activity",
  account_issue:     "Account Issue",
}

const TYPE_COLORS: Record<AdminSupportTicket["type"], string> = {
  payment_failed:    "text-red-400",
  upload_failed:     "text-amber-400",
  profile_error:     "text-orange-400",
  domain_issue:      "text-amber-400",
  suspicious_activity: "text-red-400",
  account_issue:     "text-white/50",
}

export function AdminSupport() {
  const open = MOCK_SUPPORT_TICKETS.filter((t) => t.status === "open").length
  const inProgress = MOCK_SUPPORT_TICKETS.filter((t) => t.status === "in_progress").length

  return (
    <div>
      <AdminSectionHeader
        title="Support"
        description={`${open} open · ${inProgress} in progress · ${MOCK_SUPPORT_TICKETS.length} total tickets`}
      />

      <div className="overflow-hidden rounded-lg border border-white/[0.06]">
        {MOCK_SUPPORT_TICKETS.map((ticket, i) => (
          <div
            key={ticket.id}
            className={`px-4 py-3.5 hover:bg-white/[0.015] ${i > 0 ? "border-t border-white/[0.04]" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-semibold ${TYPE_COLORS[ticket.type]}`}>
                    {TYPE_LABELS[ticket.type]}
                  </span>
                  <AdminStatusBadge status={ticket.status} />
                  <span className="font-mono text-[10px] text-white/20">{ticket.id}</span>
                </div>
                <p className="mt-1 text-[12px] text-white/60">{ticket.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  {ticket.artistHandle && (
                    <span className="text-[10px] text-white/28">
                      Artist: <span className="font-mono">@{ticket.artistHandle}</span>
                    </span>
                  )}
                  {ticket.userEmail && (
                    <span className="text-[10px] text-white/28">
                      User: {ticket.userEmail}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-white/28">{ticket.createdAt}</p>
                {ticket.status === "open" && (
                  <button className="mt-1 text-[11px] text-accent/55 hover:text-accent/80">
                    {/* TODO: update ticket status in Supabase */}
                    Pick up
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-white/20">
        {/* TODO: connect to a real support ticketing system */}
        Support tickets will be connected to a real ticketing source in a future sprint.
      </p>
    </div>
  )
}
