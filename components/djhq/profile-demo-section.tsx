import {
  Calendar,
  Disc3,
  Download,
  ExternalLink,
  FileText,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function ProfileDemoSection() {
  return (
    <section id="profile" className="border-t border-border bg-card/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Public Profile</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything a booker needs, ready to share
          </h2>
          <p className="mt-4 text-muted-foreground">
            A focused artist page for your bio, music, gigs, press kit, and booking contact.
          </p>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="relative h-48 bg-gradient-to-br from-accent/20 via-secondary to-background sm:h-64">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute bottom-5 right-5 hidden rounded-full border border-accent/20 bg-background/70 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm sm:block">
              djhq.com/andresherrera
            </div>
            <div className="absolute -bottom-12 left-6 sm:left-10">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-accent/20 sm:h-32 sm:w-32">
                <span className="text-xl font-bold text-accent sm:text-2xl">AH</span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-8 pt-16 sm:px-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    ANDRES:HERRERA
                  </h3>
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Verified
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Berlin-based Techno DJ & Producer
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Crafting dark, hypnotic techno since 2015. Resident at Tresor Berlin. Releases on Drumcode,
                  Suara, and Filth on Acid. Available for bookings worldwide.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a href="https://www.instagram.com/" aria-label="View Instagram profile" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a href="https://soundcloud.com/" aria-label="Listen on SoundCloud" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Music2 className="h-4 w-4" />
                  </a>
                  <a href="https://open.spotify.com/" aria-label="Listen on Spotify" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </a>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                      <Disc3 className="h-4 w-4 text-accent" />
                      Featured Release
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                        <Play className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Midnight Protocol</p>
                        <p className="text-xs text-muted-foreground">Drumcode / 2025</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                      <Calendar className="h-4 w-4 text-accent" />
                      Upcoming Gig
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-accent/10">
                        <span className="text-[10px] font-semibold uppercase text-accent">Aug</span>
                        <span className="text-base font-bold text-foreground">15</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Fabric London</p>
                        <p className="text-xs text-muted-foreground">Room 1 - Headline Set</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Booking Ready</h4>
                <div className="mt-5 space-y-3">
                  {[
                    "Artist bio",
                    "Listen links",
                    "Press photos",
                    "Electronic press kit",
                    "Booking contact",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Mail className="mr-2 h-4 w-4" />
                    Book this artist
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                    <FileText className="mr-2 h-4 w-4" />
                    Press Kit
                    <Download className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
