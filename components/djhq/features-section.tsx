import { CalendarCheck, LayoutDashboard, Sparkles } from "lucide-react"

const values = [
  {
    icon: Sparkles,
    title: "Look professional",
    description: "Send promoters and bookers one polished profile instead of scattered links.",
  },
  {
    icon: CalendarCheck,
    title: "Get booked faster",
    description: "Keep your bio, music, gigs, photos, and booking contact ready in one place.",
  },
  {
    icon: LayoutDashboard,
    title: "Stay organized",
    description: "Manage releases, links, press assets, and artist info from a clean dashboard.",
  },
]

export function FeaturesSection() {
  return (
    <section id="product" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Product</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One premium page for the business side of your artist identity
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10">
                <value.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
