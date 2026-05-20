import { LinkIcon, FileText, AlertCircle, FolderOpen, Music, Workflow } from "lucide-react"

const painPoints = [
  {
    icon: LinkIcon,
    title: "Scattered Links",
    description: "Links spread across 10+ platforms with no unified presence",
  },
  {
    icon: FileText,
    title: "Outdated Press Kits",
    description: "Sharing stale PDFs and random Dropbox folders with bookers",
  },
  {
    icon: AlertCircle,
    title: "Weak Booking Pages",
    description: "No professional way for promoters to inquire about bookings",
  },
  {
    icon: FolderOpen,
    title: "No Central Hub",
    description: "No single destination to showcase your complete artist identity",
  },
  {
    icon: Music,
    title: "No Release Showcase",
    description: "Releases buried in streaming platforms with no context or story",
  },
  {
    icon: Workflow,
    title: "No Workflow",
    description: "Zero streamlined process for promoters and booking agents",
  },
]

export function ProblemSection() {
  return (
    <section className="border-t border-border bg-card/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">The Problem</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your DJ identity is scattered across the internet
          </h2>
          <p className="mt-4 text-muted-foreground">
            Instagram, SoundCloud, Spotify, Beatport, YouTube, Dropbox, Google Drive, PDFs, booking emails, random links. 
            DJHQ centralizes everything into one professional, booker-ready profile.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <point.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{point.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
