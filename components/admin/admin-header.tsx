"use client"

import { Menu, Bell, Search } from "lucide-react"
import type { AdminSection } from "@/components/admin/admin-client"

const SECTION_LABELS: Record<AdminSection, string> = {
  overview:      "Overview",
  users:         "Users",
  artists:       "Artists",
  invitations:   "Invitations",
  subscriptions: "Subscriptions",
  payments:      "Payments",
  reports:       "Reports",
  "booking-leads": "Booking Leads",
  "press-kits":  "Press Kits",
  "feature-flags": "Feature Flags",
  support:       "Support",
  settings:      "Settings",
}

interface AdminHeaderProps {
  section: AdminSection
  onMenuToggle: () => void
}

export function AdminHeader({ section, onMenuToggle }: AdminHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#090909] px-4 lg:bg-transparent">
      {/* Left: mobile menu + section title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded p-1 text-white/35 hover:text-white/65 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground/80">
          {SECTION_LABELS[section]}
        </span>
      </div>

      {/* Right: search placeholder + notifications */}
      <div className="flex items-center gap-2">
        <button
          className="hidden items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/30 transition-colors hover:text-white/55 sm:flex"
          onClick={() => {
            // TODO: open global command palette
          }}
        >
          <Search className="h-3 w-3" />
          Search...
          <span className="ml-2 rounded border border-white/[0.08] px-1 text-[10px] text-white/20">⌘K</span>
        </button>
        <button className="relative rounded-md p-1.5 text-white/30 hover:text-white/60">
          <Bell className="h-4 w-4" />
          {/* TODO: real notification count */}
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </header>
  )
}
