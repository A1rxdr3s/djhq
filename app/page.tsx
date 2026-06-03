"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const ARTISTS = [
  {
    name: "ANDRES:HERRERA",
    genre: "House / Tech House",
    city: "Buenos Aires",
    handle: "andresherrera",
    gradient: "from-[#0D1A14] via-[#0A1410] to-[#080C0B]",
    accentGlow: "bg-[oklch(0.45_0.10_155)]",
  },
  {
    name: "VERA K.",
    genre: "Minimal Techno",
    city: "Berlin",
    handle: "andresherrera",
    gradient: "from-[#12100A] via-[#0E0C08] to-[#080807]",
    accentGlow: "bg-[oklch(0.40_0.08_85)]",
  },
  {
    name: "MARIN",
    genre: "Melodic House",
    city: "Amsterdam",
    handle: "andresherrera",
    gradient: "from-[#0A0E18] via-[#080C12] to-[#080807]",
    accentGlow: "bg-[oklch(0.38_0.08_230)]",
  },
]

const PLATFORMS = [
  { name: "Instagram", note: "Not professional" },
  { name: "Linktree", note: "Just links" },
  { name: "Dropbox", note: "Links expire" },
  { name: "Google Drive", note: "Hard to navigate" },
  { name: "PDF press kit", note: "Goes outdated" },
  { name: "WhatsApp", note: "Unprofessional" },
  { name: "Spotify link", note: "No booking info" },
  { name: "Beatport", note: "No press info" },
  { name: "SoundCloud", note: "No bio, no shows" },
]

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function MonoLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.28em] ${className}`}>
      {children}
    </span>
  )
}

function RevealDiv({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, visible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms", transitionTimingFunction: "cubic-bezier(0.25,0,0,1)" }}
    >
      {children}
    </div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[0.06] bg-[#0C0C0B]/92 backdrop-blur-xl"
          : "bg-transparent"
      }`}
      style={{ animation: "brand-nav-fade 0.6s cubic-bezier(0.25,0,0,1) 0.2s both" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.22em] text-[#F4F2EE]">
          DJHQ
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/andresherrera"
            className="font-mono text-[11px] text-[#F4F2EE]/35 transition-colors hover:text-[#F4F2EE]/65"
          >
            Demo →
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-[11px] text-[#F4F2EE]/35 transition-colors hover:text-[#F4F2EE]/65"
          >
            Sign in
          </Link>
          <a
            href="mailto:access@djhq.co"
            className="inline-flex h-8 items-center rounded-full border border-white/[0.14] bg-white/[0.04] px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F4F2EE]/80 transition-all duration-200 hover:border-white/[0.22] hover:bg-white/[0.08] hover:text-[#F4F2EE]"
          >
            Request Access
          </a>
        </div>
      </div>
    </nav>
  )
}

// ─── Section 1: Cover ─────────────────────────────────────────────────────────

function CoverSection() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-[#080807]">
      {/* Atmospheric background — warm dark gradient simulating stage lighting */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0D1A14] via-[#0A0E0C] to-[#080807]"
          style={{ animation: "brand-scale-in 1.2s cubic-bezier(0.25,0,0,1) both" }}
        />
        {/* Primary glow — accent, large, centered-left */}
        <div
          className="pointer-events-none absolute left-[10%] top-[20%] h-[70vh] w-[60vw] rounded-full opacity-[0.055]"
          style={{
            background: "radial-gradient(ellipse at center, oklch(0.70 0.15 155), transparent 70%)",
            animation: "brand-glow-pulse 18s ease-in-out infinite",
          }}
        />
        {/* Secondary glow — warm amber, right */}
        <div
          className="pointer-events-none absolute right-[5%] top-[40%] h-[40vh] w-[35vw] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(ellipse at center, oklch(0.72 0.12 85), transparent 70%)",
          }}
        />
      </div>

      {/* Content — bottom-left anchored like a magazine cover */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-32">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div
            className="mb-8"
            style={{ animation: "brand-reveal 0.7s cubic-bezier(0.25,0,0,1) 0.4s both" }}
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.70_0.15_155)]" style={{ animation: "brand-glow-pulse 3s ease-in-out infinite" }} />
              <MonoLabel className="text-[#F4F2EE]/50">Private access · Now open</MonoLabel>
            </span>
          </div>

          {/* Headline — serif, large */}
          <h1
            className="mb-8 font-serif text-[clamp(56px,8vw,110px)] font-light leading-[0.95] tracking-[0.005em] text-[#F4F2EE]"
            style={{ animation: "brand-reveal 0.9s cubic-bezier(0.25,0,0,1) 0.55s both" }}
          >
            Your career
            <br />
            <em className="italic text-[#F4F2EE]/70">deserves a better</em>
            <br />
            first impression.
          </h1>

          {/* Subheadline */}
          <p
            className="mb-10 max-w-[460px] text-[16px] leading-[1.78] text-[#F4F2EE]/42"
            style={{ animation: "brand-reveal 0.9s cubic-bezier(0.25,0,0,1) 0.72s both" }}
          >
            DJHQ gives you one professional destination — bio, press kit, shows,
            releases and booking contact. Everything a promoter needs. One URL.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center gap-4"
            style={{ animation: "brand-reveal 0.9s cubic-bezier(0.25,0,0,1) 0.85s both" }}
          >
            <a
              href="mailto:access@djhq.co"
              className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-[oklch(0.70_0.15_155)] px-7 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A0C0B] transition-all duration-300 hover:bg-[oklch(0.74_0.16_155)] hover:[box-shadow:0_0_40px_color-mix(in_srgb,oklch(0.70_0.15_155)_28%,transparent)]"
            >
              Build your profile
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <Link
              href="/andresherrera"
              className="inline-flex h-12 items-center gap-2 font-mono text-[12px] text-[#F4F2EE]/38 transition-colors hover:text-[#F4F2EE]/65"
            >
              See a live example
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Artist credit — bottom right */}
        <div
          className="absolute bottom-20 right-6 text-right"
          style={{ animation: "brand-reveal 0.9s cubic-bezier(0.25,0,0,1) 1.1s both" }}
        >
          <MonoLabel className="text-[#F4F2EE]/20">ANDRES:HERRERA · Buenos Aires</MonoLabel>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0C0C0B] to-transparent" />
    </section>
  )
}

// ─── Section 2: Identity statement ───────────────────────────────────────────

function IdentitySection() {
  const { ref, visible } = useScrollReveal(0.2)

  return (
    <section className="bg-[#0C0C0B] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div ref={ref} className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left — large serif statement */}
          <h2
            className={`font-serif text-[clamp(44px,5.5vw,80px)] font-light leading-[1.04] tracking-[0.005em] text-[#F4F2EE] transition-all duration-1000 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.25,0,0,1)" }}
          >
            Your career.
            <br />
            <em className="text-[#F4F2EE]/55 italic">One destination.</em>
          </h2>

          {/* Right — body */}
          <div
            className={`transition-all duration-1000 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.25,0,0,1)" }}
          >
            <p className="text-[16px] leading-[1.85] text-[#F4F2EE]/40">
              A promoter Googles you tonight.
              A festival booker asks for your press kit tomorrow.
              A label wants your bio next week.
            </p>
            <p className="mt-5 text-[16px] leading-[1.85] text-[#F4F2EE]/60">
              DJHQ is what they find — professional, complete, and always current.
            </p>
            <div className="mt-8 h-px w-12 bg-[oklch(0.70_0.15_155)]/40" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 3: Artists grid ──────────────────────────────────────────────────

function ArtistsSection() {
  return (
    <section className="bg-[#0C0C0B] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <RevealDiv className="mb-12">
          <MonoLabel className="text-[#F4F2EE]/30">Real artists · Live profiles</MonoLabel>
        </RevealDiv>

        {/* Editorial grid — asymmetric like a magazine spread */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large card */}
          <RevealDiv delay={0} className="md:col-span-2">
            <ArtistCard artist={ARTISTS[0]} large />
          </RevealDiv>

          {/* Stacked small cards */}
          <div className="flex flex-col gap-4">
            <RevealDiv delay={120}>
              <ArtistCard artist={ARTISTS[1]} />
            </RevealDiv>
            <RevealDiv delay={200}>
              <ArtistCard artist={ARTISTS[2]} />
            </RevealDiv>
          </div>
        </div>

        <RevealDiv delay={280} className="mt-8 text-center">
          <MonoLabel className="text-[#F4F2EE]/18">
            Every profile is live. Every link works.
          </MonoLabel>
        </RevealDiv>
      </div>
    </section>
  )
}

function ArtistCard({ artist, large = false }: { artist: (typeof ARTISTS)[0]; large?: boolean }) {
  return (
    <Link
      href={`/${artist.handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111410] transition-all duration-500 hover:border-white/[0.14] ${
        large ? "aspect-[16/9]" : "aspect-[4/3]"
      }`}
    >
      {/* Atmospheric gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${artist.gradient} transition-all duration-700 group-hover:opacity-80`} />

      {/* Glow */}
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
        style={{ background: `radial-gradient(ellipse at 30% 60%, color-mix(in srgb, oklch(0.70 0.15 155) 8%, transparent), transparent 65%)` }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 backdrop-blur-sm">
            <MonoLabel className="text-[#F4F2EE]/45">{artist.genre}</MonoLabel>
          </span>
          <ExternalLink className="h-4 w-4 text-[#F4F2EE]/20 transition-all duration-200 group-hover:text-[#F4F2EE]/55" />
        </div>

        <div>
          <p
            className={`font-serif font-light leading-none tracking-[0.01em] text-[#F4F2EE] ${
              large ? "text-[clamp(32px,4vw,56px)]" : "text-[clamp(24px,3vw,38px)]"
            }`}
          >
            {artist.name}
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#F4F2EE]/32">{artist.city}</p>
          <div className="mt-4 flex items-center gap-1.5">
            <MonoLabel className="text-[#F4F2EE]/20">djhq.co / {artist.handle}</MonoLabel>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Section 4: The Problem ───────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section className="bg-[#080807] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <RevealDiv className="mb-5">
          <MonoLabel className="text-[#F4F2EE]/28">The current reality</MonoLabel>
        </RevealDiv>

        <RevealDiv delay={80} className="mb-16 max-w-2xl">
          <h2 className="font-serif text-[clamp(36px,4.5vw,64px)] font-light leading-[1.06] tracking-[0.005em] text-[#F4F2EE]">
            What a booker finds
            <br />
            <em className="italic text-[#F4F2EE]/45">when they Google you today.</em>
          </h2>
        </RevealDiv>

        {/* Platform tiles */}
        <div className="mb-16 grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-9">
          {PLATFORMS.map((platform, i) => (
            <RevealDiv key={platform.name} delay={i * 40} className="md:col-span-1">
              <div className="group rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 transition-all duration-300 hover:border-white/[0.07]">
                <p className="text-[12px] font-medium text-[#F4F2EE]/28">{platform.name}</p>
                <p className="mt-1 font-mono text-[9px] text-[#F4F2EE]/16">{platform.note}</p>
              </div>
            </RevealDiv>
          ))}
        </div>

        {/* Pivot */}
        <RevealDiv delay={400} className="mb-14 flex items-center gap-6">
          <div className="h-px flex-1 bg-white/[0.05]" />
          <MonoLabel className="text-[#F4F2EE]/25">DJHQ replaces all of it</MonoLabel>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </RevealDiv>

        {/* Problem paragraph */}
        <RevealDiv delay={480} className="mx-auto max-w-2xl text-center">
          <p className="text-[16px] leading-[1.85] text-[#F4F2EE]/42">
            A festival booker asks for your press kit at 11pm.
            You send a Dropbox link that expired.
            A label finds your Linktree with five broken links.
            A journalist Googles you and finds your SoundCloud from 2019.
          </p>
          <p className="mt-5 font-serif text-[20px] italic text-[#F4F2EE]/55">
            DJHQ is the thing you should have had three years ago.
          </p>
        </RevealDiv>
      </div>
    </section>
  )
}

// ─── Section 5: Three outcome panels ─────────────────────────────────────────

function OutcomesSection() {
  const outcomes = [
    {
      anchor: "One URL. Everything.",
      body: "Your bio, shows, releases, press kit and booking contact — in a single professional destination that looks like you hired a web designer. You didn't.",
      detail: "No web designer required  ·  Setup in under an hour",
    },
    {
      anchor: "Stop sending Dropbox folders.",
      body: "Your EPK lives at a permanent URL. PDFs in English and Spanish, press photos, technical rider, asset folders. Send one link. They have everything. It never expires.",
      detail: "Always current  ·  English and Spanish PDFs",
    },
    {
      anchor: "Prove you're a working artist.",
      body: "Upcoming shows, past venues, release catalog, streaming links — all in one place. When a festival asks where you've played, you send one link instead of a photo album.",
      detail: "Show history  ·  Automatic sorting by date",
    },
  ]

  return (
    <section className="bg-[#0C0C0B] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <RevealDiv className="mb-5">
          <MonoLabel className="text-[#F4F2EE]/28">What changes</MonoLabel>
        </RevealDiv>
        <RevealDiv delay={60} className="mb-16">
          <h2 className="font-serif text-[clamp(36px,4.5vw,64px)] font-light leading-[1.06] tracking-[0.005em] text-[#F4F2EE]">
            Three things that happen
            <br />
            <em className="italic text-[#F4F2EE]/45">the moment you join.</em>
          </h2>
        </RevealDiv>

        <div className="grid gap-6 md:grid-cols-3">
          {outcomes.map((o, i) => (
            <RevealDiv key={o.anchor} delay={i * 100} className="h-full">
              <div className="group flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.035]">
                <div className="mb-5 flex h-5 w-5 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.70_0.15_155)]/60" />
                </div>
                <h3 className="mb-4 font-serif text-[22px] font-light leading-[1.2] text-[#F4F2EE]/90">
                  {o.anchor}
                </h3>
                <p className="flex-1 text-[14px] leading-[1.8] text-[#F4F2EE]/38">{o.body}</p>
                <div className="mt-6 border-t border-white/[0.05] pt-5">
                  <MonoLabel className="text-[#F4F2EE]/20">{o.detail}</MonoLabel>
                </div>
              </div>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 6: Product evidence ─────────────────────────────────────────────

function ProductSection() {
  return (
    <section className="bg-[#080807] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <RevealDiv className="mb-5">
          <MonoLabel className="text-[#F4F2EE]/28">The product</MonoLabel>
        </RevealDiv>
        <RevealDiv delay={60} className="mb-16 max-w-xl">
          <h2 className="font-serif text-[clamp(36px,4.5vw,64px)] font-light leading-[1.06] tracking-[0.005em] text-[#F4F2EE]">
            What the right people
            <br />
            <em className="italic text-[#F4F2EE]/45">see when they find you.</em>
          </h2>
        </RevealDiv>

        {/* Browser frame — minimal, elegant */}
        <RevealDiv delay={150}>
          <div className="overflow-hidden rounded-[20px] border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
            {/* URL bar */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#0E0E0D] px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
              </div>
              <div className="flex-1 rounded-md bg-white/[0.04] py-1 text-center font-mono text-[11px] text-[#F4F2EE]/28">
                andresherrera.djhq.co
              </div>
            </div>

            {/* Profile preview — editorial quality */}
            <div className="bg-[#0A0C0B]">
              {/* Hero */}
              <div className="relative overflow-hidden" style={{ height: "220px" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#0D1A14] via-[#0A1008] to-[#080807]" />
                <div className="pointer-events-none absolute left-[15%] top-[10%] h-[280px] w-[500px] rounded-full opacity-[0.08]"
                  style={{ background: "radial-gradient(ellipse at center, oklch(0.70 0.15 155), transparent 70%)" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C0B] via-[#0A0C0B]/30 to-transparent" />
                <div className="absolute bottom-6 left-8 right-8">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {["House", "Tech House", "Producer"].map((g) => (
                      <span key={g} className="rounded-full border border-[oklch(0.70_0.15_155)]/30 bg-black/40 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.10em] text-[#F4F2EE]/65 backdrop-blur-sm">
                        {g}
                      </span>
                    ))}
                  </div>
                  <p className="font-serif text-[clamp(28px,4vw,48px)] font-light leading-none text-[#F4F2EE]">
                    ANDRES:HERRERA
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-[#F4F2EE]/38">Buenos Aires, Argentina</p>
                </div>
              </div>

              {/* Content row */}
              <div className="grid divide-x divide-white/[0.04] border-t border-white/[0.05] md:grid-cols-3">
                {/* Shows */}
                <div className="p-6">
                  <MonoLabel className="mb-4 block text-[oklch(0.70_0.15_155)]/60">Upcoming Shows</MonoLabel>
                  <div className="space-y-3.5">
                    {[
                      { date: "Jun 28", venue: "ICE Festival", city: "Buenos Aires" },
                      { date: "Jul 23", venue: "Club Room", city: "Barcelona" },
                    ].map((s) => (
                      <div key={s.venue} className="flex items-center gap-3">
                        <div className="w-9 shrink-0 text-center">
                          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-[oklch(0.70_0.15_155)]/50">{s.date.split(" ")[0]}</p>
                          <p className="text-[18px] font-black leading-none text-[#F4F2EE]/80">{s.date.split(" ")[1]}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-[#F4F2EE]/75">{s.venue}</p>
                          <p className="font-mono text-[10px] text-[#F4F2EE]/32">{s.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Releases */}
                <div className="p-6">
                  <MonoLabel className="mb-4 block text-[oklch(0.70_0.15_155)]/60">Latest Releases</MonoLabel>
                  <div className="space-y-3">
                    {[
                      { title: "Thank You", label: "Groove People Records", year: "2025" },
                      { title: "Sky Sunset", label: "Misa Records", year: "2024" },
                      { title: "Arrival", label: "Groove People Records", year: "2024" },
                    ].map((r, i) => (
                      <div key={r.title} className="flex items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-md"
                          style={{ background: `linear-gradient(135deg, oklch(${0.32 + i * 0.04} 0.10 ${155 + i * 22}), oklch(0.08 0 0))` }} />
                        <div>
                          <p className="text-[11px] font-semibold text-[#F4F2EE]/75">{r.title}</p>
                          <p className="font-mono text-[9px] text-[#F4F2EE]/28">{r.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Press / Booking */}
                <div className="p-6">
                  <MonoLabel className="mb-4 block text-[oklch(0.70_0.15_155)]/60">Contact & Press</MonoLabel>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <MonoLabel className="text-[#F4F2EE]/25">Booking</MonoLabel>
                      <p className="mt-1 font-mono text-[10px] text-[oklch(0.70_0.15_155)]/70">booking@andresherrera.music</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <MonoLabel className="text-[#F4F2EE]/25">Press Kit</MonoLabel>
                      <p className="mt-1 font-mono text-[10px] text-[#F4F2EE]/35">andresherrera.djhq.co/presskit</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealDiv>

        <RevealDiv delay={250} className="mt-6 text-center">
          <Link href="/andresherrera" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] text-[#F4F2EE]/28 transition-colors hover:text-[#F4F2EE]/55">
            Open live profile
            <ExternalLink className="h-3 w-3" />
          </Link>
        </RevealDiv>
      </div>
    </section>
  )
}

// ─── Section 7: Press Kit ─────────────────────────────────────────────────────

function PressKitSection() {
  const downloads = [
    { lang: "ENG", flag: "🇬🇧", size: "4.2 MB" },
    { lang: "ESP", flag: "🇪🇸", size: "3.8 MB" },
  ]

  return (
    <section className="bg-[#0C0C0B] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1fr]">
          {/* Left — copy */}
          <div>
            <RevealDiv className="mb-5">
              <MonoLabel className="text-[#F4F2EE]/28">Press kit</MonoLabel>
            </RevealDiv>
            <RevealDiv delay={60}>
              <h2 className="mb-6 font-serif text-[clamp(36px,4vw,58px)] font-light leading-[1.06] tracking-[0.005em] text-[#F4F2EE]">
                Stop sending
                <br />
                <em className="italic text-[#F4F2EE]/45">Dropbox folders.</em>
              </h2>
            </RevealDiv>
            <RevealDiv delay={140}>
              <p className="mb-6 text-[15px] leading-[1.85] text-[#F4F2EE]/40">
                Your press kit lives at a permanent URL. Bio, press photos, PDFs
                in English and Spanish, technical rider and asset folders —
                connected, professional, always current.
              </p>
              <p className="text-[15px] leading-[1.85] text-[#F4F2EE]/60">
                Send one link. They have everything. The URL never expires.
              </p>
            </RevealDiv>
            <RevealDiv delay={220} className="mt-8">
              <div className="space-y-2.5">
                {[
                  "Available in English and Spanish",
                  "Updates automatically when your profile updates",
                  "Your URL. Not a generic link.",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="h-1 w-1 rounded-full bg-[oklch(0.70_0.15_155)]/50" />
                    <span className="text-[13px] text-[#F4F2EE]/45">{item}</span>
                  </div>
                ))}
              </div>
            </RevealDiv>
          </div>

          {/* Right — press kit preview */}
          <RevealDiv delay={180}>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0E0E0D]">
              {/* EPK header */}
              <div className="border-b border-white/[0.05] p-6">
                <MonoLabel className="text-[oklch(0.70_0.15_155)]/60">Electronic Press Kit</MonoLabel>
                <p className="mt-2 font-serif text-[22px] font-light text-[#F4F2EE]">ANDRES:HERRERA</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#F4F2EE]/30">House · Tech House · Buenos Aires</p>
              </div>

              {/* Download cards */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {downloads.map((d) => (
                  <div key={d.lang}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: "radial-gradient(ellipse at top left, color-mix(in srgb, oklch(0.70 0.15 155) 6%, transparent), transparent 70%)" }} />
                    <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-[16px]">
                      {d.flag}
                    </div>
                    <p className="text-[13px] font-semibold text-[#F4F2EE]/80">Press Kit {d.lang}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#F4F2EE]/30">PDF · {d.size}</p>
                    <div className="mt-4 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[oklch(0.70_0.15_155)]/55 transition-colors group-hover:text-[oklch(0.70_0.15_155)]/85">
                      Download
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Folders */}
              <div className="border-t border-white/[0.05] p-4">
                <MonoLabel className="mb-3 block text-[#F4F2EE]/22">Asset Folders</MonoLabel>
                <div className="space-y-1.5">
                  {["Full Drive Package", "Press Photos", "Technical Rider", "Logos & Artwork"].map((f) => (
                    <div key={f} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5">
                      <span className="text-[12px] text-[#F4F2EE]/55">{f}</span>
                      <span className="font-mono text-[9px] text-[oklch(0.70_0.15_155)]/50">Open ↗</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo preview */}
              <div className="border-t border-white/[0.05] p-4">
                <MonoLabel className="mb-3 block text-[#F4F2EE]/22">Press Photos Preview</MonoLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square rounded-md"
                      style={{ background: `linear-gradient(135deg, oklch(${0.14 + i * 0.02} 0.03 ${155 + i * 28}), oklch(0.07 0 0))` }} />
                  ))}
                </div>
              </div>
            </div>
          </RevealDiv>
        </div>
      </div>
    </section>
  )
}

// ─── Section 8: Invitation ────────────────────────────────────────────────────

function InvitationSection() {
  return (
    <section className="relative overflow-hidden bg-[#080807] py-40">
      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.042]"
          style={{
            background: "radial-gradient(ellipse at center, oklch(0.70 0.15 155), transparent 65%)",
            animation: "brand-glow-pulse 20s ease-in-out infinite",
          }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <RevealDiv>
          <h2 className="font-serif text-[clamp(48px,7vw,100px)] font-light leading-[1.0] tracking-[0.005em] text-[#F4F2EE]">
            Your career
            <br />
            <em className="italic text-[#F4F2EE]/48">is already happening.</em>
          </h2>
        </RevealDiv>
        <RevealDiv delay={120} className="mx-auto mt-8 max-w-md">
          <p className="text-[16px] leading-[1.8] text-[#F4F2EE]/38">
            Make sure it looks the part.
          </p>
        </RevealDiv>
      </div>
    </section>
  )
}

// ─── Section 9: Who it's for ──────────────────────────────────────────────────

function ForSection() {
  const forItems = [
    "You play clubs, festivals or events regularly",
    "You receive booking inquiries and share your information by email",
    "You appear on lineups that promoters and agencies look up",
    "You want to look professional when someone Googles your name",
  ]

  const notForItems = [
    "Artists just starting out with no shows yet",
    "Booking management or CRM software",
    "Music distribution",
    "Social media management",
  ]

  return (
    <section className="bg-[#0C0C0B] py-32">
      <div className="mx-auto max-w-7xl px-6">
        <RevealDiv className="mb-16">
          <h2 className="font-serif text-[clamp(32px,4vw,52px)] font-light leading-[1.1] tracking-[0.005em] text-[#F4F2EE]">
            Built for electronic music artists
            <br />
            <em className="italic text-[#F4F2EE]/45">who take their career seriously.</em>
          </h2>
        </RevealDiv>

        <div className="grid gap-16 md:grid-cols-2">
          <RevealDiv delay={100}>
            <MonoLabel className="mb-6 block text-[#F4F2EE]/28">DJHQ is for you if</MonoLabel>
            <ul className="space-y-4">
              {forItems.map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[oklch(0.70_0.15_155)]/55" />
                  <span className="text-[15px] leading-[1.7] text-[#F4F2EE]/58">{item}</span>
                </li>
              ))}
            </ul>
          </RevealDiv>

          <RevealDiv delay={200}>
            <MonoLabel className="mb-6 block text-[#F4F2EE]/18">DJHQ is probably not for you if</MonoLabel>
            <ul className="space-y-4">
              {notForItems.map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/[0.12]" />
                  <span className="text-[15px] leading-[1.7] text-[#F4F2EE]/28">{item}</span>
                </li>
              ))}
            </ul>
          </RevealDiv>
        </div>
      </div>
    </section>
  )
}

// ─── Section 10: Close ────────────────────────────────────────────────────────

function CloseSection() {
  return (
    <section className="relative overflow-hidden bg-[#080807] py-40">
      {/* Peak glow — the brightest moment on the page */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.70 0.15 155), transparent 60%)" }} />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <RevealDiv>
          <h2 className="mb-8 font-serif text-[clamp(44px,6vw,82px)] font-light leading-[1.04] tracking-[0.005em] text-[#F4F2EE]">
            Build your
            <br />
            professional presence.
          </h2>
        </RevealDiv>

        <RevealDiv delay={100} className="mb-10">
          <p className="text-[16px] leading-[1.8] text-[#F4F2EE]/38">
            Join the artists who look as serious as they actually are.
          </p>
        </RevealDiv>

        <RevealDiv delay={180} className="flex flex-col items-center gap-5">
          <a
            href="mailto:access@djhq.co"
            className="group inline-flex h-14 items-center gap-3 rounded-full bg-[oklch(0.70_0.15_155)] px-10 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#0A0C0B] transition-all duration-300 hover:bg-[oklch(0.74_0.16_155)] hover:[box-shadow:0_0_60px_color-mix(in_srgb,oklch(0.70_0.15_155)_32%,transparent)]"
          >
            Start building — it&apos;s free
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>

          <Link href="/andresherrera" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[12px] text-[#F4F2EE]/30 transition-colors hover:text-[#F4F2EE]/60">
            See andresherrera.djhq.co →
          </Link>

          <p className="font-mono text-[10px] text-[#F4F2EE]/18">
            No credit card  ·  Under one hour  ·  Free to start
          </p>
        </RevealDiv>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#080807] py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-[#F4F2EE]/30">
          DJHQ
        </span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="font-mono text-[10px] text-[#F4F2EE]/18 transition-colors hover:text-[#F4F2EE]/45">
            Login
          </Link>
          <p className="font-mono text-[10px] text-[#F4F2EE]/12">
            © {new Date().getFullYear()} DJHQ
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080807] text-[#F4F2EE]">
      <Nav />
      <CoverSection />
      <IdentitySection />
      <ArtistsSection />
      <ProblemSection />
      <OutcomesSection />
      <ProductSection />
      <PressKitSection />
      <InvitationSection />
      <ForSection />
      <CloseSection />
      <Footer />
    </main>
  )
}
