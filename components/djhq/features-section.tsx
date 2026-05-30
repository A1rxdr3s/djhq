import Link from "next/link"
import {
  ArrowRight,
  CalendarCheck,
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
import { SectionHeader } from "@/components/djhq/section-header"

const contextCards = [
  {
    icon: User2,
    label: "Artist Profile",
    desc: "Bio, genres, location, and social links — in one read.",
  },
  {
    icon: Disc3,
    label: "Releases",
    desc: "Catalog with label, date, and streaming links.",
  },
  {
    icon: CalendarCheck,
    label: "Shows",
    desc: "Upcoming gigs with venue, city, and ticket links.",
  },
  {
    icon: Play,
    label: "DJ Sets",
    desc: "Performance archive with artwork and streaming.",
  },
  {
    icon: Play,
    label: "Videos",
    desc: "Live performance recordings and music videos.",
  },
  {
    icon: ImageIcon,
    label: "Gallery",
    desc: "High-res press photos, ready for promoters.",
  },
  {
    icon: Download,
    label: "Press Kit",
    desc: "One-click EPK — bio, photos, technical rider.",
  },
  {
    icon: Link2,
    label: "Booking",
    desc: "Direct contact, management, and all social handles.",
  },
]

const workflowCards = [
  {
    icon: Zap,
    label: "Send to promoters",
    desc: "Everything they need. One link, no follow-up email.",
  },
  {
    icon: Globe,
    label: "Your own domain",
    desc: "Use your URL. Your name, your brand.",
  },
  {
    icon: Smartphone,
    label: "Updated once, everywhere",
    desc: "Change it in your dashboard. Your page is live instantly.",
  },
  {
    icon: ImageIcon,
    label: "Always looks right",
    desc: "On a phone, on desktop, embedded in a booking email.",
  },
]

export function FeaturesSection() {
  return (
    <div id="product" className="space-y-0">
      {/* What DJHQ brings together */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader variant="primary">What DJHQ brings together</SectionHeader>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground/75">
            Everything a promoter, label, or fan needs — structured so nothing gets buried.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {contextCards.map((card) => (
              <div
                key={card.label}
                className="group rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-200 hover:border-accent/25 hover:bg-white/[0.035]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <card.icon className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/70">{card.label}</p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground/55">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Built for real artist workflows */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader>Built for real artist workflows</SectionHeader>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-200 hover:border-accent/25 hover:bg-white/[0.035]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <card.icon className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/70">{card.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/55">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Live example + Request Access — two-column on desktop */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

            {/* Live Example */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02] px-7 py-8 sm:px-8 sm:py-10">
              <div className="pointer-events-none absolute left-1/2 top-0 h-[180px] w-[320px] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[70px]" />
              <div className="relative">
                <SectionHeader>Live Example</SectionHeader>
                <h2 className="mt-4 text-2xl font-black uppercase tracking-[-0.02em] text-foreground sm:text-3xl">
                  ANDRES:HERRERA
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
                  Browse a live DJHQ artist profile — no signup required.
                </p>
                <p className="mt-2 font-mono text-[11px] text-accent/50">djhq.com/andresherrera</p>
                <div className="mt-6">
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/[0.10] bg-transparent text-sm hover:bg-white/[0.05]"
                  >
                    <Link href="/andresherrera">
                      View Profile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Request Access */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-accent/20 bg-accent/[0.03] px-7 py-8 sm:px-8 sm:py-10">
              <div className="pointer-events-none absolute left-1/2 top-0 h-[180px] w-[320px] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[70px]" />
              <div className="relative">
                <SectionHeader variant="primary">Early Access</SectionHeader>
                <h2 className="mt-4 text-2xl font-black uppercase tracking-[-0.02em] text-foreground sm:text-3xl">
                  DJHQ is opening gradually.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
                  We&apos;re onboarding artists by hand. Every profile is reviewed before it goes live.
                </p>
                <div className="mt-6">
                  <Button asChild className="bg-accent text-sm text-accent-foreground hover:bg-accent/90">
                    <a href="mailto:access@djhq.co">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
