"use client"

import { CreditCard } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

const PLAN_TIERS = [
  { key: "free",       label: "Free",       price: "Free",     features: ["1 artist profile", "Basic press kit"] },
  { key: "starter",    label: "Starter",    price: "$29/mo",   features: ["Custom domain", "Priority support"] },
  { key: "pro",        label: "Pro",        price: "$79/mo",   features: ["Advanced analytics", "All press kit features"] },
  { key: "agency",     label: "Agency",     price: "$199/mo",  features: ["Multiple artists", "White-label options"] },
  { key: "enterprise", label: "Enterprise", price: "Custom",   features: ["SLA", "Dedicated support"] },
]

export function AdminSubscriptions() {
  return (
    <div>
      <AdminSectionHeader
        title="Subscriptions"
        description="Platform-wide plan and billing overview."
      />

      {/* Stripe not connected notice */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-[12px] font-medium text-amber-800">Stripe not connected</p>
        <p className="mt-0.5 text-[11px] text-amber-600">
          Connect Stripe to see real subscription data, MRR, and billing history.
          {/* TODO: add STRIPE_SECRET_KEY to env, wire up Stripe.subscriptions.list() */}
        </p>
      </div>

      <AdminEmptyState
        icon={CreditCard}
        title="No subscription data available"
        description="Subscription history and MRR metrics will appear once Stripe is connected."
        todo="TODO: connect Stripe — STRIPE_SECRET_KEY + webhook"
      />

      {/* Plan tier reference */}
      <div className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Plan Tiers (reference)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PLAN_TIERS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">{plan.label}</p>
              <p className="text-[13px] font-semibold text-slate-500">{plan.price}</p>
              <div className="mt-2.5 space-y-0.5">
                {plan.features.map((f) => (
                  <p key={f} className="text-[10px] text-slate-400">· {f}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
