"use client"

import { DollarSign } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export function AdminPayments() {
  return (
    <div>
      <AdminSectionHeader
        title="Payments"
        description="Revenue and payment history across all tenants."
      />

      {/* Stripe not connected notice */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-[12px] font-medium text-amber-800">Stripe not connected</p>
        <p className="mt-0.5 text-[11px] text-amber-600">
          Connect Stripe to see real payment history, MRR, ARR, and failed charges.
          {/* TODO: STRIPE_SECRET_KEY → Stripe.paymentIntents.list() or Stripe.charges.list() */}
        </p>
      </div>

      <AdminEmptyState
        icon={DollarSign}
        title="No payment data available"
        description="Payment history, revenue totals, and failed charges will appear once Stripe is connected. No revenue has been fabricated."
        todo="TODO: Stripe.charges.list() — requires STRIPE_SECRET_KEY"
      />
    </div>
  )
}
