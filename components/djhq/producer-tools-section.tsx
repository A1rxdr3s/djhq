import { Disc3, FileText, Timer } from "lucide-react"

const tools = [
  {
    icon: Timer,
    title: "BPM to milliseconds",
    description: "Convert tempo to delay times without leaving your workspace.",
  },
  {
    icon: Disc3,
    title: "Harmonic mixing helper",
    description: "Check compatible keys while planning sets or edits.",
  },
  {
    icon: FileText,
    title: "Release checklist",
    description: "Keep artwork, links, credits, and promo assets moving.",
  },
]

export function ProducerToolsSection() {
  return (
    <section id="tools" className="border-t border-border bg-card/50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-accent">Bonus Tools</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A few production helpers, built in.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Lightweight tools for common DJ and producer tasks, kept secondary to your public profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <tool.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{tool.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
