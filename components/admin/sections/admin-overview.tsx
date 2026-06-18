"use client"

import {
  Users, Building2, TrendingUp, DollarSign,
  UserPlus, Mail, Inbox, FolderDown,
  CheckCircle, AlertCircle, ArrowUpRight, Star,
} from "lucide-react"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { MOCK_OVERVIEW, MOCK_ACTIVITY } from "@/lib/admin/mock-data"
import { cn } from "@/lib/utils"
import type { AdminActivity } from "@/types/admin"

const ACTIVITY_ICONS: Record<AdminActivity["type"], React.ElementType> = {
  artist_created:       Building2,
  payment_succeeded:    CheckCircle,
  invite_sent:          Mail,
  booking_received:     Inbox,
  presskit_downloaded:  FolderDown,
  plan_upgraded:        Star,
  payment_failed:       AlertCircle,
}

const ACTIVITY_COLORS: Record<AdminActivity["type"], string> = {
  artist_created:       "text-blue-400",
  payment_succeeded:    "text-emerald-400",
  invite_sent:          "text-white/45",
  booking_received:     "text-accent",
  presskit_downloaded:  "text-white/45",
  plan_upgraded:        "text-amber-400",
  payment_failed:       "text-red-400",
}

export function AdminOverview() {
  const o = MOCK_OVERVIEW
  return (
    <div>
      <AdminSectionHeader
        title="Platform Overview"
        description="Key metrics across the DJHQ platform."
      />

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminMetricCard label="Total Artists"      value={o.totalArtists}        icon={Building2}   change="+1 this week"  changeDir="up" />
        <AdminMetricCard label="Active Users"       value={o.activeUsers}          icon={Users}       change="stable"       changeDir="flat" />
        <AdminMetricCard label="Pro Plans"          value={o.proPlans}             icon={TrendingUp}  change="+1 this month" changeDir="up" />
        <AdminMetricCard label="MRR"               value={`$${o.mrr}`}            icon={DollarSign}  change="+$29 vs last month" changeDir="up" />
        <AdminMetricCard label="New Signups"        value={o.newSignups}           icon={UserPlus}    change="this month"   changeDir="flat" />
        <AdminMetricCard label="Pending Invitations" value={o.pendingInvitations}  icon={Mail}        />
        <AdminMetricCard label="Open Booking Leads" value={o.openBookingLeads}    icon={Inbox}       change="last 7 days"  changeDir="flat" />
        <AdminMetricCard label="PK Downloads"       value={o.pressKitDownloads}   icon={FolderDown}  change="last 30 days" changeDir="up" />
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
          Recent Activity
        </p>
        <div className="divide-y divide-white/[0.04] overflow-hidden rounded-lg border border-white/[0.06]">
          {MOCK_ACTIVITY.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type]
            const color = ACTIVITY_COLORS[item.type]
            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", color)} />
                <p className="flex-1 text-[12px] text-white/62">{item.description}</p>
                <span className="shrink-0 text-[11px] text-white/22">{item.timestamp}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href="/andresherrera"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.10] hover:bg-white/[0.04]"
        >
          <div>
            <p className="text-[12px] font-medium text-foreground/75">ANDRES:HERRERA — Public Profile</p>
            <p className="text-[11px] text-white/30">/andresherrera</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/22 transition-colors group-hover:text-accent/60" />
        </a>
        <a
          href="/hq"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.10] hover:bg-white/[0.04]"
        >
          <div>
            <p className="text-[12px] font-medium text-foreground/75">Artist Dashboard (HQ)</p>
            <p className="text-[11px] text-white/30">/hq</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/22 transition-colors group-hover:text-accent/60" />
        </a>
      </div>
    </div>
  )
}
