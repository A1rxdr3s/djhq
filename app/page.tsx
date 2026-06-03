"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ExternalLink } from "lucide-react"

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
    const h = () => setSolid(window.scrollY > 60)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: solid ? "rgba(11,15,20,0.92)" : "transparent",
        backdropFilter: solid ? "blur(16px)" : "none",
        borderBottom: solid ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <span className="text-[13px] font-bold tracking-[0.04em] text-[#F5F5F3]">DJHQ</span>
        <div className="flex items-center gap-6">
          <Link href="/andresherrera" className="hidden text-[13px] text-[#71717A] transition-colors hover:text-[#F5F5F3] sm:block">
            Demo
          </Link>
          <Link href="/sign-in" className="hidden text-[13px] text-[#71717A] transition-colors hover:text-[#F5F5F3] sm:block">
            Sign in
          </Link>
          <a
            href="mailto:access@djhq.co"
            className="rounded-md bg-[#6D5DFC] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#7E70FD] hover:shadow-[0_0_20px_rgba(109,93,252,0.35)]"
          >
            Get started
          </a>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-14"
      style={{ background: "#0B0F14", minHeight: "100vh" }}
    >
      {/* Indigo radial glow — behind right column */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px]"
        style={{
          background: "radial-gradient(ellipse at 70% 30%, rgba(109,93,252,0.09) 0%, transparent 65%)",
          animation: "hp-indigo-pulse 12s ease-in-out infinite",
        }}
      />

      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16">

        {/* Left */}
        <div>
          {/* Label */}
          <div
            className="mb-6 inline-flex items-center gap-2"
            style={{ animation: "hp-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6D5DFC]" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#6D5DFC]">
              For electronic music artists
            </span>
          </div>

          {/* Headline */}
          <h1
            className="mb-5 text-[clamp(38px,5vw,68px)] font-bold leading-[1.06] tracking-[-0.03em] text-[#F5F5F3]"
            style={{ animation: "hp-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both" }}
          >
            Your music is{" "}
            <span style={{ color: "#F5F5F3" }}>professional.</span>
            <br />
            <span style={{ color: "#71717A" }}>Your online presence</span>
            <br />
            <span style={{ color: "#71717A" }}>probably isn&apos;t.</span>
          </h1>

          {/* Sub */}
          <p
            className="mb-8 max-w-[440px] text-[16px] leading-[1.7] text-[#71717A]"
            style={{ animation: "hp-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.26s both" }}
          >
            DJHQ gives you one professional destination — press kit, profile, shows,
            releases and booking contact. Everything a promoter needs. One URL.
          </p>

          {/* CTAs */}
          <div
            className="mb-8 flex flex-wrap items-center gap-4"
            style={{ animation: "hp-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.34s both" }}
          >
            <a
              href="mailto:access@djhq.co"
              className="flex h-11 items-center gap-2 rounded-md bg-[#6D5DFC] px-6 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-[#7E70FD] hover:shadow-[0_0_28px_rgba(109,93,252,0.40)]"
            >
              Get started — it&apos;s free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/andresherrera"
              className="flex items-center gap-1.5 text-[14px] text-[#71717A] transition-colors hover:text-[#F5F5F3]"
            >
              See a live example
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Trust */}
          <div
            className="flex flex-wrap items-center gap-5"
            style={{ animation: "hp-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.42s both" }}
          >
            {["Free to start", "Setup in under an hour", "One professional URL"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#6D5DFC]" />
                <span className="text-[12px] text-[#52525B]">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product screenshot */}
        <div style={{ animation: "hp-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.28s both" }}>
          <div
            className="overflow-hidden"
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 0 1px rgba(109,93,252,0.08), 0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Browser bar */}
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ background: "#0D1018", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
              <div
                className="flex-1 rounded-md px-3 py-1 text-center font-mono text-[11px]"
                style={{ background: "rgba(255,255,255,0.04)", color: "#52525B" }}
              >
                noavel.djhq.co
              </div>
            </div>

            {/* Profile */}
            <ProfileMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function ProfileMockup() {
  return (
    <div style={{ background: "#080B0F" }}>
      {/* Hero — simulated dark stage photo */}
      <div className="relative overflow-hidden" style={{ height: 260 }}>
        {/* Background — deep stage dark */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(155deg, #0C1220 0%, #060810 42%, #0B0A14 80%, #08090F 100%)" }}
        />
        {/* Stage light from upper-right */}
        <div
          className="pointer-events-none absolute"
          style={{
            right: "0%", top: "-15%",
            width: "60%", height: "70%",
            background: "radial-gradient(ellipse at 70% 15%, rgba(90,70,160,0.22) 0%, transparent 58%)",
          }}
        />
        {/* Warm accent low-left */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: "-10%", bottom: "5%",
            width: "50%", height: "60%",
            background: "radial-gradient(ellipse at 25% 85%, rgba(50,35,90,0.14) 0%, transparent 55%)",
          }}
        />
        {/* Bottom vignette — blend into content area */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #080B0F 0%, rgba(8,11,15,0.68) 40%, transparent 72%)" }}
        />

        {/* Mini nav strip */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(245,245,243,0.28)" }}>
            NOA VEL
          </span>
          <div className="flex items-center gap-3.5">
            {["Shows", "Music", "Contact"].map((item) => (
              <span key={item} className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: "rgba(245,245,243,0.20)" }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Artist info at bottom */}
        <div className="absolute bottom-4 left-5 right-5">
          <div className="mb-2 flex gap-1.5">
            {["House", "Tech House"].map((g) => (
              <span
                key={g}
                className="rounded-full px-2.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  border: "1px solid rgba(109,93,252,0.30)",
                  background: "rgba(0,0,0,0.50)",
                  color: "rgba(245,245,243,0.60)",
                }}
              >
                {g}
              </span>
            ))}
          </div>
          <p className="text-[26px] font-bold uppercase leading-none tracking-[-0.02em] text-[#F5F5F3]">NOA VEL</p>
          <p className="mt-1 font-mono text-[10px]" style={{ color: "rgba(245,245,243,0.30)" }}>Madrid · Spain</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="rounded px-3 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-white"
              style={{ background: "#6D5DFC" }}
            >
              Bookings
            </span>
            <span
              className="rounded px-3 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em]"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(245,245,243,0.40)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              Press Kit
            </span>
          </div>
        </div>
      </div>

      {/* 3-col content */}
      <div
        className="grid grid-cols-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Shows */}
        <div className="p-4" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.20em]" style={{ color: "#6D5DFC" }}>Shows</p>
          <div className="space-y-2.5">
            {[
              { day: "14", mon: "JUN", venue: "Fabrik", city: "Madrid" },
              { day: "22", mon: "JUL", venue: "Tresor", city: "Berlin" },
            ].map((s) => (
              <div key={s.venue} className="flex items-center gap-2.5">
                <div className="w-7 shrink-0 text-center">
                  <p className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: "rgba(109,93,252,0.55)" }}>{s.mon}</p>
                  <p className="text-[17px] font-bold leading-none text-[#F5F5F3]">{s.day}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#F5F5F3]">{s.venue}</p>
                  <p className="font-mono text-[9px]" style={{ color: "#52525B" }}>{s.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Releases */}
        <div className="p-4" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.20em]" style={{ color: "#6D5DFC" }}>Releases</p>
          <div className="space-y-2">
            {[
              { title: "Meridian", year: "2025", hue: 280 },
              { title: "Drift", year: "2024", hue: 240 },
              { title: "Olvido", year: "2024", hue: 200 },
            ].map((r) => (
              <div key={r.title} className="flex items-center gap-2">
                <div
                  className="h-7 w-7 shrink-0 rounded"
                  style={{ background: `linear-gradient(135deg, oklch(0.28 0.12 ${r.hue}), oklch(0.08 0 0))` }}
                />
                <div>
                  <p className="text-[10px] font-semibold text-[#F5F5F3]">{r.title}</p>
                  <p className="font-mono text-[8px]" style={{ color: "#52525B" }}>{r.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking */}
        <div className="p-4">
          <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.20em]" style={{ color: "#6D5DFC" }}>Booking</p>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="font-mono text-[7px] uppercase tracking-[0.10em]" style={{ color: "#52525B" }}>Email</p>
            <p className="mt-1 break-all font-mono text-[9px]" style={{ color: "rgba(109,93,252,0.75)" }}>booking@noavel.com</p>
          </div>
          <div
            className="mt-1.5 rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="font-mono text-[7px] uppercase tracking-[0.10em]" style={{ color: "#52525B" }}>Press Kit</p>
            <p className="mt-1 font-mono text-[9px]" style={{ color: "#52525B" }}>noavel.djhq.co/presskit</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Problem section ──────────────────────────────────────────────────────────

function ProblemSection() {
  const tiles = [
    { name: "Instagram", note: "Not professional" },
    { name: "Linktree", note: "Just links" },
    { name: "Dropbox", note: "Links expire" },
    { name: "Google Drive", note: "Impossible to navigate" },
    { name: "PDF press kit", note: "Goes outdated" },
    { name: "WhatsApp", note: "Embarrassing" },
    { name: "Spotify link", note: "No booking info" },
    { name: "Beatport", note: "Incomplete profile" },
    { name: "SoundCloud", note: "2019 called" },
  ]

  return (
    <section style={{ background: "#090C11", padding: "96px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.20em]" style={{ color: "#52525B" }}>
            The current reality
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="mb-14 text-[clamp(28px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            What a booker finds when they Google you.
          </h2>
        </Reveal>

        <div className="mb-12 grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {tiles.map((t, i) => (
            <Reveal key={t.name} delay={i * 35} className="lg:col-span-1">
              <div
                className="rounded-xl p-4 transition-colors duration-200"
                style={{
                  border: "1px solid rgba(255,255,255,0.04)",
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <p className="text-[12px] font-medium" style={{ color: "rgba(245,245,243,0.30)" }}>{t.name}</p>
                <p className="mt-1 font-mono text-[9px]" style={{ color: "#52525B" }}>{t.note}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Pivot */}
        <Reveal delay={360}>
          <div className="flex items-center gap-5 py-8">
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#52525B" }}>
              DJHQ replaces all of it
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </Reveal>

        <Reveal delay={420}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[16px] leading-[1.8]" style={{ color: "#71717A" }}>
              A festival booker receives 200 artist inquiries a year. They can tell in four seconds
              whether an artist is professional. Expired Dropbox links, outdated PDFs and missing
              photos tell them everything — about you.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Product proof ────────────────────────────────────────────────────────────

function ProductSection() {
  const panels = [
    {
      label: "Artist Destination",
      headline: "One URL. The whole picture.",
      body: "Your bio, sound, genre, city and social links — in a page that looks like you hired someone serious to build it. You didn't.",
    },
    {
      label: "Electronic Press Kit",
      headline: "Stop sending Dropbox folders.",
      body: "Press photos, PDFs in English and Spanish, tech rider, asset folders. One link. Permanent URL. Always current.",
    },
    {
      label: "Shows & History",
      headline: "Prove you're a working artist.",
      body: "Upcoming dates, past performances, venue history. When a festival asks where you've played, you send one link.",
    },
    {
      label: "Release Catalog",
      headline: "Your catalog. Not a Spotify link.",
      body: "Every release with artwork, streaming links and label info. Featured at the top. Full history below.",
    },
  ]

  return (
    <section style={{ background: "#0B0F14", padding: "96px 0" }}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.20em]" style={{ color: "#52525B" }}>
            What you get
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="mb-14 text-[clamp(28px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Everything they need to know.
            <br />
            <span style={{ color: "#71717A" }}>Nothing missing.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2">
          {panels.map((p, i) => (
            <Reveal key={p.label} delay={i * 80}>
              <div
                className="rounded-2xl p-8 transition-colors duration-300"
                style={{
                  background: "#111520",
                  border: "1px solid rgba(255,255,255,0.06)",
                  minHeight: 200,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(109,93,252,0.25)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
                }}
              >
                <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#6D5DFC" }}>
                  {p.label}
                </p>
                <h3 className="mb-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#F5F5F3]">
                  {p.headline}
                </h3>
                <p className="text-[14px] leading-[1.7]" style={{ color: "#71717A" }}>
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Press kit focus ──────────────────────────────────────────────────────────

function PressKitSection() {
  return (
    <section style={{ background: "#090C11", padding: "96px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <Reveal>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.20em]" style={{ color: "#52525B" }}>
                Press kit
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="mb-5 text-[clamp(28px,3.5vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
                Stop sending
                Dropbox folders.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mb-7 text-[15px] leading-[1.8]" style={{ color: "#71717A" }}>
                Your EPK lives at a permanent URL. Bio, press photos, PDFs in English and Spanish,
                technical rider and asset folders — connected, professional, always current.
                Send one link. They have everything. It never expires.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <ul className="space-y-3">
                {[
                  "Available in English and Spanish",
                  "Updates when your profile updates",
                  "Permanent URL — never expires",
                  "Your domain, not a generic link",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0" style={{ color: "#6D5DFC" }} />
                    <span className="text-[14px]" style={{ color: "#A1A1AA" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Press kit UI */}
          <Reveal delay={140}>
            <div
              className="overflow-hidden rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111520" }}
            >
              <div className="border-b p-6" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "#6D5DFC" }}>
                  Electronic Press Kit
                </p>
                <p className="mt-1.5 text-[18px] font-bold tracking-[-0.01em] text-[#F5F5F3]">NOA VEL</p>
                <p className="font-mono text-[11px]" style={{ color: "#52525B" }}>House · Tech House · Madrid</p>
              </div>

              {/* Downloads */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { lang: "Press Kit ENG", size: "4.2 MB", flag: "🇬🇧" },
                  { lang: "Press Kit ESP", size: "3.8 MB", flag: "🇪🇸" },
                ].map((d) => (
                  <div
                    key={d.lang}
                    className="cursor-pointer rounded-xl p-5 transition-all duration-200 hover:border-[rgba(109,93,252,0.30)]"
                    style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <span className="text-[18px]">{d.flag}</span>
                    <p className="mt-3 text-[12px] font-semibold text-[#F5F5F3]">{d.lang}</p>
                    <p className="font-mono text-[10px]" style={{ color: "#52525B" }}>PDF · {d.size}</p>
                    <p className="mt-3 font-mono text-[10px] font-medium" style={{ color: "#6D5DFC" }}>Download ↗</p>
                  </div>
                ))}
              </div>

              {/* Folders */}
              <div className="border-t p-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {["Full Drive Package", "Press Photos", "Technical Rider", "Logos & Artwork"].map((f) => (
                  <div
                    key={f}
                    className="mb-2 flex items-center justify-between rounded-lg px-4 py-3"
                    style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
                  >
                    <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{f}</span>
                    <span className="font-mono text-[10px]" style={{ color: "#6D5DFC" }}>Open ↗</span>
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

// ─── For whom ─────────────────────────────────────────────────────────────────

function ForSection() {
  return (
    <section style={{ background: "#0B0F14", padding: "96px 0" }}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="mb-12 text-[clamp(24px,3.5vw,40px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Built for electronic music artists
            <br />
            <span style={{ color: "#71717A" }}>who take their career seriously.</span>
          </h2>
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal delay={80}>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#6D5DFC" }}>
              DJHQ is for you if
            </p>
            <ul className="space-y-4">
              {[
                "You play clubs, festivals or events regularly",
                "You receive booking inquiries by email",
                "You appear on lineups that promoters Google",
                "You want to look as professional as your music sounds",
                "You're tired of assembling information every time someone asks",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3.5">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#6D5DFC" }} />
                  <span className="text-[15px] leading-[1.6]" style={{ color: "#A1A1AA" }}>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={160}>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#52525B" }}>
              Probably not for you if
            </p>
            <ul className="space-y-4">
              {[
                "You haven't played a real show yet",
                "You want a booking management platform",
                "You want music distribution",
                "You want social media management tools",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3.5">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
                  <span className="text-[15px] leading-[1.6]" style={{ color: "#52525B" }}>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#090C11", padding: "120px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Indigo glow behind CTA */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 700,
          height: 500,
          background: "radial-gradient(ellipse at center, rgba(109,93,252,0.10) 0%, transparent 60%)",
          animation: "hp-indigo-pulse 16s ease-in-out infinite",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="mb-5 text-[clamp(34px,5vw,62px)] font-bold leading-[1.08] tracking-[-0.03em] text-[#F5F5F3]">
            Start building your
            professional presence.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mb-10 text-[16px] leading-[1.7]" style={{ color: "#71717A" }}>
            Join artists who look as serious as they actually are.
            Takes under an hour. Free to start.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="flex flex-col items-center gap-4">
            <a
              href="mailto:access@djhq.co"
              className="flex h-12 items-center gap-2.5 rounded-md bg-[#6D5DFC] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#7E70FD] hover:shadow-[0_0_40px_rgba(109,93,252,0.45)]"
            >
              Get started — it&apos;s free
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
            <Link
              href="/andresherrera"
              className="text-[14px] transition-colors hover:text-[#F5F5F3]"
              style={{ color: "#52525B" }}
            >
              See andresherrera.djhq.co →
            </Link>
            <p className="font-mono text-[11px]" style={{ color: "#3F3F46" }}>
              Free to start · Setup in under an hour · One professional URL
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
    <footer style={{ background: "#090C11", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "28px 0" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <span className="text-[13px] font-bold tracking-[0.04em]" style={{ color: "rgba(245,245,243,0.25)" }}>DJHQ</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="font-mono text-[11px] transition-colors hover:text-[#F5F5F3]" style={{ color: "#3F3F46" }}>
            Login
          </Link>
          <span className="font-mono text-[11px]" style={{ color: "#3F3F46" }}>
            © {new Date().getFullYear()} DJHQ
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
      <ProductSection />
      <PressKitSection />
      <ForSection />
      <ClosingCTA />
      <Footer />
    </main>
  )
}
