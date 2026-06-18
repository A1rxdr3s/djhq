"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { MOCK_PLAN_CONFIGS } from "@/lib/admin/mock-data"

interface CSSBarProps {
  label: string
  value: number
  max: number
  suffix?: string
  color?: string
}

function CSSBar({ label, value, max, suffix = "", color = "bg-accent" }: CSSBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[11px] text-white/45">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`h-1.5 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-[11px] font-medium text-foreground/70">
        {value}{suffix}
      </span>
    </div>
  )
}

const MONTHLY_SIGNUPS = [
  { month: "Jan", count: 0 },
  { month: "Feb", count: 1 },
  { month: "Mar", count: 0 },
  { month: "Apr", count: 1 },
  { month: "May", count: 0 },
  { month: "Jun", count: 2 },
]

const MONTHLY_MRR = [
  { month: "Jan", mrr: 29 },
  { month: "Feb", mrr: 58 },
  { month: "Mar", mrr: 58 },
  { month: "Apr", mrr: 87 },
  { month: "May", mrr: 186 },
  { month: "Jun", mrr: 224 },
]

const PK_DOWNLOADS_BY_ARTIST = [
  { label: "ANDRES:HERRERA", value: 96 },
  { label: "NOCTURNO",       value: 22 },
  { label: "PRIYA SHARMA",   value: 14 },
  { label: "DELVAUX",        value: 9 },
  { label: "LENA FISCHER",   value: 3 },
]

export function AdminReports() {
  const maxMrr = Math.max(...MONTHLY_MRR.map((m) => m.mrr))
  const maxSignups = Math.max(...MONTHLY_SIGNUPS.map((m) => m.count), 1)
  const maxDownloads = Math.max(...PK_DOWNLOADS_BY_ARTIST.map((a) => a.value))
  const totalPlanActive = MOCK_PLAN_CONFIGS.reduce((s, p) => s + p.subscriptionCount, 0)

  return (
    <div>
      <AdminSectionHeader
        title="Reports"
        description="Platform analytics and business metrics. Mock data."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* MRR Growth */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">MRR Growth</p>
          <div className="space-y-3">
            {MONTHLY_MRR.map(({ month, mrr }) => (
              <CSSBar key={month} label={month} value={mrr} max={maxMrr} suffix=" USD" color="bg-accent" />
            ))}
          </div>
        </div>

        {/* Signups */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">New Signups (2026)</p>
          <div className="space-y-3">
            {MONTHLY_SIGNUPS.map(({ month, count }) => (
              <CSSBar key={month} label={month} value={count} max={maxSignups} suffix="" color="bg-blue-500" />
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">Plan Distribution</p>
          <div className="space-y-3">
            {MOCK_PLAN_CONFIGS.map((plan) => (
              <CSSBar
                key={plan.key}
                label={plan.label}
                value={plan.subscriptionCount}
                max={totalPlanActive || 1}
                color={
                  plan.key === "pro" ? "bg-accent" :
                  plan.key === "agency" ? "bg-purple-500" :
                  plan.key === "starter" ? "bg-blue-500" :
                  "bg-white/20"
                }
              />
            ))}
          </div>
        </div>

        {/* Press kit downloads by artist */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">Press Kit Downloads</p>
          <div className="space-y-3">
            {PK_DOWNLOADS_BY_ARTIST.map(({ label, value }) => (
              <CSSBar key={label} label={label} value={value} max={maxDownloads} color="bg-emerald-500" />
            ))}
          </div>
        </div>

      </div>

      <p className="mt-6 text-[10px] text-white/20">
        {/* TODO: connect to real analytics — Supabase queries / PostHog / Plausible */}
        All data is mock. Real analytics integration is a future sprint.
      </p>
    </div>
  )
}
