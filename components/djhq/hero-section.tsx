import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Ambient — one subtle accent bloom, nothing else */}
      <div className="pointer-events-none absolute left-0 top-0 h-[700px] w-[700px] rounded-full bg-accent/[0.04] blur-[180px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">

        {/* ── Left: editorial copy ── */}
        <div className="flex flex-col justify-center py-16 lg:py-24">

          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent/65">
            DJHQ for Artists
          </p>

          <h1 className="mt-5 max-w-[520px] text-balance text-[2.6rem] font-black leading-[1.02] tracking-[-0.025em] text-foreground sm:text-5xl lg:text-[3.1rem]">
            Your DJ career needs more than a link in bio.
          </h1>

          <p className="mt-5 max-w-[420px] text-[15px] leading-[1.7] text-white/42">
            A premium public profile for your music, shows, media, press kit
            and booking — built for artists who need to look ready.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="mailto:access@djhq.co"
              className="inline-flex h-11 items-center rounded-full bg-accent px-7 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
            >
              Request Access
            </a>
            <Link
              href="/andresherrera"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/60 transition-all duration-150 hover:border-white/[0.20] hover:text-white/90"
            >
              View Live Example
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-white/18">
            Opening for selected artists
          </p>
        </div>

        {/* ── Right: real profile preview ── */}
        <div className="relative flex items-center pb-10 lg:py-12">
          <div className="relative w-full overflow-hidden rounded-[22px] border border-white/[0.07] shadow-2xl shadow-black/60">

            {/* URL bar — minimal tag, not a fake browser */}
            <div className="flex items-center gap-2 border-b border-white/[0.04] bg-black/60 px-4 py-2.5 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[10px] text-white/35">djhq.com/andresherrera</span>
            </div>

            {/* Profile image — tall crop, portrait feel */}
            <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[4/5] lg:aspect-[3/4]">
              <Image
                src="/images/dj-hero.jpg"
                alt="ANDRES:HERRERA"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-top"
                priority
              />
              {/* Gradient overlay — dark at bottom, lighter at top */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Profile content overlay */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">

                {/* Genre chips */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {["House", "Tech House", "Producer"].map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-accent/40 bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/80 backdrop-blur-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Artist name */}
                <h2 className="text-[2.2rem] font-black uppercase leading-none tracking-[-0.025em] text-white sm:text-5xl">
                  ANDRES:HERRERA
                </h2>

                {/* Thin rule + mini data row */}
                <div className="mt-4 flex items-center gap-5 border-t border-white/[0.07] pt-4">
                  {[
                    { label: "Shows", value: "ICE Festival" },
                    { label: "Sets", value: "Live archive" },
                    { label: "Press", value: "Kit ready" },
                  ].map((item, i) => (
                    <div key={item.label} className={i > 0 ? "flex items-center gap-5" : ""}>
                      {i > 0 && <div className="h-5 w-px bg-white/[0.07]" />}
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-accent/55">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white/70">
                          {item.value}
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
    </section>
  )
}
