import Image from "next/image"
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  Music2,
  Play,
  Radio,
  Youtube,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const musicLinks = [
  { label: "Beatport", detail: "Releases and charts", icon: Music2, href: "https://www.beatport.com/" },
  { label: "Spotify", detail: "Artist profile", icon: Radio, href: "https://open.spotify.com/" },
  { label: "SoundCloud", detail: "DJ sets and previews", icon: Play, href: "https://soundcloud.com/" },
  { label: "YouTube", detail: "Videos and live clips", icon: Youtube, href: "https://www.youtube.com/" },
]

export function ProfileDemoSection() {
  return (
    <section id="profile" className="border-t border-border bg-card/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">DJ Example</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            ANDRES:HERRERA on DJHQ
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            A premium public page for everything promoters, fans, and bookers need first.
          </p>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/30">
          <div className="relative h-72 overflow-hidden sm:h-96">
            <Image
              src="/images/dj-hero.jpg"
              alt="ANDRES:HERRERA performing behind the decks"
              fill
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent backdrop-blur-sm" style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 20%, transparent)" }}>House</span>
                <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent backdrop-blur-sm" style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 20%, transparent)" }}>Tech House</span>
                <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent backdrop-blur-sm" style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 20%, transparent)" }}>Producer</span>
              </div>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">ANDRES:HERRERA</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Miami / Berlin
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Mail className="mr-2 h-4 w-4" />
                    Book this artist
                  </Button>
                  <Button variant="outline" className="border-border/70 bg-background/50 text-foreground backdrop-blur-sm hover:bg-secondary">
                    <Play className="mr-2 h-4 w-4" />
                    Listen now
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Dark, groove-led house and techno shaped for peak-time rooms and late-night afterhours. Recent releases
                have landed across club-focused labels, with a touring calendar built around intimate dance floors and
                festival stages.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Music2 className="h-4 w-4 text-accent" />
                    Latest Release
                  </div>
                  <p className="mt-4 font-semibold text-foreground">Midnight Protocol EP</p>
                  <p className="mt-1 text-xs text-muted-foreground">Drumcode / 2025</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Calendar className="h-4 w-4 text-accent" />
                    Upcoming Gig
                  </div>
                  <p className="mt-4 font-semibold text-foreground">Fabric London</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aug 15 - Room 1</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Play className="h-4 w-4 text-accent" />
                    DJ Set / Mix
                  </div>
                  <p className="mt-4 font-semibold text-foreground">Warehouse Hours 042</p>
                  <p className="mt-1 text-xs text-muted-foreground">68 min live club mix</p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {musicLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <link.icon className="h-4 w-4 text-accent" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{link.label}</span>
                        <span className="block text-xs text-muted-foreground">{link.detail}</span>
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <ImageIcon className="h-4 w-4 text-accent" />
                  Photo Gallery Preview
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {["object-left", "object-center", "object-right"].map((position, index) => (
                    <div key={position} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card">
                      <Image
                        src="/images/dj-hero.jpg"
                        alt={`ANDRES:HERRERA gallery photo ${index + 1}`}
                        fill
                        sizes="(min-width: 768px) 280px, 33vw"
                        className={`object-cover ${position}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-foreground">Press kit / booking</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Everything ready for promoters.</p>
                </div>
                <FileText className="h-5 w-5 text-accent" />
              </div>

              <div className="mt-6 space-y-3">
                {["Short bio", "Press photos", "Latest release", "Upcoming gigs", "Booking contact"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="mr-2 h-4 w-4" />
                Download press kit
              </Button>
              <Button variant="outline" className="mt-3 w-full border-border text-foreground hover:bg-secondary">
                <Mail className="mr-2 h-4 w-4" />
                Booking contact
              </Button>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
