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
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo area */}
        <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-800">DJHQ</span>
            <span className="rounded-sm bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
              Admin
            </span>
          </div>
          <button
            onClick={onMobileClose}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => { onSelect(id); onMobileClose?.() }}
                className={cn(
                  "flex w-full items-center gap-2.5 border-l-2 px-3.5 py-2 text-left text-[13px] transition-colors duration-100",
                  isActive
                    ? "border-green-600 bg-green-50 font-medium text-green-700"
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-green-600" : "text-slate-400",
                  )}
                />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Bottom metadata */}
        <div className="border-t border-slate-200 px-4 py-3">
          {/* TODO: show real authenticated admin user */}
          <p className="text-[11px] font-medium text-slate-500">Platform Admin</p>
          <p className="text-[10px] text-slate-400">DJHQ Internal</p>
        </div>
      </aside>
    </>
  )
}
