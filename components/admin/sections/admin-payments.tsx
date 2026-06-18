"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { MOCK_PAYMENTS, MOCK_SUBSCRIPTIONS } from "@/lib/admin/mock-data"
import { DollarSign, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react"

export function AdminPayments() {
  const totalMrr = MOCK_SUBSCRIPTIONS.reduce((s, sub) => s + sub.mrr, 0)
  const totalRevenue = MOCK_PAYMENTS.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0)
  const failed = MOCK_PAYMENTS.filter((p) => p.status === "failed").length
  const refunds = MOCK_PAYMENTS.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <AdminSectionHeader
        title="Payments"
        description="Revenue and payment history across all tenants."
      />

      {/* Revenue metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminMetricCard label="MRR"            value={`$${totalMrr}`}      icon={DollarSign}    change={`$${totalMrr * 12} ARR`} changeDir="up" />
        <AdminMetricCard label="Total Revenue"  value={`$${totalRevenue}`}   icon={TrendingDown}  change="all time" />
        <AdminMetricCard label="Failed"         value={failed}               icon={AlertTriangle} change="needs attention" changeDir="down" />
        <AdminMetricCard label="Refunds"        value={`$${refunds}`}        icon={RefreshCw}     />
      </div>

      {/* Payments table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["ID", "Customer", "Artist", "Amount", "Status", "Date", "Provider", "Invoice"].map((h) => (
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
            {MOCK_PAYMENTS.map((pay) => (
              <tr key={pay.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4 font-mono text-[10px] text-white/35">{pay.id}</td>
                <td className="py-2.5 pr-4 text-foreground/75">{pay.customer}</td>
                <td className="py-2.5 pr-4 text-white/50">{pay.artist}</td>
                <td className="py-2.5 pr-4 font-semibold text-foreground/85">
                  {pay.currency} {pay.amount}
                </td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={pay.status} />
                </td>
                <td className="py-2.5 pr-4 text-white/38">{pay.date}</td>
                <td className="py-2.5 pr-4 text-white/35">{pay.provider}</td>
                <td className="py-2.5 pr-4 font-mono text-[10px] text-white/30">{pay.invoiceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-white/20">
        {/* TODO: connect to real Stripe dashboard */}
        Stripe integration coming soon. Showing mock payment history.
      </p>
    </div>
  )
}
