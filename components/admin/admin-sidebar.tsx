"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Building2, Mail, CreditCard, DollarSign,
  BarChart3, Inbox, FolderOpen, ToggleLeft, HeadphonesIcon, Settings,
  X,
} from "lucide-react"
import type { AdminSection } from "@/components/admin/admin-client"

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: "overview",       label: "Overview",       icon: LayoutDashboard },
  { id: "users",          label: "Users",          icon: Users },
  { id: "artists",        label: "Artists",        icon: Building2 },
  { id: "invitations",    label: "Invitations",    icon: Mail },
  { id: "subscriptions",  label: "Subscriptions",  icon: CreditCard },
  { id: "payments",       label: "Payments",       icon: DollarSign },
  { id: "reports",        label: "Reports",        icon: BarChart3 },
  { id: "booking-leads",  label: "Booking Leads",  icon: Inbox },
  { id: "press-kits",     label: "Press Kits",     icon: FolderOpen },
  { id: "feature-flags",  label: "Feature Flags",  icon: ToggleLeft },
  { id: "support",        label: "Support",        icon: HeadphonesIcon },
  { id: "settings",       label: "Settings",       icon: Settings },
]

interface AdminSidebarProps {
  active: AdminSection
  onSelect: (section: AdminSection) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function AdminSidebar({ active, onSelect, mobileOpen, onMobileClose }: AdminSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[216px] flex-col border-r border-white/[0.05] bg-[#090909] transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo area */}
        <div className="flex h-12 items-center justify-between border-b border-white/[0.05] px-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/75">DJHQ</span>
            <span className="rounded border border-accent/25 bg-accent/8 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-accent/70">
              Admin
            </span>
          </div>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="rounded p-0.5 text-white/30 hover:text-white/60 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => { onSelect(id); onMobileClose?.() }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] transition-colors duration-150",
                  isActive
                    ? "text-accent"
                    : "text-white/42 hover:text-white/72",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded",
                    isActive && "bg-accent/10",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-accent" : "text-white/38")} />
                </span>
                <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom metadata */}
        <div className="border-t border-white/[0.05] px-4 py-3">
          <p className="text-[10px] text-white/20">
            {/* TODO: show logged-in admin user */}
            Platform Admin
          </p>
          <p className="text-[10px] text-white/14">v0.1.0 · Internal</p>
        </div>
      </aside>
    </>
  )
}
