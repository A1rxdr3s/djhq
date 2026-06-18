"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminOverview } from "@/components/admin/sections/admin-overview"
import { AdminUsers } from "@/components/admin/sections/admin-users"
import { AdminArtists } from "@/components/admin/sections/admin-artists"
import { AdminInvitations } from "@/components/admin/sections/admin-invitations"
import { AdminSubscriptions } from "@/components/admin/sections/admin-subscriptions"
import { AdminPayments } from "@/components/admin/sections/admin-payments"
import { AdminReports } from "@/components/admin/sections/admin-reports"
import { AdminBookingLeads } from "@/components/admin/sections/admin-booking-leads"
import { AdminPressKits } from "@/components/admin/sections/admin-press-kits"
import { AdminFeatureFlags } from "@/components/admin/sections/admin-feature-flags"
import { AdminSupport } from "@/components/admin/sections/admin-support"
import { AdminSettings } from "@/components/admin/sections/admin-settings"
import type { AdminRealData } from "@/types/admin"

// TODO: enforce platform admin role — connect to Supabase auth
// TODO: redirect non-admin users to sign-in
// TODO: audit admin access events

export type AdminSection =
  | "overview"
  | "users"
  | "artists"
  | "invitations"
  | "subscriptions"
  | "payments"
  | "reports"
  | "booking-leads"
  | "press-kits"
  | "feature-flags"
  | "support"
  | "settings"

interface AdminClientProps {
  realData: AdminRealData
  sessionEmail: string | null
  isAdminVerified: boolean
}

export function AdminClient({ realData, sessionEmail, isAdminVerified }: AdminClientProps) {
  const [section, setSection] = useState<AdminSection>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar
        active={section}
        onSelect={setSection}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader
          section={section}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          isDevMode={realData.isDevMode}
          dataError={realData.dataError}
          sessionEmail={sessionEmail}
          isAdminVerified={isAdminVerified}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-8">
          {section === "overview"      && <AdminOverview realData={realData} />}
          {section === "users"         && <AdminUsers realData={realData} sessionEmail={sessionEmail} />}
          {section === "artists"       && <AdminArtists realData={realData} />}
          {section === "invitations"   && (
            <AdminInvitations
              initialInvitations={realData.invitations}
              realArtists={realData.artists}
            />
          )}
          {section === "subscriptions" && <AdminSubscriptions />}
          {section === "payments"      && <AdminPayments />}
          {section === "reports"       && <AdminReports />}
          {section === "booking-leads" && <AdminBookingLeads realData={realData} />}
          {section === "press-kits"    && <AdminPressKits />}
          {section === "feature-flags" && <AdminFeatureFlags />}
          {section === "support"       && <AdminSupport />}
          {section === "settings"      && <AdminSettings realData={realData} />}
        </main>
      </div>
    </div>
  )
}
