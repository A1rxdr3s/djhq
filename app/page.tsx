"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ExternalLink, Music2, Radio, Play, Youtube, Instagram } from "lucide-react"
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

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#080808" }}
    >
      {/* Subtle top-right glow — intentionally faint */}
      <div
        className="pointer-events-none absolute right-[-120px] top-[-80px] h-[600px] w-[600px] opacity-40"
        style={{
          background: "radial-gradient(ellipse at 70% 20%, rgba(0,230,167,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Grid overlay — barely visible texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{ backgroundImage: "url('/grid.svg')" }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-24 pt-28 lg:grid-cols-[1fr_1.08fr] lg:gap-14 lg:pb-28 lg:pt-32">

        {/* ── Left column — copy ────────────────────────────────────────────── */}
        <div className="flex flex-col items-start">

          {/* Category badge */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1"
            style={{
              borderColor: "rgba(0,230,167,0.25)",
              background: "rgba(0,230,167,0.06)",
              animation: "hp-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#00E6A7" }}
            />
            <span
              className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
              style={{ color: "#00E6A7" }}
            >
              For DJs &amp; electronic music artists
            </span>
          </div>

          {/* Headline */}
          <h1
            className="mb-5 text-[clamp(40px,4.8vw,66px)] font-bold leading-[1.04] tracking-[-0.03em] text-white"
            style={{ animation: "hp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both" }}
          >
            Your professional
            <br />
            presence, ready today.
          </h1>

          {/* Supporting copy */}
          <p
            className="mb-9 max-w-[420px] text-[16px] leading-[1.65]"
            style={{
              color: "rgba(255,255,255,0.48)",
              animation: "hp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) 0.2s both",
            }}
          >
            One URL for your profile, press kit, shows, releases and booking contact.
            Built for artists who take their career seriously.
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
              style={{
                background: "#00E6A7",
              }}
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
              href="/andresherrera"
              className="flex h-11 items-center gap-1.5 rounded-full border px-5 text-[14px] font-medium transition-all duration-150"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.55)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"
                e.currentTarget.style.color = "rgba(255,255,255,0.85)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"
                e.currentTarget.style.color = "rgba(255,255,255,0.55)"
              }}
            >
              See Example Profile
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>

        {/* ── Right column — product screenshot ─────────────────────────── */}
        <div
          className="w-full"
          style={{ animation: "hp-fade-up 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s both" }}
        >
          {/* Browser frame */}
          <div
            className="w-full overflow-hidden"
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 24px 60px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.40)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-0 px-3.5 py-2.5"
              style={{
                background: "#0D0D0D",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Traffic lights */}
              <div className="flex items-center gap-1.5">
                {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => (
                  <div
                    key={i}
                    className="h-[10px] w-[10px] rounded-full"
                    style={{ background: c, opacity: 0.65 }}
                  />
                ))}
              </div>
              {/* URL bar */}
              <div className="mx-3 flex flex-1 items-center justify-center">
                <div
                  className="rounded px-3 py-[3px]"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "rgba(255,255,255,0.22)" }}
                  >
                    andresherrera.djhq.co
                  </span>
                </div>
              </div>
              {/* Spacer */}
              <div className="w-[54px]" />
            </div>

            {/* Artist profile content */}
            <ProfileMockup />
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── Profile mockup (ANDRES:HERRERA) ─────────────────────────────────────────

function ProfileMockup() {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: 460, background: "#060810" }}>
      {/* Hero photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dj-hero.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.90) contrast(1.10) brightness(0.78)" }}
      />

      {/* Gradient system */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,8,16,0.28) 0%, rgba(6,8,16,0.02) 28%, rgba(6,8,16,0.52) 66%, rgba(6,8,16,0.99) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 10%, transparent 18%, rgba(6,8,16,0.22) 55%, rgba(6,8,16,0.70) 100%)" }} />
      <div className="absolute inset-y-0 left-0 w-3/4" style={{ background: "linear-gradient(92deg, rgba(6,8,16,0.50), transparent 72%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-3/5" style={{ background: "radial-gradient(ellipse at 20% 90%, rgba(0,230,167,0.06), transparent 38%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(92deg, rgba(0,0,0,0.18) 0%, transparent 50%), linear-gradient(0deg, rgba(0,0,0,0.16) 0%, transparent 30%)" }} />

      {/* Content pinned to bottom */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-4">
        {/* Bottom lift */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: "min(78%,460px)", background: "linear-gradient(0deg, rgba(6,8,16,0.97) 0%, rgba(6,8,16,0.60) 38%, rgba(6,8,16,0.08) 72%, transparent 100%)" }}
        />

        {/* Glass surface */}
        <div
          className="relative rounded-[1.4rem] px-4 py-3"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.12)",
            backdropFilter: "blur(1.5px)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.4rem]"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent)" }}
          />

          {/* Genre chips */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["House", "Tech House", "Melodic Techno"].map((g) => (
              <span
                key={g}
                className="rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em]"
                style={{
                  border: "1px solid rgba(0,230,167,0.55)",
                  background: "rgba(0,0,0,0.35)",
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {g}
              </span>
            ))}
          </div>

          {/* Artist name */}
          <p
            className="text-[34px] font-black uppercase leading-none tracking-[-0.02em] text-white"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.50)" }}
          >
            ANDRES:HERRERA
          </p>

          {/* Tagline */}
          <p
            className="mt-1.5 text-[12px] font-medium uppercase tracking-[0.07em]"
            style={{ color: "rgba(0,230,167,0.85)" }}
          >
            Peak-time house &amp; techno
          </p>

          {/* Location */}
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            Miami · Berlin
          </p>

          {/* Bio — first sentence only */}
          <p
            className="mt-2 max-w-[400px] text-[12px] font-medium leading-[1.6] tracking-[0.01em]"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Dark, groove-led house and techno shaped for peak-time dance floors. Recent releases and club sets across Fabric, Watergate and Robert Johnson.
          </p>

          {/* CTAs */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span
              className="flex h-9 cursor-default items-center rounded-full px-5 text-[12px] font-semibold uppercase tracking-[0.10em] text-[#0A1410]"
              style={{ background: "#00E6A7" }}
            >
              Booking
            </span>
            <span
              className="flex h-9 cursor-default items-center gap-2 rounded-full px-5 text-[12px] font-semibold uppercase tracking-[0.10em] text-white"
              style={{ border: "1px solid rgba(0,230,167,0.40)", background: "transparent" }}
            >
              Press Kit
            </span>
          </div>

          {/* Social icons */}
          <div className="mt-3 flex items-center gap-2">
            {[Music2, Radio, Play, Youtube, Instagram].map((Icon, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#00E6A7",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Problem section ──────────────────────────────────────────────────────────

const scenarios = [
  {
    n: "01",
    title: "A festival asks for your press kit.",
    body: "You start searching through Dropbox folders, PDFs, press photos and old email attachments.",
    result: "You look disorganized.",
  },
  {
    n: "02",
    title: "A label wants to know who you are.",
    body: "They find outdated profiles, old photos and scattered information across platforms.",
    result: "You look inactive.",
  },
  {
    n: "03",
    title: "A promoter Googles your name.",
    body: "They want to see who you are, what you've released and where you've played.",
    result: "They move on to the next artist.",
  },
]

function ProblemSection() {
  return (
    <section style={{ background: "#090C11", padding: "72px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-4xl px-6">

        {/* Eyebrow + headline */}
        <Reveal>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "#52525B" }}>
            Reality check
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="mb-4 text-[clamp(30px,4.5vw,54px)] font-bold leading-[1.08] tracking-[-0.03em] text-[#F5F5F3]">
            A booking opportunity arrives.
            <br />
            <span style={{ color: "#71717A" }}>Are you ready for it?</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mb-10 max-w-xl text-[16px] leading-[1.75]" style={{ color: "#52525B" }}>
            Every year, promoters, labels and festivals evaluate hundreds of artists.
            Most decisions happen in seconds.
          </p>
        </Reveal>

        {/* Three scenario cards */}
        <div className="space-y-4">
          {scenarios.map((s, i) => (
            <Reveal key={s.n} delay={180 + i * 80}>
              <div
                className="group relative overflow-hidden rounded-2xl px-7 py-6 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)" }}
              >
                {/* Subtle left accent line */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-px"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(0,230,167,0.28), transparent)" }}
                />

                <div className="flex items-start gap-6 sm:gap-10">
                  {/* Card number */}
                  <span
                    className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.18em] pt-0.5"
                    style={{ color: "rgba(0,230,167,0.40)" }}
                  >
                    {s.n}
                  </span>

                  <div className="flex-1 sm:flex sm:items-start sm:gap-10">
                    {/* Scenario */}
                    <div className="flex-1">
                      <p className="text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#F5F5F3] sm:text-[19px]">
                        {s.title}
                      </p>
                      <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: "#71717A" }}>
                        {s.body}
                      </p>
                    </div>

                    {/* Result */}
                    <div
                      className="mt-4 shrink-0 rounded-xl px-4 py-3 sm:mt-0 sm:w-52"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "#3F3F46" }}>
                        Result
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold" style={{ color: "rgba(245,245,243,0.55)" }}>
                        {s.result}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Resolution statement */}
        <Reveal delay={540}>
          <div className="mt-10 text-center">
            <p
              className="mb-3 text-[clamp(22px,3.5vw,38px)] font-bold tracking-[-0.02em] text-[#F5F5F3]"
            >
              DJHQ makes sure that never happens.
            </p>
            <p className="mx-auto max-w-lg text-[15px] leading-[1.75]" style={{ color: "#71717A" }}>
              One professional destination for your bio, shows, releases,
              press kit and booking information.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Product proof ────────────────────────────────────────────────────────────

function ProductSection() {
  return (
    <section id="features" style={{ background: "#0B0F14", padding: "72px 0" }}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.20em]" style={{ color: "#52525B" }}>
            What you get
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="mb-10 text-[clamp(28px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Everything they need to know.
            <br />
            <span style={{ color: "#71717A" }}>Nothing missing.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Artist destination */}
          <Reveal delay={0}>
            <div
              className="rounded-2xl p-6 transition-all duration-200"
              style={{ background: "#111520", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,230,167,0.22)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}
            >
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
                Artist Destination
              </p>
              <h3 className="mb-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#F5F5F3]">
                One URL. The whole picture.
              </h3>
              <p className="mb-5 text-[13px] leading-[1.7]" style={{ color: "#71717A" }}>
                Bio, sound, genre, city, social links. Looks like you hired someone serious.
              </p>
              {/* Mini artist card */}
              <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0B0F14" }}>
                <div className="relative h-14" style={{ background: "linear-gradient(135deg, #0C1220, #0B0A14)" }}>
                  <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(0,230,167,0.10), transparent 55%)" }} />
                  <div className="absolute bottom-2 left-3 flex gap-1.5">
                    {["House", "Tech House"].map((g) => (
                      <span key={g} className="rounded-full px-2 py-0.5 font-mono text-[8px] font-semibold uppercase" style={{ border: "1px solid rgba(0,230,167,0.45)", background: "rgba(0,0,0,0.40)", color: "rgba(255,255,255,0.75)" }}>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-3 pb-3 pt-2">
                  <p className="text-[15px] font-black uppercase tracking-[-0.01em] text-white">ANDRES:HERRERA</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Miami · Berlin</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[Music2, Radio, Play, Youtube, Instagram].map((Icon, i) => (
                      <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#00E6A7" }}>
                        <Icon className="h-3 w-3" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Shows */}
          <Reveal delay={80}>
            <div
              className="rounded-2xl p-6 transition-all duration-200"
              style={{ background: "#111520", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,230,167,0.22)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}
            >
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
                Shows & History
              </p>
              <h3 className="mb-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#F5F5F3]">
                Prove you&apos;re a working artist.
              </h3>
              <p className="mb-5 text-[13px] leading-[1.7]" style={{ color: "#71717A" }}>
                Upcoming dates, past performances, venue history — all in one link.
              </p>
              {/* Mini show cards */}
              <div className="space-y-2">
                {[
                  { day: "14", mon: "JUN", venue: "Fabrik", city: "Madrid", upcoming: true },
                  { day: "22", mon: "JUL", venue: "Tresor", city: "Berlin", upcoming: true },
                  { day: "02", mon: "MAY", venue: "Shelter", city: "Amsterdam", upcoming: false },
                ].map((s) => (
                  <div
                    key={s.venue}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div className="w-9 shrink-0 rounded-lg py-1 text-center" style={{ background: "rgba(0,230,167,0.07)" }}>
                      <p className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: "rgba(0,230,167,0.60)" }}>{s.mon}</p>
                      <p className="text-[15px] font-bold leading-none text-white">{s.day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white">{s.venue}</p>
                      <p className="font-mono text-[10px]" style={{ color: "#52525B" }}>{s.city}</p>
                    </div>
                    {s.upcoming && (
                      <span className="shrink-0 rounded px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider" style={{ background: "rgba(0,230,167,0.10)", color: "#00E6A7" }}>
                        Soon
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Press Kit */}
          <Reveal delay={160}>
            <div
              className="rounded-2xl p-6 transition-all duration-200"
              style={{ background: "#111520", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,230,167,0.22)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}
            >
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
                Electronic Press Kit
              </p>
              <h3 className="mb-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#F5F5F3]">
                Stop sending Dropbox folders.
              </h3>
              <p className="mb-5 text-[13px] leading-[1.7]" style={{ color: "#71717A" }}>
                PDF press kits, photos, tech rider, asset folders. Permanent URL, always current.
              </p>
              {/* Mini EPK download cards */}
              <div className="mb-2 grid grid-cols-2 gap-2">
                {[
                  { lang: "Press Kit ENG", size: "4.2 MB", flag: "🇬🇧" },
                  { lang: "Press Kit ESP", size: "3.8 MB", flag: "🇪🇸" },
                ].map((d) => (
                  <div
                    key={d.lang}
                    className="rounded-xl p-3"
                    style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <span className="text-[18px]">{d.flag}</span>
                    <p className="mt-2 text-[11px] font-semibold text-white">{d.lang}</p>
                    <p className="font-mono text-[9px]" style={{ color: "#52525B" }}>PDF · {d.size}</p>
                    <p className="mt-2 font-mono text-[9px] font-medium" style={{ color: "#00E6A7" }}>Download ↗</p>
                  </div>
                ))}
              </div>
              {["Full Drive Package", "Press Photos"].map((f) => (
                <div
                  key={f}
                  className="mb-1.5 flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
                >
                  <span className="text-[11px]" style={{ color: "#A1A1AA" }}>{f}</span>
                  <span className="font-mono text-[9px]" style={{ color: "#00E6A7" }}>Open ↗</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Releases */}
          <Reveal delay={240}>
            <div
              className="rounded-2xl p-6 transition-all duration-200"
              style={{ background: "#111520", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,230,167,0.22)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}
            >
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
                Release Catalog
              </p>
              <h3 className="mb-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#F5F5F3]">
                Your catalog. Not a Spotify link.
              </h3>
              <p className="mb-5 text-[13px] leading-[1.7]" style={{ color: "#71717A" }}>
                Every release with artwork, streaming links and label info. Featured at the top.
              </p>
              {/* Featured release */}
              <div
                className="mb-2 flex gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-lg"
                  style={{ background: "linear-gradient(135deg, oklch(0.28 0.14 280), oklch(0.08 0 0))" }}
                />
                <div className="flex min-w-0 flex-col justify-between py-0.5">
                  <div>
                    <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(0,230,167,0.70)" }}>SINGLE</p>
                    <p className="text-[14px] font-black tracking-[-0.01em] text-white">Meridian</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Drumcode · 2025</p>
                  </div>
                  <span
                    className="mt-1 inline-flex h-5 w-fit items-center rounded-full px-2.5 font-mono text-[8px] font-bold uppercase tracking-[0.10em]"
                    style={{ border: "1px solid rgba(0,230,167,0.22)", color: "#00E6A7" }}
                  >
                    Listen ↗
                  </span>
                </div>
              </div>
              {/* Catalog rows */}
              <div className="space-y-1.5">
                {[
                  { title: "Drift", label: "Suara", year: "2024", hue: 240 },
                  { title: "Olvido", label: "Desolat", year: "2024", hue: 200 },
                ].map((r) => (
                  <div
                    key={r.title}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                    style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div
                      className="h-8 w-8 shrink-0 rounded"
                      style={{ background: `linear-gradient(135deg, oklch(0.26 0.10 ${r.hue}), oklch(0.08 0 0))` }}
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-white">{r.title}</p>
                      <p className="font-mono text-[9px]" style={{ color: "#52525B" }}>{r.label} · {r.year}</p>
                    </div>
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

// ─── Press kit focus ──────────────────────────────────────────────────────────

function PressKitSection() {
  return (
    <section id="press-kit" style={{ background: "#090C11", padding: "72px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
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
                    <Check className="h-4 w-4 shrink-0" style={{ color: "#00E6A7" }} />
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
                <p className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "#00E6A7" }}>
                  Electronic Press Kit
                </p>
                <p className="mt-1.5 text-[18px] font-bold tracking-[-0.01em] text-[#F5F5F3]">ANDRES:HERRERA</p>
                <p className="font-mono text-[11px]" style={{ color: "#52525B" }}>House · Tech House · Melodic Techno</p>
              </div>

              {/* Downloads */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { lang: "Press Kit ENG", size: "4.2 MB", flag: "🇬🇧" },
                  { lang: "Press Kit ESP", size: "3.8 MB", flag: "🇪🇸" },
                ].map((d) => (
                  <div
                    key={d.lang}
                    className="cursor-pointer rounded-xl p-5 transition-all duration-200 hover:border-[rgba(0,230,167,0.28)]"
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
              <div className="border-t p-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {["Full Drive Package", "Press Photos", "Technical Rider", "Logos & Artwork"].map((f) => (
                  <div
                    key={f}
                    className="mb-2 flex items-center justify-between rounded-lg px-4 py-3"
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

// ─── For whom ─────────────────────────────────────────────────────────────────

function ForSection() {
  return (
    <section style={{ background: "#0B0F14", padding: "72px 0" }}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="mb-8 text-[clamp(24px,3.5vw,40px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#F5F5F3]">
            Built for electronic music artists
            <br />
            <span style={{ color: "#71717A" }}>who take their career seriously.</span>
          </h2>
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal delay={80}>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#00E6A7" }}>
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
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#00E6A7" }} />
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
      style={{ background: "#090C11", padding: "88px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Indigo glow behind CTA */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 700,
          height: 500,
          background: "radial-gradient(ellipse at center, rgba(0,230,167,0.06) 0%, transparent 60%)",
          animation: "hp-indigo-pulse 16s ease-in-out infinite",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="mb-5 text-[clamp(34px,5vw,62px)] font-bold leading-[1.08] tracking-[-0.03em] text-[#F5F5F3]">
            Build the artist website
            your career deserves.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mb-10 text-[16px] leading-[1.7]" style={{ color: "#71717A" }}>
            One professional destination for your bio, press kit, shows, releases and bookings.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="flex flex-col items-center gap-4">
            <a
              href="mailto:access@djhq.co"
              className="flex h-12 items-center gap-2.5 rounded-md bg-[#00E6A7] px-7 text-[15px] font-semibold text-[#0A1410] transition-all duration-200 hover:bg-[#00D49A] hover:shadow-[0_0_48px_rgba(0,230,167,0.45)]"
            >
              Create Your {brand.name}
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/andresherrera"
              className="text-[14px] transition-colors hover:text-[#F5F5F3]"
              style={{ color: "#52525B" }}
            >
              See Live Example →
            </Link>
            <p className="font-mono text-[11px]" style={{ color: "#3F3F46" }}>
              Setup in under an hour · One professional URL · Built for electronic music artists
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
        <span className="text-[13px] font-bold tracking-[0.04em]" style={{ color: "rgba(245,245,243,0.25)" }}>{brand.name}</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="font-mono text-[11px] transition-colors hover:text-[#F5F5F3]" style={{ color: "#3F3F46" }}>
            Login
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
      <ProductSection />
      <PressKitSection />
      <ForSection />
      <ClosingCTA />
      <Footer />
    </main>
  )
}
