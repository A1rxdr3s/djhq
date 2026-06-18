"use client"

import { BarChart2 } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export function AdminReports() {
  return (
    <div>
      <AdminSectionHeader
        title="Reports"
        description="Platform analytics and business metrics."
      />

      {/* Notice */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[12px] font-medium text-slate-700">Analytics not yet connected</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Charts and growth metrics require a real analytics source. No fake data is shown here.
          {/* TODO: Supabase aggregate queries + PostHog / Plausible */}
        </p>
      </div>

      <AdminEmptyState
        icon={BarChart2}
        title="No analytics data available"
        description="MRR growth, signup trends, plan distribution, and press kit downloads will appear once an analytics integration is wired."
        todo="TODO: connect analytics — Supabase queries / PostHog / Plausible"
      />

      {/* What will go here — roadmap note */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { label: "MRR Growth",            todo: "Stripe → monthly rollup" },
          { label: "New Signups",            todo: "supabase.auth.admin.listUsers() → group by month" },
          { label: "Plan Distribution",      todo: "artists.plan → aggregate query" },
          { label: "Press Kit Downloads",    todo: "download_events table (future sprint)" },
        ].map(({ label, todo }) => (
          <div
            key={label}
            className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3.5"
          >
            <p className="text-[12px] font-semibold text-slate-600">{label}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-300">{todo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
