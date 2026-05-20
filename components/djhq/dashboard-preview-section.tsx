import {
  Calendar,
  Disc3,
  FileText,
  Image,
  LayoutDashboard,
  Link2,
  Mail,
  User,
} from "lucide-react"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: User, label: "Profile" },
  { icon: Link2, label: "Links" },
  { icon: Disc3, label: "Releases" },
  { icon: Calendar, label: "Gigs" },
  { icon: FileText, label: "Press Kit" },
]

const actions = [
  { label: "Edit public profile", icon: User },
  { label: "Add release", icon: Disc3 },
  { label: "Add gig", icon: Calendar },
  { label: "Upload press photo", icon: Image },
  { label: "Update booking info", icon: Mail },
]

export function DashboardPreviewSection() {
  return (
    <section id="dashboard" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Dashboard</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Control everything from one clean dashboard.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Update your public page without rebuilding the same profile across every platform.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex">
            <div className="hidden w-56 border-r border-border bg-sidebar p-4 lg:block">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-accent">
                  <span className="text-xs font-bold text-accent-foreground">DJ</span>
                </div>
                <span className="text-sm font-bold text-sidebar-foreground">DJHQ</span>
              </div>

              <nav className="mt-6 space-y-1">
                {sidebarItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      item.active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                ))}
              </nav>
            </div>

            <div className="flex-1 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">ANDRES:HERRERA</h3>
                  <p className="text-sm text-muted-foreground">Public profile workspace</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Profile: 85% complete</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[85%] bg-accent" />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">Quick updates</h4>
                  <div className="mt-4 space-y-2">
                    {actions.map((action) => (
                      <div
                        key={action.label}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                          <action.icon className="h-4 w-4" />
                        </div>
                        <span>{action.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Featured Release</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">Midnight Protocol</p>
                    <p className="text-sm text-muted-foreground">Streaming links and release notes ready.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Press Kit</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">Updated</p>
                    <p className="text-sm text-muted-foreground">Bio, photos, and booking contact in one place.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next Gig</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">Fabric London</p>
                        <p className="text-sm text-muted-foreground">Aug 15 - Room 1 - Headline Set</p>
                      </div>
                      <span className="rounded bg-accent/10 px-2 py-1 text-xs font-medium text-accent">Live</span>
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
