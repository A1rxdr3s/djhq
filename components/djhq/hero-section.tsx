import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  Download,
  ExternalLink,
  ImageIcon,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Play,
  Youtube,
} from "lucide-react"
import { Button } from "@/components/ui/button"

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.308c.013.06.045.094.104.094.057 0 .09-.038.104-.094l.193-1.308-.193-1.332c-.014-.057-.047-.094-.104-.094m1.8-.655c-.066 0-.109.042-.116.1l-.218 2.08.218 2.016c.007.064.05.107.116.107.065 0 .107-.043.116-.107l.246-2.016-.246-2.08c-.009-.058-.051-.1-.116-.1m.882-.086c-.073 0-.116.048-.124.113l-.209 2.167.209 2.06c.008.068.051.119.124.119.072 0 .116-.05.124-.119l.235-2.06-.235-2.167c-.008-.065-.052-.113-.124-.113m.874-.18c-.08 0-.131.053-.139.126l-.2 2.346.2 2.067c.008.075.059.131.139.131.079 0 .131-.056.139-.131l.226-2.067-.226-2.346c-.008-.073-.06-.126-.139-.126m.877-.175c-.086 0-.139.059-.146.139l-.191 2.522.191 2.062c.007.081.06.146.146.146s.139-.065.146-.146l.215-2.062-.215-2.522c-.007-.08-.06-.139-.146-.139m.879-.076c-.093 0-.146.064-.153.146l-.183 2.597.183 2.06c.007.088.06.153.153.153.092 0 .146-.065.153-.153l.206-2.06-.206-2.597c-.007-.082-.061-.146-.153-.146m.882.017c-.1 0-.153.07-.16.153l-.175 2.427.175 2.053c.007.094.06.16.16.16.098 0 .153-.066.16-.16l.197-2.053-.197-2.427c-.007-.083-.062-.153-.16-.153m.884-.165c-.107 0-.161.076-.168.166l-.166 2.592.166 2.044c.007.1.061.172.168.172.105 0 .16-.072.168-.172l.186-2.044-.186-2.592c-.008-.09-.063-.166-.168-.166m.882.06c-.114 0-.168.08-.175.173l-.158 2.533.158 2.034c.007.1.061.179.175.179.113 0 .168-.079.175-.179l.178-2.034-.178-2.533c-.007-.093-.062-.173-.175-.173m.87-.282c-.12 0-.175.085-.182.185l-.15 2.815.15 2.025c.007.107.062.185.182.185.119 0 .175-.078.182-.185l.169-2.025-.169-2.815c-.007-.1-.063-.185-.182-.185m.897-.21c-.128 0-.183.092-.19.192l-.14 3.025.14 2.016c.007.107.062.192.19.192.127 0 .183-.085.19-.192l.158-2.016-.158-3.025c-.007-.1-.063-.192-.19-.192m.89-.124c-.134 0-.189.098-.196.199l-.132 3.148.132 2.006c.007.114.062.205.196.205.133 0 .189-.09.196-.205l.149-2.006-.149-3.148c-.007-.101-.063-.199-.196-.199m.891-.09c-.14 0-.196.104-.203.206l-.124 3.238.124 1.996c.007.12.063.212.203.212.14 0 .196-.092.203-.212l.14-1.996-.14-3.238c-.007-.102-.063-.206-.203-.206m5.146.677c-.37 0-.726.057-1.063.164-.217-2.407-2.262-4.287-4.749-4.287-.603 0-1.19.12-1.732.34-.174.066-.209.135-.212.268v8.458c.003.137.104.247.237.265l7.519.004c1.467 0 2.654-1.2 2.654-2.68s-1.187-2.532-2.654-2.532" />
    </svg>
  )
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function BeatportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.53c-3.6 0-6.53-2.93-6.53-6.53S8.4 5.47 12 5.47 18.53 8.4 18.53 12 15.6 18.53 12 18.53zm0-10.59c-2.24 0-4.06 1.82-4.06 4.06s1.82 4.06 4.06 4.06 4.06-1.82 4.06-4.06-1.82-4.06-4.06-4.06z" />
    </svg>
  )
}

const musicLinks = [
  { label: "Beatport", icon: BeatportIcon, href: "https://www.beatport.com/" },
  { label: "Spotify", icon: SpotifyIcon, href: "https://open.spotify.com/" },
  { label: "SoundCloud", icon: SoundCloudIcon, href: "https://soundcloud.com/" },
  { label: "YouTube", icon: Youtube, href: "https://www.youtube.com/" },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-[12%] h-[560px] w-[560px] rounded-full bg-accent/[0.045] blur-[150px]" />
        <div className="absolute right-[12%] top-[44%] h-[380px] w-[380px] rounded-full bg-accent/[0.025] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/[0.06] px-5 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">DJHQ for Artists</span>
        </div>

        <h1 className="max-w-4xl text-center text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.08]">
          Your DJ profile, press kit, music, shows and booking links — in one place.
        </h1>

        <p className="mt-6 max-w-[640px] text-center text-balance text-lg leading-relaxed text-muted-foreground">
          One clean URL for every booker, promoter, and label that needs to know who you are.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 bg-accent px-8 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            <a href="mailto:access@djhq.co">
              Request Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 border-border/60 text-sm text-foreground hover:bg-secondary/60">
            <Link href="/andresherrera">
              <Play className="mr-2 h-4 w-4" />
              View Example
            </Link>
          </Button>
        </div>

        <div className="relative mt-16 w-full max-w-[980px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.05] blur-[140px]" />

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/50 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/[0.08]" />

            <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                </div>
                <div className="ml-3 flex min-w-0 items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1">
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate font-mono text-[10px] text-muted-foreground/80">djhq.com/andresherrera</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent/60" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-accent/80">Live</span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="relative mb-5 aspect-[16/7] w-full overflow-hidden rounded-xl">
                <Image
                  src="/images/dj-hero.jpg"
                  alt="DJ performing at a club with moody lighting"
                  fill
                  sizes="(min-width: 1024px) 980px, 100vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/35 to-transparent" />
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-accent/70 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm" style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 12%, transparent)" }}>House</span>
                  <span className="rounded-full border border-accent/70 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm" style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 12%, transparent)" }}>Tech House</span>
                  <span className="rounded-full border border-accent/70 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm" style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 12%, transparent)" }}>Producer</span>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">ANDRES:HERRERA</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-xs">Miami / Berlin</span>
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Dark, groove-led house and techno for clubs, festivals, and late-night rooms.
                      </p>
                    </div>
                    <a href="https://www.instagram.com/" aria-label="View Instagram profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                      <Instagram className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-4">
                    {musicLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
                      >
                        <item.icon className="h-3.5 w-3.5 text-accent" />
                        {item.label}
                      </a>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5">
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        <Music2 className="h-3.5 w-3.5 text-accent" />
                        Latest Release
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">Midnight Protocol EP</p>
                      <p className="text-xs text-muted-foreground/70">Out now on Drumcode</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5">
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        Upcoming Gig
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">Fabric London</p>
                      <p className="text-xs text-muted-foreground/70">Aug 15 - Room 1</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5">
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        <Play className="h-3.5 w-3.5 text-accent" />
                        DJ Set / Mix
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">Warehouse Hours 042</p>
                      <p className="text-xs text-muted-foreground/70">68 min live club mix</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-secondary/15 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <ImageIcon className="h-3.5 w-3.5 text-accent" />
                    Photo Gallery
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["object-left", "object-center", "object-right"].map((position, index) => (
                      <div key={position} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary">
                        <Image
                          src="/images/dj-hero.jpg"
                          alt={`ANDRES:HERRERA press photo ${index + 1}`}
                          fill
                          sizes="96px"
                          className={`object-cover ${position}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90">
                      <Mail className="h-3.5 w-3.5" />
                      Book this artist
                    </button>
                    <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/40 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/60">
                      <Download className="h-3.5 w-3.5 text-accent" />
                      Download press kit
                    </button>
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
