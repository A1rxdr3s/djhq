import Link from "next/link"
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Disc3,
  Download,
  Globe,
  ImageIcon,
  Link2,
  Play,
  Smartphone,
  User2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const contextCards = [
  {
    icon: User2,
    title: "Artist Identity",
    description: "Bio, genres, base city, and social links — everything a booker needs in one glance.",
  },
  {
    icon: Play,
    title: "DJ Sets & Mixes",
    description: "Featured and archived sets with artwork, metadata, and streaming links.",
  },
  {
    icon: Disc3,
    title: "Releases",
    description: "Latest and catalog releases with label, date, and buy/stream links.",
  },
  {
    icon: CalendarCheck,
    title: "Shows",
    description: "Upcoming gigs with venue, city, and ticket links. Always current.",
  },
  {
    icon: ImageIcon,
    title: "Press Photos",
    description: "High-res gallery with precise crop control — ready for promoters to download.",
  },
  {
    icon: Download,
    title: "Press Kit",
    description: "One-click EPK download. Everything a label or promoter needs, packaged.",
  },
  {
    icon: Link2,
    title: "Booking & Contact",
    description: "Direct booking links, management contact, and all social handles in one place.",
  },
]

const workflowCards = [
  {
    icon: Globe,
    title: "Custom domain",
    description: "Use your own domain. Your name, your URL, your brand.",
  },
  {
    icon: Zap,
    title: "Import from link",
    description: "Paste a YouTube, SoundCloud, or Beatport URL. Fields fill themselves.",
  },
  {
    icon: Smartphone,
    title: "Any screen, any context",
    description: "Looks right on a phone link, a desktop deep-dive, or a booking email.",
  },
  {
    icon: Clock,
    title: "Live in minutes",
    description: "No design tools, no waiting. Your profile is live as soon as you save.",
  },
]

export function FeaturesSection() {
  return (
    <div id="product">
      {/* One link. Full artist context. */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">What's on your page</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One link. Full artist context.
            </h2>
            <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground">
              Every section a booker, label, or promoter might need — structured so nothing gets buried.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contextCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-accent/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <card.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for real DJ workflows */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">How it works</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for real DJ workflows.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {workflowCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-accent/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <card.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See a real DJHQ profile */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 px-8 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.04] blur-[100px]" />
            <span className="relative text-xs font-medium uppercase tracking-widest text-accent">Live example</span>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              See a real DJHQ profile.
            </h2>
            <p className="relative mt-3 text-sm text-muted-foreground">
              Browse a live artist page — no signup required.
            </p>
            <div className="relative mt-8">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-border/60 px-8 text-sm text-foreground hover:bg-secondary/60"
              >
                <Link href="/andresherrera">
                  View ANDRES:HERRERA
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Request Access */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent/[0.04] px-8 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-[240px] w-[480px] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[100px]" />
            <span className="relative text-xs font-semibold uppercase tracking-widest text-accent">Early access</span>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              DJHQ is opening gradually.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              We&apos;re onboarding artists by hand. No open signup — every profile is reviewed before it goes live.
            </p>
            <div className="relative mt-8">
              <Button
                asChild
                size="lg"
                className="h-11 bg-accent px-8 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
              >
                <a href="mailto:access@djhq.co">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
