"use client"

import { useState, useEffect } from "react"
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
import type { AdminInvitation } from "@/types/admin"

// TODO: enforce platform admin role — connect to Supabase auth
// TODO: redirect non-admin users to sign-in

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

const STORAGE_KEY = "djhq_admin_invitations"

function loadInvitations(): AdminInvitation[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminInvitation[]) : []
  } catch {
    return []
  }
}

function saveInvitations(invitations: AdminInvitation[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invitations))
  } catch {
    // localStorage may be unavailable in certain environments
  }
}

export function AdminClient() {
  const [section, setSection] = useState<AdminSection>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [invitations, setInvitations] = useState<AdminInvitation[]>([])

  // Hydrate invitations from localStorage after mount
  useEffect(() => {
    setInvitations(loadInvitations())
  }, [])

  function handleInvitationsChange(updated: AdminInvitation[]) {
    setInvitations(updated)
    saveInvitations(updated)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
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
        <AdminHeader section={section} onMenuToggle={() => setSidebarOpen((o) => !o)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-8">
          {section === "overview"      && <AdminOverview />}
          {section === "users"         && <AdminUsers extraInvitedUsers={invitations} />}
          {section === "artists"       && <AdminArtists />}
          {section === "invitations"   && (
            <AdminInvitations
              invitations={invitations}
              onInvitationsChange={handleInvitationsChange}
            />
          )}
          {section === "subscriptions" && <AdminSubscriptions />}
          {section === "payments"      && <AdminPayments />}
          {section === "reports"       && <AdminReports />}
          {section === "booking-leads" && <AdminBookingLeads />}
          {section === "press-kits"    && <AdminPressKits />}
          {section === "feature-flags" && <AdminFeatureFlags />}
          {section === "support"       && <AdminSupport />}
          {section === "settings"      && <AdminSettings />}
        </main>
      </div>
    </div>
  )
}
