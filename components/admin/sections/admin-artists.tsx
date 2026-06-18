"use client"

import { ExternalLink, ArrowUpRight } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { MOCK_TENANTS } from "@/lib/admin/mock-data"

const PLAN_COLORS: Record<string, string> = {
  free:       "text-white/35",
  starter:    "text-blue-400/70",
  pro:        "text-accent/80",
  agency:     "text-purple-400/80",
  enterprise: "text-amber-400/80",
}

export function AdminArtists() {
  return (
    <div>
      <AdminSectionHeader
        title="Artists & Tenants"
        description={`${MOCK_TENANTS.length} artist tenants on the platform.`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Artist", "Handle", "Owner", "Plan", "Status", "Public URL", "Created", "Actions"].map((h) => (
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
            {MOCK_TENANTS.map((tenant) => (
              <tr key={tenant.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4">
                  <p className="font-semibold tracking-wide text-foreground/85">{tenant.artistName}</p>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                    @{tenant.handle}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <p className="text-foreground/70">{tenant.ownerName}</p>
                  <p className="text-[11px] text-white/30">{tenant.ownerEmail}</p>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`font-semibold capitalize ${PLAN_COLORS[tenant.plan] ?? "text-white/45"}`}>
                    {tenant.plan}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={tenant.status} />
                </td>
                <td className="py-2.5 pr-4">
                  <a
                    href={tenant.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-white/38 transition-colors hover:text-accent/75"
                  >
                    {tenant.publicUrl}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </td>
                <td className="py-2.5 pr-4 text-white/35">{tenant.createdAt}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex gap-2 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    <a
                      href={tenant.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] text-white/42 hover:text-white/80"
                    >
                      Profile <ArrowUpRight className="h-2.5 w-2.5" />
                    </a>
                    <button className="text-[11px] text-white/42 hover:text-white/80">
                      {/* TODO: change plan UI */}
                      Plan
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
