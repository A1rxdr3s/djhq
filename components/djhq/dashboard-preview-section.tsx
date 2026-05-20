"use client"

import { useState } from "react"
import { 
  LayoutDashboard, 
  User, 
  Link2, 
  Disc3, 
  Calendar, 
  Image, 
  FileText, 
  Mail, 
  Wrench, 
  BarChart3, 
  Settings,
  Plus,
  ChevronRight,
  ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: User, label: "Public Profile" },
  { icon: Link2, label: "Links" },
  { icon: Disc3, label: "Releases" },
  { icon: Calendar, label: "Gigs" },
  { icon: Image, label: "Media Library" },
  { icon: FileText, label: "Press Kit" },
  { icon: Mail, label: "Booking" },
  { icon: Wrench, label: "Producer Tools" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Settings, label: "Settings" },
]

const quickActions = [
  { label: "Edit public profile", icon: User },
  { label: "Add release", icon: Disc3 },
  { label: "Add gig", icon: Calendar },
  { label: "Upload press photo", icon: Image },
  { label: "Update booking info", icon: Mail },
]

const recentReleases = [
  { title: "Midnight Protocol", streams: "124k", trend: "+12%" },
  { title: "Neural Network", streams: "89k", trend: "+8%" },
]

const upcomingGigs = [
  { venue: "Berghain", date: "Jun 15", status: "Confirmed" },
  { venue: "fabric", date: "Jun 22", status: "Pending" },
]

export function DashboardPreviewSection() {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <section id="dashboard" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Dashboard</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One control panel for everything
          </h2>
          <p className="mt-4 text-muted-foreground">
            Manage your entire DJ presence from a single, intuitive dashboard. No technical skills required.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex">
              {/* Sidebar */}
              <div className="hidden w-64 border-r border-border bg-sidebar p-4 lg:block">
                {/* Logo */}
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-accent">
                    <span className="text-xs font-bold text-accent-foreground">DJ</span>
                  </div>
                  <span className="text-sm font-bold text-sidebar-foreground">DJHQ</span>
                </div>

                {/* Nav items */}
                <nav className="mt-6 space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setActiveItem(item.label)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        activeItem === item.label
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main content */}
              <div className="flex-1 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Welcome back, Andres</h3>
                    <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your DJHQ</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Profile: 85% complete</span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-[85%] bg-accent" />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Link Clicks", value: "12.4k", change: "+12%", period: "this month" },
                    { label: "Profile Views", value: "8.2k", change: "+8%", period: "this month" },
                    { label: "Booking Inquiries", value: "47", change: "+23%", period: "this month" },
                    { label: "Press Kit Downloads", value: "156", change: "+5%", period: "this month" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <span className="text-xs text-accent">{stat.change}</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.period}</p>
                    </div>
                  ))}
                </div>

                {/* Content grid */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  {/* Quick actions */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
                    <div className="mt-4 space-y-2">
                      {quickActions.map((action) => (
                        <button
                          key={action.label}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                            <action.icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-left">{action.label}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent releases */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Recent Releases</h4>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-accent hover:text-accent/80">
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {recentReleases.map((release) => (
                        <div key={release.title} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-accent/10" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{release.title}</p>
                            <p className="text-xs text-muted-foreground">{release.streams} streams</p>
                          </div>
                          <span className="text-xs text-accent">{release.trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming gigs */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Upcoming Gigs</h4>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-accent hover:text-accent/80">
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {upcomingGigs.map((gig) => (
                        <div key={gig.venue} className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center rounded bg-secondary px-2 py-1">
                            <span className="text-xs font-medium text-foreground">{gig.date}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{gig.venue}</p>
                            <span className={`text-xs ${gig.status === "Confirmed" ? "text-accent" : "text-muted-foreground"}`}>
                              {gig.status}
                            </span>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
