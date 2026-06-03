import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Music2,
  Play,
  Radio,
  Star,
} from "lucide-react"

// ─── Micro UI pieces used inside product screenshots ──────────────────────────

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.10em] ${
        accent
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-white/[0.08] bg-white/[0.03] text-white/45"
      }`}
    >
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.30em] text-accent/60">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="h-px bg-white/[0.06]" />
}

// ─── Inline product UI previews ───────────────────────────────────────────────

function ProfilePreview() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[oklch(0.09_0_0)]">
      {/* URL bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.05] bg-black/40 px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-accent/70" />
        <span className="font-mono text-[10px] text-white/28">djhq.co / andresherrera</span>
      </div>

      {/* Hero strip */}
      <div className="relative h-28 overflow-hidden bg-[oklch(0.07_0_0)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,_oklch(0.18_0.05_160),_transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[oklch(0.09_0_0)] to-transparent" />
        <div className="absolute bottom-4 left-5">
          <div className="mb-1.5 flex gap-1.5">
            {["House", "Tech House"].map((g) => (
              <span key={g} className="rounded-full border border-accent/30 bg-black/40 px-2 py-px text-[8px] font-semibold uppercase tracking-[0.08em] text-white/70">
                {g}
              </span>
            ))}
          </div>
          <p className="text-lg font-black uppercase leading-none tracking-[-0.02em] text-white">ANDRES:HERRERA</p>
          <p className="mt-0.5 text-[10px] text-white/40">Buenos Aires · House / Tech House</p>
        </div>
      </div>

      {/* Show row */}
      <div className="border-t border-white/[0.05] px-5 py-3">
        <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-accent/55">Next Show</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/85">ICE Festival</p>
            <p className="text-[10px] text-white/38">Espacio Costanera · Jun 28, 2025</p>
          </div>
          <span className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[9px] text-white/35">Tickets</span>
        </div>
      </div>

      {/* Release row */}
      <div className="border-t border-white/[0.05] px-5 py-3">
        <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-accent/55">Latest Release</p>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-9 w-9 rounded-md"
                style={{
                  background: `linear-gradient(135deg, oklch(${0.4 + i * 0.05} 0.12 ${160 + i * 20}), oklch(0.08 0 0))`,
                }}
              />
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/75">Thank You</p>
            <p className="text-[9px] text-white/32">Groove People Records · 2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PressKitPreview() {
  const assets = [
    { icon: Download, label: "Press Kit ENG", sub: "PDF · 4.2 MB", ok: true },
    { icon: Download, label: "Press Kit ESP", sub: "PDF · 3.8 MB", ok: true },
    { icon: FolderOpen, label: "Full Drive Package", sub: "Google Drive", ok: true },
    { icon: FileText, label: "Technical Rider", sub: "Stage requirements", ok: true },
  ]

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[oklch(0.09_0_0)]">
      {/* Header */}
      <div className="border-b border-white/[0.05] px-5 py-4">
        <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-accent/60">Electronic Press Kit</p>
        <p className="mt-1 text-base font-black tracking-[-0.02em] text-white">ANDRES:HERRERA</p>
        <p className="mt-0.5 text-[10px] text-white/35">House · Tech House · Buenos Aires</p>
      </div>

      {/* Download grid */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {assets.map(({ icon: Icon, label, sub, ok }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <Icon className="h-4 w-4 text-accent/70" />
            <p className="mt-3 text-xs font-bold text-white/85">{label}</p>
            <p className="mt-0.5 text-[9px] text-white/32">{sub}</p>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.10em] text-accent/60">
              {ok ? "Download" : "Missing"}
              <ExternalLink className="h-2 w-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Photos strip */}
      <div className="border-t border-white/[0.05] p-4">
        <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.24em] text-accent/55">Press Photos Preview</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg"
              style={{
                background: `linear-gradient(135deg, oklch(${0.15 + i * 0.02} 0.03 ${160 + i * 30}), oklch(0.08 0 0))`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShowsPreview() {
  const shows = [
    { date: "Jun 28", venue: "ICE Festival", city: "Buenos Aires", status: "upcoming" },
    { date: "Jul 23", venue: "Club Room", city: "Barcelona", status: "upcoming" },
    { date: "Aug 05", venue: "Boiler Room", city: "Berlin", status: "upcoming" },
  ]

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[oklch(0.09_0_0)]">
      <div className="border-b border-white/[0.05] px-5 py-3.5">
        <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-accent/60">Upcoming Shows</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {shows.map((show, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <div className="w-10 shrink-0 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-accent/60">{show.date.split(" ")[0]}</p>
              <p className="text-lg font-black leading-none text-white/85">{show.date.split(" ")[1]}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/85">{show.venue}</p>
              <p className="text-[10px] text-white/38">{show.city}</p>
            </div>
            <span className="rounded-full border border-accent/20 bg-accent/[0.07] px-2 py-0.5 text-[9px] font-medium text-accent/70">
              Upcoming
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReleasesPreview() {
  const releases = [
    { title: "Thank You", label: "Groove People Records", year: "2025", type: "Single" },
    { title: "Sky Sunset", label: "Misa Records", year: "2024", type: "EP" },
    { title: "Arrival", label: "Groove People Records", year: "2024", type: "Single" },
    { title: "Neon Lights", label: "Deep Horizon", year: "2023", type: "Single" },
  ]

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[oklch(0.09_0_0)]">
      <div className="border-b border-white/[0.05] px-5 py-3.5">
        <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-accent/60">Releases</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {releases.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
            <div
              className="h-9 w-9 shrink-0 rounded-lg"
              style={{
                background: `linear-gradient(135deg, oklch(${0.35 + i * 0.04} 0.12 ${160 + i * 25}), oklch(0.08 0 0))`,
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white/82">{r.title}</p>
              <p className="text-[9px] text-white/32">{r.year} · {r.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-bold uppercase tracking-[0.20em] text-foreground">DJHQ</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/andresherrera" className="text-[12px] text-white/40 transition-colors hover:text-white/70">
            Demo
          </Link>
          <Link href="/sign-in" className="text-[12px] text-white/40 transition-colors hover:text-white/70">
            Sign in
          </Link>
          <a
            href="mailto:access@djhq.co"
            className="inline-flex h-8 items-center rounded-full bg-accent px-5 text-[11px] font-bold uppercase tracking-[0.10em] text-accent-foreground transition-all duration-150 hover:bg-accent/90"
          >
            Request Access
          </a>
        </div>
      </div>
    </nav>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1fr]">

          {/* Left */}
          <div>
            <div
              className="mb-6 motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ animationDelay: "0ms" }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Now in private access
              </span>
            </div>

            <h1
              className="mb-6 text-[2.8rem] font-black leading-[1.01] tracking-[-0.03em] text-foreground motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both] sm:text-[3.4rem] lg:text-[4rem]"
              style={{ animationDelay: "60ms" }}
            >
              The Operating<br />System For DJs
            </h1>

            <p
              className="mb-10 max-w-[400px] text-[15px] leading-[1.72] text-white/42 motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ animationDelay: "140ms" }}
            >
              Build your artist website, electronic press kit, releases, shows and booking presence from one platform.
            </p>

            <div
              className="flex flex-wrap items-center gap-3 motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ animationDelay: "210ms" }}
            >
              <a
                href="mailto:access@djhq.co"
                className="inline-flex h-11 items-center rounded-full bg-accent px-7 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_32px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
              >
                Request Access
              </a>
              <Link
                href="/andresherrera"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/55 transition-all duration-150 hover:border-white/[0.20] hover:text-white/85"
              >
                View Demo Artist
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div
              className="mt-10 flex items-center gap-6 motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ animationDelay: "280ms" }}
            >
              {[
                "Artist Website",
                "Electronic Press Kit",
                "Booking",
              ].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-accent/60" />
                  <span className="text-[11px] text-white/35">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — product preview */}
          <div
            className="relative motion-safe:[animation:hp-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: "180ms" }}
          >
            <div className="overflow-hidden rounded-[24px] border border-white/[0.07] shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/[0.05] bg-black/50 px-4 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
                <span className="font-mono text-[10px] text-white/25">djhq.co / andresherrera</span>
              </div>
              <ProfilePreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductProofSection() {
  const blocks = [
    {
      id: "profile",
      label: "Artist Profile",
      desc: "Your artist identity. Genres, location, bio, social links and hero image — all in one place.",
      preview: <ProfilePreview />,
    },
    {
      id: "presskit",
      label: "Press Kit",
      desc: "EPK with downloadable PDFs, asset folders, press photos and booking contact — one URL.",
      preview: <PressKitPreview />,
    },
    {
      id: "shows",
      label: "Shows",
      desc: "Upcoming and past performances, venue details and ticket links — auto-sorted by date.",
      preview: <ShowsPreview />,
    },
    {
      id: "releases",
      label: "Releases",
      desc: "Music catalog with artwork, streaming links, label info and featured release on your profile.",
      preview: <ReleasesPreview />,
    },
  ]

  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16">
          <SectionLabel>Product</SectionLabel>
          <h2 className="mt-3 text-[2rem] font-black leading-[1.06] tracking-[-0.025em] text-foreground sm:text-[2.6rem]">
            Everything important.<br />One place.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {blocks.map(({ id, label, desc, preview }) => (
            <div
              key={id}
              className="group overflow-hidden rounded-[20px] border border-white/[0.06] bg-card/30 transition-colors duration-200 hover:border-white/[0.10]"
            >
              {/* Header */}
              <div className="border-b border-white/[0.05] px-6 py-4">
                <p className="text-sm font-semibold text-foreground/82">{label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/35">{desc}</p>
              </div>
              {/* Preview */}
              <div className="p-4">
                {preview}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyDJHQSection() {
  const cols = [
    {
      label: "Artist Identity",
      icon: Globe,
      points: [
        "Custom domain support",
        "Artist logo & branding",
        "Accent theme system",
        "EPK at your own URL",
        "All pages under one identity",
      ],
    },
    {
      label: "Booking Infrastructure",
      icon: CalendarDays,
      points: [
        "Booking inquiry form",
        "Shows calendar (past + future)",
        "Venue & city tracking",
        "Status management",
        "Booking contact page",
      ],
    },
    {
      label: "Press & Media",
      icon: FileText,
      points: [
        "PDF press kit (EN + ES)",
        "Press photos gallery",
        "Technical rider folder",
        "Logos & artwork folder",
        "One EPK URL to share",
      ],
    },
  ]

  return (
    <section className="border-t border-white/[0.05] py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <SectionLabel>Why DJHQ</SectionLabel>
            <h2 className="mt-3 text-[2rem] font-black leading-[1.06] tracking-[-0.025em] text-foreground sm:text-[2.6rem]">
              Built for electronic<br />music professionals.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-xs text-[13px] leading-relaxed text-white/35">
              Not a link-in-bio. Not a website builder. A complete operating layer for your artist career.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {cols.map(({ label, icon: Icon, points }) => (
            <div key={label} className="rounded-[20px] border border-white/[0.06] bg-card/25 p-6">
              <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04]">
                <Icon className="h-4 w-4 text-accent/70" />
              </div>
              <p className="mb-4 text-sm font-semibold text-foreground/82">{label}</p>
              <ul className="space-y-2.5">
                {points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/45" />
                    <span className="text-[12px] leading-snug text-white/38">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PublicProfileSection() {
  return (
    <section className="border-t border-white/[0.05] py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionLabel>Public Profile</SectionLabel>
          <h2 className="mt-3 text-[2rem] font-black leading-[1.06] tracking-[-0.025em] text-foreground sm:text-[2.6rem]">
            Your profile is the product.
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/38">
            A promoter, label or festival booking agent lands on your page and gets everything they need — without asking for it.
          </p>
        </div>

        {/* Full-width profile mockup */}
        <div className="overflow-hidden rounded-[24px] border border-white/[0.07]">
          {/* URL bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.05] bg-black/50 px-5 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
            <span className="font-mono text-[10px] text-white/25">djhq.co / andresherrera</span>
          </div>

          {/* Hero */}
          <div className="relative bg-[oklch(0.08_0_0)] px-8 py-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,_oklch(0.14_0.05_160),_transparent_55%)]" />
            <div className="relative max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-2">
                {["House", "Tech House", "Producer"].map((g) => (
                  <span key={g} className="rounded-full border border-accent/30 bg-black/40 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">
                    {g}
                  </span>
                ))}
              </div>
              <h3 className="text-[2.8rem] font-black uppercase leading-none tracking-[-0.025em] text-white sm:text-[3.6rem]">
                ANDRES:HERRERA
              </h3>
              <p className="mt-2 text-[13px] text-white/35">Buenos Aires, Argentina</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="#" className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-6 text-[12px] font-bold uppercase tracking-[0.08em] text-accent-foreground">
                  Book Andres
                </a>
                <a href="#" className="inline-flex h-10 items-center gap-2 rounded-full border border-accent/50 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
                  Press Kit
                </a>
              </div>
            </div>
          </div>

          {/* Three columns */}
          <div className="grid divide-x divide-white/[0.04] border-t border-white/[0.05] md:grid-cols-3">
            {/* Shows */}
            <div className="p-6">
              <p className="mb-4 text-[8px] font-bold uppercase tracking-[0.28em] text-accent/55">Upcoming Shows</p>
              <div className="space-y-3">
                {[
                  { date: "Jun 28", venue: "ICE Festival", city: "Buenos Aires" },
                  { date: "Jul 23", venue: "Club Room", city: "Barcelona" },
                  { date: "Aug 05", venue: "Boiler Room", city: "Berlin" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 shrink-0">
                      <p className="text-[8px] font-bold uppercase tracking-wide text-accent/50">{s.date.split(" ")[0]}</p>
                      <p className="text-[15px] font-black leading-none text-white/80">{s.date.split(" ")[1]}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white/78">{s.venue}</p>
                      <p className="text-[9px] text-white/35">{s.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Releases */}
            <div className="p-6">
              <p className="mb-4 text-[8px] font-bold uppercase tracking-[0.28em] text-accent/55">Releases</p>
              <div className="space-y-2.5">
                {[
                  { title: "Thank You", year: "2025" },
                  { title: "Sky Sunset", year: "2024" },
                  { title: "Arrival", year: "2024" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-md" style={{ background: `linear-gradient(135deg, oklch(${0.35 + i * 0.05} 0.12 ${160 + i * 20}), oklch(0.08 0 0))` }} />
                    <div>
                      <p className="text-[11px] font-semibold text-white/78">{r.title}</p>
                      <p className="text-[9px] text-white/32">{r.year}</p>
                    </div>
                    <Radio className="ml-auto h-3 w-3 text-white/18" />
                  </div>
                ))}
              </div>
            </div>

            {/* Press / Booking */}
            <div className="p-6">
              <p className="mb-4 text-[8px] font-bold uppercase tracking-[0.28em] text-accent/55">Contact & Press</p>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">Booking</p>
                  <p className="mt-0.5 font-mono text-[10px] text-accent/65">booking@andresherrera.music</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">Press Kit</p>
                  <p className="mt-0.5 font-mono text-[10px] text-white/38">djhq.co/andresherrera/presskit</p>
                </div>
                <div className="flex gap-2">
                  {["Spotify", "Beatport", "RA"].map((p) => (
                    <span key={p} className="rounded-full border border-white/[0.07] px-2.5 py-1 text-[9px] text-white/30">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <Link href="/andresherrera" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/35 transition-colors hover:text-white/65">
            View live profile
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function PressKitSection() {
  return (
    <section className="border-t border-white/[0.05] py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionLabel>Press Kit</SectionLabel>
          <h2 className="mt-3 text-[2rem] font-black leading-[1.06] tracking-[-0.025em] text-foreground sm:text-[2.6rem]">
            One URL. Every asset<br />a promoter needs.
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/38">
            Your EPK lives at your own URL. Downloadable PDFs in English and Spanish, press photos, tech rider and asset folders — all in one place.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — EPK preview */}
          <div className="overflow-hidden rounded-[24px] border border-white/[0.07]">
            <div className="flex items-center gap-2 border-b border-white/[0.05] bg-black/50 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
              <span className="font-mono text-[10px] text-white/25">djhq.co / andresherrera / presskit</span>
            </div>
            <PressKitPreview />
          </div>

          {/* Right — feature list */}
          <div className="flex flex-col justify-center space-y-5">
            {[
              {
                icon: Download,
                title: "Bilingual PDFs",
                desc: "Upload your press kit PDF in English and Spanish. Artists who tour internationally get both.",
              },
              {
                icon: FolderOpen,
                title: "Asset Folders",
                desc: "Link your Google Drive. Bio, logos, press photos and technical rider — each with its own button.",
              },
              {
                icon: Star,
                title: "Press Photos Preview",
                desc: "Your gallery images appear as a preview grid before the download link. Promoters see quality before they click.",
              },
              {
                icon: Globe,
                title: "Custom Domain",
                desc: "artist.com/presskit instead of a generic URL. Pro plan artists get full white-label EPK.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                  <Icon className="h-3.5 w-3.5 text-accent/65" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground/82">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-white/35">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCTASection() {
  return (
    <section className="border-t border-white/[0.05] py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-[24px] border border-white/[0.06] bg-card/30 px-8 py-16 text-center sm:px-16">
          <SectionLabel>Get Started</SectionLabel>
          <h2 className="mx-auto mt-5 max-w-2xl text-[2.2rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[3rem]">
            Your career deserves<br />better infrastructure.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/38">
            DJHQ is in private access. Artists, labels and agencies can request early entry.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:access@djhq.co"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_40px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
            >
              Request Access
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/andresherrera"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/55 transition-all duration-150 hover:border-white/[0.20] hover:text-white/85"
            >
              View Demo Artist
            </Link>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-white/18">
            Opening for selected artists
          </p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.20em] text-white/35">DJHQ</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-[11px] text-white/22 transition-colors hover:text-white/50">Login</Link>
          <p className="text-[11px] text-white/16">© {new Date().getFullYear()} DJHQ</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <HeroSection />
      <Divider />
      <ProductProofSection />
      <WhyDJHQSection />
      <PublicProfileSection />
      <PressKitSection />
      <FinalCTASection />
      <Footer />
    </main>
  )
}
