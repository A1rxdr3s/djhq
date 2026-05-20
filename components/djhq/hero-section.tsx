import {
  ArrowRight,
  Eye,
  Music,
  Calendar,
  Download,
  Link2,
  BarChart3,
  Mail,
  Pencil,
  Plus,
  Upload,
  Instagram,
  ExternalLink,
  Play,
  MapPin,
  FileText,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

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

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      {/* Layered ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-[15%] h-[600px] w-[600px] rounded-full bg-accent/[0.04] blur-[150px]" />
        <div className="absolute right-1/4 top-[40%] h-[400px] w-[400px] rounded-full bg-accent/[0.025] blur-[120px]" />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col items-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Top badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/[0.06] px-5 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-semibold tracking-widest text-accent uppercase">Now in Public Beta</span>
        </div>

        {/* Headline */}
        <h1 className="max-w-4xl text-center text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.08]">
          Your entire DJ career,{" "}
          <span className="relative text-accent">
            organized in one link
            <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none" preserveAspectRatio="none">
              <path d="M1 5.5C60 2 120 2 150 3.5C180 5 240 6 299 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/30" />
            </svg>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-[640px] text-center text-balance text-lg leading-relaxed text-muted-foreground">
          DJHQ gives DJs and producers a premium public profile, smart links, press kit, release hub, booking assets, and producer tools — all managed from one clean control panel.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 h-12 text-sm">
            Start building your DJHQ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="border-border/60 text-foreground hover:bg-secondary/60 h-12 text-sm">
            <Eye className="mr-2 h-4 w-4" />
            View artist demo
          </Button>
        </div>

        {/* ========== SPLIT PRODUCT MOCKUP ========== */}
        <div className="relative mt-16 w-full max-w-[1120px]">
          {/* Large ambient glow behind the mockup */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-accent/[0.05] blur-[140px]" />

          {/* Connector line between panels */}
          <div className="pointer-events-none absolute left-1/2 top-8 bottom-8 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-accent/15 to-transparent hidden md:block" />

          <div className="relative grid gap-5 md:grid-cols-2">
            {/* ===== LEFT: Public Artist Profile ===== */}
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/50 backdrop-blur-sm">
              {/* Subtle accent border glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/[0.08]" />

              {/* Browser-style top bar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  </div>
                  <div className="ml-3 flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1">
                    <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/80 font-mono">djhq.com/andresherrera</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-accent/60" />
                  <span className="text-[10px] font-semibold tracking-widest text-accent/80 uppercase">Live</span>
                </div>
              </div>

              <div className="p-5">
                {/* Artist hero image */}
                <div className="relative mb-5 aspect-[16/7] w-full overflow-hidden rounded-xl">
                  <Image
                    src="/images/dj-hero.jpg"
                    alt="DJ performing at a club with moody lighting"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  {/* Floating genre tags on the image */}
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="rounded-full bg-background/70 backdrop-blur-sm px-2.5 py-1 text-[10px] font-medium text-foreground/90">House</span>
                    <span className="rounded-full bg-background/70 backdrop-blur-sm px-2.5 py-1 text-[10px] font-medium text-foreground/90">Tech House</span>
                    <span className="rounded-full bg-accent/20 backdrop-blur-sm px-2.5 py-1 text-[10px] font-medium text-accent">Producer</span>
                  </div>
                </div>

                {/* Artist identity */}
                <div className="mb-1">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">ANDRES:HERRERA</h3>
                </div>

                {/* Location + social row */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Miami, FL</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <a href="https://www.instagram.com/" aria-label="View Instagram profile" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                      <Instagram className="h-4 w-4" />
                    </a>
                    <a href="https://open.spotify.com/" aria-label="Listen on Spotify" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                      <SpotifyIcon className="h-4 w-4" />
                    </a>
                    <a href="https://soundcloud.com/" aria-label="Listen on SoundCloud" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                      <SoundCloudIcon className="h-4 w-4" />
                    </a>
                    <a href="https://www.beatport.com/" aria-label="View Beatport profile" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                      <BeatportIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Profile CTAs */}
                <div className="mb-5 flex gap-2.5">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90">
                    <Mail className="h-3.5 w-3.5" />
                    Book This Artist
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/40 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70">
                    <Play className="h-3.5 w-3.5" />
                    Listen Now
                  </button>
                </div>

                {/* Featured release card */}
                <div className="mb-3 overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
                  <div className="px-3.5 py-2 border-b border-border/30">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Featured Release</p>
                  </div>
                  <div className="flex items-center gap-3.5 p-3.5">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/10">
                      <Music className="h-6 w-6 text-accent/70" />
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                        <Play className="h-2 w-2 text-accent-foreground ml-[1px]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">Midnight Protocol EP</p>
                      <p className="text-xs text-muted-foreground/70">Drumcode / 2025</p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full w-[65%] rounded-full bg-accent/40" />
                      </div>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent tracking-wide">NEW</span>
                  </div>
                </div>

                {/* Upcoming gig card */}
                <div className="mb-3 overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
                  <div className="px-3.5 py-2 border-b border-border/30">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Next Gig</p>
                  </div>
                  <div className="flex items-center gap-3.5 p-3.5">
                    <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-accent/10 border border-accent/10">
                      <span className="text-[10px] font-semibold text-accent uppercase leading-none">Aug</span>
                      <span className="text-lg font-bold text-foreground leading-tight">15</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">Fabric London</p>
                      <p className="text-xs text-muted-foreground/70">Room 1 — Headline Set</p>
                      <div className="mt-1 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/60">London, UK</span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Headline</span>
                  </div>
                </div>

                {/* Press kit download */}
                <button className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/50 bg-secondary/20 py-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary/40 hover:border-border">
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                  Download Electronic Press Kit
                  <Download className="h-3.5 w-3.5 text-accent/60" />
                </button>
              </div>
            </div>

            {/* ===== RIGHT: Private Dashboard ===== */}
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/50 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/[0.04]" />

              {/* Dashboard top bar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  </div>
                  <div className="ml-3 flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1">
                    <span className="text-[10px] text-muted-foreground/80 font-mono">djhq.com/dashboard</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-foreground/30" />
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Private</span>
                </div>
              </div>

              <div className="p-5">
                {/* Welcome header with profile completion */}
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Welcome back, Andres</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">Your DJHQ is looking great</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground/60">Profile</span>
                      <span className="text-sm font-bold text-accent">85%</span>
                    </div>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary/60">
                      <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-accent/80 to-accent" />
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  {[
                    { icon: Link2, label: "Link Clicks", value: "12.4k", change: "+12%", up: true },
                    { icon: Eye, label: "Profile Views", value: "8.2k", change: "+8%", up: true },
                    { icon: Mail, label: "Booking Inquiries", value: "47", change: "+23%", up: true },
                    { icon: Download, label: "EPK Downloads", value: "312", change: "+15%", up: true },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border/40 bg-secondary/15 p-3.5">
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-accent/10">
                          <stat.icon className="h-3 w-3 text-accent/70" />
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{stat.label}</p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
                        <div className="flex items-center gap-0.5">
                          <TrendingUp className="h-2.5 w-2.5 text-accent" />
                          <span className="text-[10px] font-semibold text-accent">{stat.change}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Latest releases */}
                <div className="mb-3 overflow-hidden rounded-xl border border-border/40 bg-secondary/15">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/30">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Latest Releases</p>
                    <BarChart3 className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    {[
                      { title: "Midnight Protocol", label: "Drumcode", streams: "24.8k", date: "2 days ago" },
                      { title: "Neural Network", label: "Suara", streams: "18.3k", date: "2 weeks ago" },
                    ].map((release) => (
                      <div key={release.title} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/8 border border-accent/10">
                          <Music className="h-4 w-4 text-accent/60" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{release.title}</p>
                          <p className="text-[10px] text-muted-foreground/60">{release.label} — {release.streams} streams</p>
                        </div>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground/40">{release.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming gigs */}
                <div className="mb-3 overflow-hidden rounded-xl border border-border/40 bg-secondary/15">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/30">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Upcoming Gigs</p>
                    <Calendar className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    {[
                      { venue: "Fabric London", date: "Aug 15", type: "Headline", color: "text-accent" },
                      { venue: "Berghain Berlin", date: "Sep 3", type: "Guest", color: "text-muted-foreground" },
                    ].map((gig) => (
                      <div key={gig.venue} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-accent/8 border border-accent/10">
                          <span className="text-[8px] font-bold text-accent/70 uppercase leading-none">{gig.date.split(" ")[0]}</span>
                          <span className="text-sm font-bold text-foreground leading-tight">{gig.date.split(" ")[1]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{gig.venue}</p>
                          <p className="text-[10px] text-muted-foreground/60">{gig.date}</p>
                        </div>
                        <span className={`flex-shrink-0 rounded-md bg-accent/8 px-2 py-0.5 text-[10px] font-medium ${gig.color}`}>{gig.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Pencil, label: "Edit Profile" },
                    { icon: Plus, label: "Add Release" },
                    { icon: Calendar, label: "Add Gig" },
                    { icon: Upload, label: "Upload Press Photo" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center gap-2 rounded-xl border border-border/40 bg-secondary/15 px-3 py-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary/30 hover:border-border/60 hover:text-foreground"
                    >
                      <action.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom labels */}
          <div className="mt-6 flex items-center justify-center gap-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <span className="text-xs font-medium text-muted-foreground/70">Your public profile — what fans and promoters see</span>
            </div>
            <div className="h-4 w-px bg-border/40 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/5 border border-foreground/10">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              </div>
              <span className="text-xs font-medium text-muted-foreground/70">Your private dashboard — your control panel</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
