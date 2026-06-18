"use client"

import { Menu, Bell, Search } from "lucide-react"
import type { AdminSection } from "@/components/admin/admin-client"

const SECTION_LABELS: Record<AdminSection, string> = {
  overview:        "Overview",
  users:           "Users",
  artists:         "Artists",
  invitations:     "Invitations",
  subscriptions:   "Subscriptions",
  payments:        "Payments",
  reports:         "Reports",
  "booking-leads": "Booking Leads",
  "press-kits":    "Press Kits",
  "feature-flags": "Feature Flags",
  support:         "Support",
  settings:        "Settings",
}

interface AdminHeaderProps {
  section: AdminSection
  onMenuToggle: () => void
  isDevMode?: boolean
  dataError?: boolean
}

export function AdminHeader({ section, onMenuToggle, isDevMode, dataError }: AdminHeaderProps) {
  const env = isDevMode ? "Development" : "Production"

  return (
    <div className="shrink-0">
      {/* Dev warning banner */}
      {isDevMode && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-[11px] text-amber-700">
            ⚠ Admin access is unprotected in development.
            {/* TODO: enforce platform_admin role — connect Supabase auth */}
          </p>
        </div>
      )}
      {dataError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2">
          <p className="text-[11px] text-red-700">
            Data fetch error — Supabase service role key may not be configured.
          </p>
        </div>
      )}

      {/* Main header */}
      <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="rounded p-1 text-slate-400 hover:text-slate-700 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold text-slate-800">
            {SECTION_LABELS[section]}
          </span>
        </div>

        {/* Right: env badge + search + bell */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:inline-flex">
            {env}
          </span>
          <button
            className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-slate-700 sm:flex"
            onClick={() => {
              // TODO: open command palette
            }}
          >
            <Search className="h-3 w-3" />
            Search...
            <span className="ml-1.5 rounded border border-slate-200 px-1 text-[10px] text-slate-300">⌘K</span>
          </button>
          <button className="relative rounded-md p-1.5 text-slate-400 hover:text-slate-700">
            <Bell className="h-4 w-4" />
            {/* TODO: real notification count */}
          </button>
        </div>
      </header>
    </div>
  )
}
