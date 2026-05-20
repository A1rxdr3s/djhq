import { 
  Play, 
  Calendar, 
  Download, 
  Instagram, 
  Music2, 
  ExternalLink,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"

const upcomingGigs = [
  { venue: "Berghain", city: "Berlin", date: "Jun 15", country: "DE" },
  { venue: "fabric", city: "London", date: "Jun 22", country: "UK" },
  { venue: "Tresor", city: "Berlin", date: "Jul 8", country: "DE" },
]

const releases = [
  { title: "Midnight Protocol", label: "Drumcode", year: "2024", type: "EP" },
  { title: "Neural Network", label: "Suara", year: "2024", type: "Single" },
  { title: "Acid Dreams", label: "Filth on Acid", year: "2023", type: "EP" },
]

export function ProfileDemoSection() {
  return (
    <section id="profile" className="border-t border-border bg-card/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Live Example</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A profile that gets you booked
          </h2>
          <p className="mt-4 text-muted-foreground">
            See what a premium DJHQ profile looks like. Designed to impress bookers and promoters.
          </p>
        </div>

        {/* Profile Preview */}
        <div className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            {/* Hero area */}
            <div className="relative h-48 bg-gradient-to-br from-accent/20 via-secondary to-background sm:h-64">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              {/* Artist avatar */}
              <div className="absolute -bottom-12 left-6 sm:left-10">
                <div className="h-24 w-24 rounded-full border-4 border-background bg-accent/20 sm:h-32 sm:w-32" />
              </div>
            </div>

            {/* Profile content */}
            <div className="px-6 pb-8 pt-16 sm:px-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                {/* Artist info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      ANDRES:HERRERA
                    </h3>
                    <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      Verified
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Berlin-based Techno DJ & Producer</p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Crafting dark, hypnotic techno since 2015. Resident at Tresor Berlin. 
                    Releases on Drumcode, Suara, and Filth on Acid. Available for bookings worldwide.
                  </p>

                  {/* Social links */}
                  <div className="mt-4 flex items-center gap-3">
                    <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                      <Instagram className="h-4 w-4" />
                    </a>
                    <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                      <Music2 className="h-4 w-4" />
                    </a>
                    <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Book this artist
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                    <Play className="mr-2 h-4 w-4" />
                    Listen now
                  </Button>
                  <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Press Kit
                  </Button>
                </div>
              </div>

              {/* Content grid */}
              <div className="mt-10 grid gap-8 lg:grid-cols-3">
                {/* Releases */}
                <div className="lg:col-span-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                    <span className="h-1 w-4 bg-accent" />
                    Latest Releases
                  </h4>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {releases.map((release) => (
                      <div key={release.title} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent/50">
                        <div className="aspect-square rounded bg-accent/10" />
                        <h5 className="mt-3 font-medium text-foreground">{release.title}</h5>
                        <p className="text-xs text-muted-foreground">{release.label} · {release.year}</p>
                        <span className="mt-2 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {release.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming gigs */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                    <span className="h-1 w-4 bg-accent" />
                    Upcoming Gigs
                  </h4>
                  <div className="mt-4 space-y-3">
                    {upcomingGigs.map((gig) => (
                      <div key={gig.venue} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent/50">
                        <div className="flex flex-col items-center justify-center rounded bg-accent/10 px-3 py-2">
                          <span className="text-xs font-medium text-accent">{gig.date.split(" ")[0]}</span>
                          <span className="text-lg font-bold text-foreground">{gig.date.split(" ")[1]}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{gig.venue}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {gig.city}, {gig.country}
                          </p>
                        </div>
                      </div>
                    ))}
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
