"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { MOCK_SUBSCRIPTIONS, MOCK_PLAN_CONFIGS } from "@/lib/admin/mock-data"
import { DollarSign, Users, TrendingUp } from "lucide-react"

const PLAN_COLORS: Record<string, string> = {
  free:       "text-white/35",
  starter:    "text-blue-400/70",
  pro:        "text-accent/80",
  agency:     "text-purple-400/80",
  enterprise: "text-amber-400/80",
}

export function AdminSubscriptions() {
  const totalMrr = MOCK_SUBSCRIPTIONS.reduce((s, sub) => s + sub.mrr, 0)
  const activeCount = MOCK_SUBSCRIPTIONS.filter((s) => s.status === "active").length
  const trialingCount = MOCK_SUBSCRIPTIONS.filter((s) => s.status === "trialing").length

  return (
    <div>
      <AdminSectionHeader
        title="Subscriptions"
        description="Platform-wide plan and billing overview."
      />

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AdminMetricCard label="MRR"           value={`$${totalMrr}`}  icon={DollarSign} change={`$${totalMrr * 12} ARR`} />
        <AdminMetricCard label="Active Plans"   value={activeCount}     icon={Users} />
        <AdminMetricCard label="Trialing"       value={trialingCount}   icon={TrendingUp} />
      </div>

      {/* Plan breakdown */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Plans</p>
      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MOCK_PLAN_CONFIGS.map((plan) => (
          <div
            key={plan.key}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[12px] font-bold uppercase tracking-wide ${PLAN_COLORS[plan.key] ?? "text-white/50"}`}>
                {plan.label}
              </span>
              <span className="text-[12px] text-white/38">
                {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
              </span>
            </div>
            <div className="mt-2 flex gap-4">
              <div>
                <p className="text-[18px] font-bold text-foreground/85">{plan.subscriptionCount}</p>
                <p className="text-[10px] text-white/30">active</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-foreground/85">${plan.mrrContribution}</p>
                <p className="text-[10px] text-white/30">MRR</p>
              </div>
            </div>
            <div className="mt-2.5 space-y-0.5">
              {plan.features.slice(0, 3).map((f) => (
                <p key={f} className="text-[10px] text-white/28">· {f}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Subscription table */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">All Subscriptions</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Artist", "Plan", "Status", "Renewal", "MRR", "Payment"].map((h) => (
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
            {MOCK_SUBSCRIPTIONS.map((sub) => (
              <tr key={sub.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4 font-medium text-foreground/80">{sub.artistName}</td>
                <td className="py-2.5 pr-4">
                  <span className={`font-semibold capitalize ${PLAN_COLORS[sub.plan] ?? "text-white/45"}`}>
                    {sub.plan}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={sub.status} />
                </td>
                <td className="py-2.5 pr-4 text-white/40">{sub.renewalDate}</td>
                <td className="py-2.5 pr-4 font-medium text-foreground/70">
                  {sub.mrr > 0 ? `$${sub.mrr}` : "—"}
                </td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={sub.paymentStatus === "ok" ? "paid" : sub.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
