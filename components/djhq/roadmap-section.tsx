import { 
  Music2, 
  Radio, 
  Disc3, 
  Youtube, 
  Calendar, 
  Mail, 
  Link2, 
  Bot, 
  FileText, 
  CreditCard,
  Globe,
  Sparkles
} from "lucide-react"

const integrations = [
  { icon: Music2, name: "Spotify", status: "Coming Soon" },
  { icon: Radio, name: "SoundCloud", status: "Coming Soon" },
  { icon: Disc3, name: "Beatport", status: "Planned" },
  { icon: Youtube, name: "YouTube", status: "Planned" },
  { icon: Calendar, name: "Bandsintown", status: "Planned" },
  { icon: Calendar, name: "Resident Advisor", status: "Planned" },
  { icon: Mail, name: "Mailchimp", status: "Planned" },
  { icon: CreditCard, name: "Stripe", status: "Planned" },
  { icon: Globe, name: "Custom Domains", status: "Coming Soon" },
  { icon: Bot, name: "AI-Generated Bios", status: "In Development" },
  { icon: Link2, name: "Smart Release Links", status: "In Development" },
  { icon: FileText, name: "Press Kit PDF Export", status: "Coming Soon" },
]

export function RoadmapSection() {
  return (
    <section className="border-t border-border bg-card/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Roadmap</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            We&apos;re just getting started
          </h2>
          <p className="mt-4 text-muted-foreground">
            Upcoming integrations and features that will make DJHQ even more powerful.
          </p>
        </div>

        {/* Integrations grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <integration.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature request CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-4 w-4 text-accent" />
            Have a feature request?{" "}
            <a href="#" className="text-accent hover:underline">
              Let us know
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
