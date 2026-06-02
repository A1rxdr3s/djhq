import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Ambient accent bloom */}
      <div className="pointer-events-none absolute left-0 top-0 h-[700px] w-[700px] rounded-full bg-accent/[0.04] blur-[180px] motion-safe:[animation:hp-drift_14s_ease-in-out_infinite]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">

        {/* ── Left: editorial copy ── */}
        <div className="flex flex-col justify-center py-10 lg:py-14">

          <p
            className="font-mono text-[10px] uppercase tracking-[0.32em] text-accent/60 motion-safe:[animation:hp-fade-up_0.65s_ease_both]"
            style={{ animationDelay: "0ms" }}
          >
            DJHQ
          </p>

          <h1
            className="mt-5 max-w-[520px] text-[2.6rem] font-black leading-[1.02] tracking-[-0.03em] text-foreground motion-safe:[animation:hp-fade-up_0.65s_ease_both] sm:text-5xl lg:text-[3.1rem]"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block">One public HQ</span>
            <span className="block">for your entire</span>
            <span className="block text-white/35">artist career.</span>
          </h1>

          <p
            className="mt-5 max-w-[400px] text-[15px] leading-[1.72] text-white/40 motion-safe:[animation:hp-fade-up_0.65s_ease_both]"
            style={{ animationDelay: "200ms" }}
          >
            Music, releases, shows, videos, booking and press assets —
            organized in one professional destination.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-3 motion-safe:[animation:hp-fade-up_0.65s_ease_both]"
            style={{ animationDelay: "320ms" }}
          >
            <a
              href="mailto:access@djhq.co"
              className="inline-flex h-11 items-center rounded-full bg-accent px-7 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
            >
              Request Access
            </a>
            <Link
              href="/andresherrera"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/55 transition-all duration-150 hover:border-white/[0.20] hover:text-white/85"
            >
              View Live Example
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p
            className="mt-7 font-mono text-[10px] uppercase tracking-[0.24em] text-white/18 motion-safe:[animation:hp-fade-up_0.65s_ease_both]"
            style={{ animationDelay: "400ms" }}
          >
            Opening gradually for selected artists
          </p>
        </div>

        {/* ── Right: product UI preview ── */}
        <div
          className="relative flex items-center pb-8 motion-safe:[animation:hp-fade-up_0.65s_ease_both] lg:py-10"
          style={{ animationDelay: "240ms" }}
        >
          <div className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.07] shadow-2xl shadow-black/60 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/[0.11] hover:[box-shadow:0_16px_56px_color-mix(in_srgb,var(--accent)_6%,transparent),0_28px_64px_rgba(0,0,0,0.75)]">

            {/* URL bar */}
            <div className="flex items-center gap-2 border-b border-white/[0.04] bg-black/70 px-4 py-2.5 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[10px] text-white/32">djhq.com/andresherrera</span>
            </div>

            {/* Artist header — photo as banner */}
            <div className="relative h-[100px] overflow-hidden sm:h-[112px]">
              <Image
                src="/images/dj-hero.jpg"
                alt="ANDRES:HERRERA profile"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-[center_18%]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
              <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {["House", "Tech House", "Producer"].map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-accent/35 bg-black/60 px-2 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-white/75 backdrop-blur-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <p className="text-[1.1rem] font-black uppercase leading-none tracking-[-0.02em] text-white sm:text-[1.25rem]">
                  ANDRES:HERRERA
                </p>
              </div>
            </div>

            {/* Profile sections */}
            <div className="divide-y divide-white/[0.04] bg-background">

              {/* Releases */}
              <div className="px-5 py-3.5">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.28em] text-accent/50">
                  Releases
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg"
                    style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 160 / 0.7), oklch(0.08 0 0))" }}
                  />
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg"
                    style={{ background: "linear-gradient(135deg, oklch(0.35 0.08 200), oklch(0.06 0 0))" }}
                  />
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg"
                    style={{ background: "linear-gradient(135deg, oklch(0.22 0.04 260), oklch(0.55 0.18 160 / 0.25))" }}
                  />
                  <div className="ml-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/70">12 releases</p>
                    <p className="mt-0.5 text-[10px] text-white/32">Beatport · Spotify · Apple Music</p>
                  </div>
                </div>
              </div>

              {/* Upcoming shows */}
              <div className="px-5 py-3.5">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.28em] text-accent/50">
                  Upcoming Shows
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.02em] text-white/75">ICE Festival</p>
                      <p className="text-[10px] text-white/32">Buenos Aires · Feb 2025</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[9px] font-medium text-white/35">Tickets</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.02em] text-white/75">Club Room</p>
                      <p className="text-[10px] text-white/32">Barcelona · Mar 2025</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[9px] font-medium text-white/35">Tickets</span>
                  </div>
                </div>
              </div>

              {/* Press kit */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent/50">Press Kit</p>
                  <p className="mt-0.5 text-[10px] text-white/32">Bio · Photography · Technical rider</p>
                </div>
                <span className="rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.10em] text-accent/70">
                  EPK
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
