"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ExternalLink } from "lucide-react"
import { brand } from "@/lib/brand"

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const h = () => setSolid(window.scrollY > 80)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all duration-200"
      style={{
        background: solid ? "rgba(8,8,8,0.88)" : "transparent",
        backdropFilter: solid ? "blur(20px) saturate(180%)" : "none",
        WebkitBackdropFilter: solid ? "blur(20px) saturate(180%)" : "none",
        borderBottom: solid ? "1px solid rgba(255,255,255,0.07)" : "none",
      }}
    >
      <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between px-5">

        {/* Left — wordmark */}
        <Link
          href="/"
          className="text-[14px] font-bold tracking-[0.01em] text-white transition-opacity duration-150 hover:opacity-80"
        >
          {brand.name}
        </Link>

        {/* Center — primary nav links (desktop only) */}
        <div className="hidden items-center gap-7 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "Pricing",  href: "#pricing" },
            { label: "Examples", href: "/andresherrera" },
          ].map(({ label, href }) =>
            href.startsWith("/") ? (
              <Link
                key={label}
                href={href}
                className="text-[13px] text-white/45 transition-colors duration-150 hover:text-white/80"
              >
                {label}
              </Link>
            ) : (
              <a
                key={label}
                href={href}
                className="text-[13px] text-white/45 transition-colors duration-150 hover:text-white/80"
              >
                {label}
              </a>
            )
          )}
        </div>

        {/* Right — auth actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden text-[13px] font-medium text-white/45 transition-colors duration-150 hover:text-white/75 sm:block"
          >
            Log in
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black transition-all duration-150 hover:bg-white/90"
          >
            Get Started
          </Link>
        </div>

      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
// Full-bleed atmospheric layout.
// dj-hero.jpg becomes the environment; copy floats over cinematic dark treatment.
// Product evidence appears below the fold in PressKitSection and NarrativeSection.

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: "100dvh" }}>

      {/* ── Full-bleed DJ photo — the atmosphere ─────────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dj-hero.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 30%", filter: "saturate(0.75) contrast(1.08) brightness(0.50)" }}
      />

      {/* ── Cinematic dark treatment — layered for editorial depth ─────────── */}
      {/* Bottom lift — ensures copy sits on readable darkness */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(180deg, rgba(8,8,8,0.08) 0%, rgba(8,8,8,0.02) 25%, rgba(8,8,8,0.48) 62%, rgba(8,8,8,0.97) 100%)"
      }} />
      {/* Left vignette — editorial anchor for the copy block */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(96deg, rgba(8,8,8,0.88) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.12) 65%, transparent 80%)"
      }} />
      {/* Radial edge darkening — keeps the frame contained */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 38%, rgba(8,8,8,0.42) 100%)"
      }} />

      {/* ── Copy — editorial positioning in lower-left ─────────────────────── */}
      <div className="relative z-10 flex min-h-[100dvh] items-end px-5 pb-14 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="w-full max-w-[560px]">

          {/* Category badge */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1"
            style={{
              borderColor: "rgba(0,230,167,0.25)",
              background: "rgba(0,230,167,0.06)",
              animation: "hp-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00E6A7" }} />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
              The professional standard for DJs and electronic music artists
            </span>
          </div>

          {/* Headline */}
          <h1
            className="mb-5 text-[clamp(38px,5vw,66px)] font-bold leading-[1.04] tracking-[-0.03em] text-white"
            style={{ animation: "hp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both" }}
          >
            The link every booker
            <br />
            expects to receive.
          </h1>

          {/* Supporting copy */}
          <p
            className="mb-9 max-w-[420px] text-[16px] leading-[1.65]"
            style={{
              color: "rgba(255,255,255,0.55)",
              animation: "hp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) 0.2s both",
            }}
          >
            Profile. Press Kit. Shows. Releases. Booking contact.
            One permanent URL that tells bookers, labels and festivals everything they need to know — before they have to ask.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ animation: "hp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) 0.28s both" }}
          >
            {/* Primary */}
            <Link
              href="/sign-in"
              className="flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-[#0A1410] transition-all duration-150"
              style={{ background: "#00E6A7" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00D49A"
                e.currentTarget.style.boxShadow = "0 0 32px rgba(0,230,167,0.35)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#00E6A7"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {/* Secondary */}
            <Link
              href="/andresherrera/presskit"
              className="flex h-11 items-center gap-1.5 rounded-full border px-5 text-[14px] font-medium transition-all duration-150"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.60)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.26)"
                e.currentTarget.style.color = "rgba(255,255,255,0.90)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
                e.currentTarget.style.color = "rgba(255,255,255,0.60)"
              }}
            >
              See a live press kit
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      </div>

    </section>
  )
}

// ─── Problem section ─────────────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section style={{ background: "#090C11", padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-3xl px-6 text-center">

        <Reveal>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            The booking process has a problem
          </p>
        </Reveal>

        <Reveal delay={60}>
          <h2 className="mb-8 text-[clamp(28px,4.5vw,52px)] font-bold leading-[1.08] tracking-[-0.03em] text-[#F5F5F3]">
            A promoter asks for your press kit.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="mb-10 text-[18px] leading-[1.75]" style={{ color: "#71717A", maxWidth: "580px", margin: "0 auto 40px" }}>
            You send a Dropbox link. The permissions are wrong. The folder is outdated.
            The photos are from two years ago. You follow up. They don&apos;t reply.
            The slot goes to someone else.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "40px" }}>
            <p className="text-[clamp(22px,3.5vw,36px)] font-bold tracking-[-0.02em] text-[#F5F5F3] mb-4">
              DJHQ is the professional standard.
            </p>
            <p className="text-[16px] leading-[1.7]" style={{ color: "#52525B" }}>
              A single URL that contains everything a promoter, label or festival needs — before they have to ask.
            </p>
          </div>
        </Reveal>

      </div>
    </section>
  )
}

// ─── Social proof ─────────────────────────────────────────────────────────────

const venues = [
  "Berghain", "DC10", "Fabric", "Hï Ibiza", "Tresor",
  "Watergate", "Club Space", "Amnesia", "Pacha", "Rex Club",
  "Sub Club", "Printworks", "Bassiani", "Corsica Studios",
  "Shelter Amsterdam", "Egg London",
]

function SocialProofSection() {
  return (
    <section style={{ background: "#0B0F14", padding: "80px 0" }}>
      <div className="mx-auto max-w-5xl px-6">

        <Reveal>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            Where working artists belong
          </p>
        </Reveal>
        <Reveal delay={50}>
          <h2 className="mb-3 text-[clamp(26px,3.8vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Artists using DJHQ have played:
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mb-12 text-[15px]" style={{ color: "#52525B" }}>
            Their artists book shows with credibility. So can you.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="flex flex-wrap gap-2">
            {venues.map((v) => (
              <span
                key={v}
                className="rounded-full px-4 py-1.5 text-[13px] font-medium"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {v}
              </span>
            ))}
            <span
              className="rounded-full px-4 py-1.5 text-[13px] font-medium"
              style={{
                border: "1px solid rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.22)",
              }}
            >
              and many more
            </span>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-12 flex flex-wrap items-center gap-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "40px" }}>
            {[
              { value: "40+",   label: "Countries" },
              { value: "800+",  label: "Promoters reached" },
              { value: "1,200+",label: "Press kits shared" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[28px] font-bold tabular-nums text-white/90">{s.value}</p>
                <p className="mt-0.5 text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: "#52525B" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

      </div>
    </section>
  )
}

// ─── Narrative features ───────────────────────────────────────────────────────

const features = [
  {
    name: "Artist Profile",
    desc: "Your bio, genres, location and social links. Your identity, positioned for the industry.",
  },
  {
    name: "Press Kit",
    desc: "Downloadable PDFs in English and Spanish. Photos, tech rider, asset folders. A permanent link that never expires or breaks.",
    highlight: true,
  },
  {
    name: "Shows & History",
    desc: "Tour history and upcoming dates. Concrete evidence of activity for any booker doing due diligence.",
  },
  {
    name: "Releases",
    desc: "Your full discography with label credits, artwork and streaming links. The context labels and press need.",
  },
  {
    name: "Booking Contact",
    desc: "A direct inquiry form. Serious requests reach you immediately — no intermediaries.",
  },
]

function NarrativeSection() {
  return (
    <section id="features" style={{ background: "#090C11", padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-5xl px-6">

        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-start">

          {/* Left — copy */}
          <div>
            <Reveal>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
                What bookers actually look for
              </p>
            </Reveal>
            <Reveal delay={50}>
              <h2 className="mb-5 text-[clamp(26px,3.8vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
                Everything a promoter needs.
                <br />
                <span style={{ color: "#71717A" }}>One URL.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mb-10 text-[15px] leading-[1.75]" style={{ color: "#71717A" }}>
                Promoters, labels and festivals evaluate artists in seconds. Your DJHQ
                answers every question before they have to ask it.
              </p>
            </Reveal>

            <div className="space-y-5">
              {features.map((f, i) => (
                <Reveal key={f.name} delay={140 + i * 50}>
                  <div
                    className="flex items-start gap-4 rounded-xl p-4"
                    style={{
                      background: f.highlight ? "rgba(0,230,167,0.04)" : "rgba(255,255,255,0.015)",
                      border: f.highlight ? "1px solid rgba(0,230,167,0.14)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: f.highlight ? "#00E6A7" : "rgba(255,255,255,0.20)" }} />
                    <div>
                      <p
                        className="text-[14px] font-semibold mb-0.5"
                        style={{ color: f.highlight ? "#00E6A7" : "rgba(245,245,243,0.88)" }}
                      >
                        {f.name}
                      </p>
                      <p className="text-[13px] leading-[1.6]" style={{ color: "#71717A" }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right — URL anatomy */}
          <Reveal delay={80}>
            <div
              className="sticky top-24 overflow-hidden rounded-2xl"
              style={{
                background: "#0D1117",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 48px rgba(0,0,0,0.50)",
              }}
            >
              {/* Mini browser chrome */}
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ background: "#0A0D12", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex gap-1.5">
                  {["#FF5F56","#FFBD2E","#27C93F"].map((c, i) => (
                    <div key={i} className="h-[9px] w-[9px] rounded-full" style={{ background: c, opacity: 0.55 }} />
                  ))}
                </div>
                <div
                  className="flex flex-1 items-center justify-center rounded px-3 py-[3px]"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                    djhq.app/your-name
                  </span>
                </div>
                <div className="w-12" />
              </div>

              {/* URL anatomy */}
              <div className="px-6 py-6">
                <div className="font-mono text-[13px]" style={{ color: "rgba(255,255,255,0.20)" }}>
                  <p className="mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                    djhq.app/<span style={{ color: "#00E6A7" }}>your-name</span>
                  </p>
                  <div className="space-y-3" style={{ paddingLeft: "12px", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                    {[
                      { path: "/ ",        label: "Profile & Bio",     muted: false },
                      { path: "/presskit", label: "Press Kit (EN + ES)", muted: false, accent: true },
                      { path: "/shows",    label: "Shows & History",   muted: false },
                      { path: "/releases", label: "Releases",          muted: false },
                      { path: "/booking",  label: "Booking Contact",   muted: false },
                    ].map((item) => (
                      <div key={item.path} className="flex items-baseline gap-3">
                        <span style={{ color: "rgba(255,255,255,0.18)" }}>{item.path}</span>
                        <span
                          className="text-[12px]"
                          style={{ color: item.accent ? "rgba(0,230,167,0.80)" : "rgba(255,255,255,0.50)" }}
                        >
                          — {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" }}>
                  {[
                    "Permanent. Not a link tree. Not a Dropbox folder.",
                    "Industry-ready in English and Spanish",
                    "Your own domain, not a generic platform URL",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#00E6A7" }} />
                      <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  )
}

// ─── Press kit focus ──────────────────────────────────────────────────────────

function PressKitSection() {
  return (
    <section id="press-kit" style={{ background: "#0B0F14", padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">

          {/* Copy */}
          <div>
            <Reveal>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.20em]" style={{ color: "#00E6A7" }}>
                The press kit that gets read
              </p>
            </Reveal>
            <Reveal delay={50}>
              <h2 className="mb-5 text-[clamp(26px,3.5vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
                One link.
                <br />
                Everything they need.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mb-8 text-[15px] leading-[1.8]" style={{ color: "#71717A" }}>
                Your press kit lives at a permanent URL. Send it to any promoter, label or festival.
                Bio, photos, PDFs in English and Spanish, technical rider, asset folders.
                It never expires. It never has broken links. It never embarrasses you.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <ul className="space-y-3">
                {[
                  "PDFs in English and Spanish — standard for international bookings",
                  "Permanent URL — send it once, use it for every booking, forever",
                  "Photos, logos and technical rider organised in one place",
                  "Custom domain on Pro — yourname.com/presskit",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#00E6A7" }} />
                    <span className="text-[14px]" style={{ color: "#A1A1AA" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Press kit UI */}
          <Reveal delay={120}>
            <div
              className="overflow-hidden rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0D1117" }}
            >
              <div className="border-b px-6 py-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(0,230,167,0.60)" }}>
                  Electronic Press Kit
                </p>
                <p className="mt-1.5 text-[18px] font-black tracking-[-0.01em] text-[#F5F5F3]">NOA VEGA</p>
                <p className="font-mono text-[11px]" style={{ color: "#52525B" }}>House · Melodic Techno · Berlin</p>
              </div>

              {/* Downloads */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { lang: "Press Kit ENG", size: "4.2 MB", flag: "🇬🇧" },
                  { lang: "Press Kit ESP", size: "3.8 MB", flag: "🇪🇸" },
                ].map((d) => (
                  <div
                    key={d.lang}
                    className="rounded-xl p-4"
                    style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <span className="text-[18px]">{d.flag}</span>
                    <p className="mt-3 text-[12px] font-semibold text-[#F5F5F3]">{d.lang}</p>
                    <p className="font-mono text-[10px]" style={{ color: "#52525B" }}>PDF · {d.size}</p>
                    <p className="mt-3 font-mono text-[10px] font-medium" style={{ color: "#00E6A7" }}>Download ↗</p>
                  </div>
                ))}
              </div>

              {/* Folders */}
              <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {["Full Drive Package", "Press Photos", "Technical Rider", "Logos & Artwork"].map((f) => (
                  <div
                    key={f}
                    className="mb-2 flex items-center justify-between rounded-lg px-3.5 py-2.5"
                    style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
                  >
                    <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{f}</span>
                    <span className="font-mono text-[10px]" style={{ color: "#00E6A7" }}>Open ↗</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Everything you need to be taken seriously by the industry.",
    cta: "Get started free",
    ctaHref: "/sign-in",
    featured: false,
    features: [
      "Artist profile at djhq.app/handle",
      "Electronic press kit (EN + ES)",
      "Shows & touring history",
      "Release catalog",
      "Booking inquiry form",
      "DJHQ attribution on profile",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    annual: "$99/year",
    description: "For artists who want to own their professional identity completely.",
    cta: "Start 14-day trial",
    ctaHref: "/sign-in",
    featured: true,
    features: [
      "Everything in Free",
      "Custom domain (yourname.com)",
      "Remove DJHQ branding — fully yours",
      "Profile view analytics",
      "Booking inbox — all inquiries in one place",
      "Custom favicon",
    ],
  },
]

function PricingSection() {
  return (
    <section id="pricing" style={{ background: "#090C11", padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-4xl px-6">

        <Reveal>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            Pricing
          </p>
        </Reveal>
        <Reveal delay={50}>
          <h2 className="mb-3 text-[clamp(26px,3.8vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Two plans. No surprises.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mb-12 text-[15px]" style={{ color: "#71717A" }}>
            Start free. Upgrade when you&apos;re ready.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <Reveal key={plan.name} delay={plan.featured ? 180 : 140}>
              <div
                className="relative flex flex-col rounded-2xl p-6"
                style={{
                  background: plan.featured ? "rgba(0,230,167,0.04)" : "rgba(255,255,255,0.018)",
                  border: plan.featured ? "1px solid rgba(0,230,167,0.20)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {plan.featured && (
                  <span
                    className="mb-4 inline-flex w-fit rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ background: "rgba(0,230,167,0.12)", color: "#00E6A7" }}
                  >
                    Most popular
                  </span>
                )}
                <p className="text-[14px] font-semibold text-white/80 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[36px] font-black text-white leading-none">{plan.price}</span>
                  <span className="text-[14px] font-medium" style={{ color: "#71717A" }}>{plan.period}</span>
                </div>
                {plan.annual && (
                  <p className="mb-4 font-mono text-[10px]" style={{ color: "#52525B" }}>or {plan.annual} — save 31%</p>
                )}
                {!plan.annual && <div className="mb-4" />}
                <p className="mb-6 text-[13px] leading-[1.6]" style={{ color: "#71717A" }}>{plan.description}</p>

                <ul className="mb-8 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: plan.featured ? "#00E6A7" : "rgba(255,255,255,0.35)" }} />
                      <span className="text-[13px]" style={{ color: plan.featured ? "rgba(255,255,255,0.75)" : "#71717A" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className="flex h-10 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-150"
                  style={{
                    background: plan.featured ? "#00E6A7" : "rgba(255,255,255,0.06)",
                    color: plan.featured ? "#0A1410" : "rgba(255,255,255,0.65)",
                    border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={280}>
          <p className="mt-6 text-center font-mono text-[11px]" style={{ color: "#3F3F46" }}>
            No credit card required for Free plan. Cancel Pro anytime.
          </p>
        </Reveal>

      </div>
    </section>
  )
}

// ─── Featured artist ──────────────────────────────────────────────────────────

function FeaturedArtistSection() {
  return (
    <section style={{ background: "#0B0F14", padding: "80px 0" }}>
      <div className="mx-auto max-w-5xl px-6">

        <Reveal>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            Featured artist
          </p>
        </Reveal>

        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.018)" }}
        >
          {/* Hero band */}
          <div className="relative overflow-hidden" style={{ height: 80 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/dj-hero.jpg"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
              style={{ filter: "saturate(0.70) brightness(0.40)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(6,6,6,0.95) 100%)" }} />
          </div>

          <div className="grid gap-8 px-8 pb-8 pt-6 lg:grid-cols-[1fr_1fr]">

            {/* Identity */}
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.28em]" style={{ color: "#52525B" }}>
                Using DJHQ since 2024
              </p>
              <h3 className="mb-2 text-[26px] font-black tracking-[-0.02em] text-white">
                ANDRES:HERRERA
              </h3>
              <p className="mb-6 text-[13px]" style={{ color: "#71717A" }}>
                House · Tech House · Santiago, Chile
              </p>
              <p className="mb-6 text-[14px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.60)" }}>
                International DJ and producer with residencies and performances at
                leading electronic music venues worldwide. His DJHQ profile is his
                single professional contact point for every booking inquiry, press request
                and label introduction.
              </p>
              <Link
                href="/andresherrera/presskit"
                className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-150 hover:text-white"
                style={{ color: "rgba(0,230,167,0.75)" }}
              >
                View press kit
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Track record */}
            <div>
              <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.28em]" style={{ color: "#52525B" }}>
                Recent performances
              </p>
              <div className="space-y-2">
                {[
                  { event: "MISA",              venue: "Club Room",         city: "Santiago" },
                  { event: "Music Week Miami",   venue: "Story Nightclub",   city: "Miami" },
                  { event: "Pacha",              venue: "Pacha Barcelona",   city: "Barcelona" },
                  { event: "Club Room",          venue: "Club Room",         city: "Santiago" },
                  { event: "Fabrik",             venue: "Fabrik",            city: "Madrid" },
                ].map((s) => (
                  <div
                    key={`${s.event}-${s.city}`}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-white/85">{s.event}</p>
                      <p className="font-mono text-[10px]" style={{ color: "#52525B" }}>{s.venue}</p>
                    </div>
                    <p className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>{s.city}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section
      style={{ background: "#090C11", padding: "100px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="mx-auto max-w-2xl px-6 text-center">

        <Reveal>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            Your next booking starts here
          </p>
        </Reveal>

        <Reveal delay={60}>
          <h2 className="mb-6 text-[clamp(32px,5vw,58px)] font-bold leading-[1.06] tracking-[-0.03em] text-[#F5F5F3]">
            The link that gets you booked.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="mb-10 text-[16px] leading-[1.75]" style={{ color: "#71717A", maxWidth: "480px", margin: "0 auto 40px" }}>
            DJs using DJHQ send one link to every booker, label and journalist.
            It contains everything they need to say yes.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/sign-in"
              className="flex h-12 items-center gap-2.5 rounded-full px-8 text-[15px] font-semibold text-[#0A1410] transition-all duration-150 hover:bg-[#00D49A]"
              style={{ background: "#00E6A7" }}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/andresherrera/presskit"
              className="text-[14px] transition-colors hover:text-[#F5F5F3]"
              style={{ color: "#52525B" }}
            >
              See a live press kit →
            </Link>
            <p className="font-mono text-[11px]" style={{ color: "#3F3F46" }}>
              No credit card required · Up and running in under an hour
            </p>
          </div>
        </Reveal>

      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "#090C11", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "32px 0" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-bold tracking-[0.02em]" style={{ color: "rgba(245,245,243,0.28)" }}>{brand.name}</span>
          <a href="#features" className="font-mono text-[11px] transition-colors hover:text-white/60" style={{ color: "#3F3F46" }}>Features</a>
          <a href="#pricing" className="font-mono text-[11px] transition-colors hover:text-white/60" style={{ color: "#3F3F46" }}>Pricing</a>
          <Link href="/andresherrera/presskit" className="font-mono text-[11px] transition-colors hover:text-white/60" style={{ color: "#3F3F46" }}>Example</Link>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="font-mono text-[11px] transition-colors hover:text-white/60" style={{ color: "#3F3F46" }}>
            Log in
          </Link>
          <span className="font-mono text-[11px]" style={{ color: "#3F3F46" }}>
            © {new Date().getFullYear()} {brand.name}
          </span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main style={{ background: "#0B0F14" }}>
      <Nav />
      <Hero />
      <ProblemSection />
      <SocialProofSection />
      <NarrativeSection />
      <PressKitSection />
      <PricingSection />
      <FeaturedArtistSection />
      <ClosingCTA />
      <Footer />
    </main>
  )
}
