import Link from "next/link"
import { ArrowRight } from "lucide-react"

const pillars = [
  {
    label: "Music",
    body: "Releases, selected tracks, DJ sets and streaming links in one place.",
    items: ["Release catalog", "Streaming links", "Performance archive", "Selected tracks"],
  },
  {
    label: "Live",
    body: "Upcoming shows, past performances, video archive and venue context.",
    items: ["Upcoming shows", "Past gigs", "Video archive", "Ticket links"],
  },
  {
    label: "Press",
    body: "Photos, bio, press kit, booking contact and assets ready to share.",
    items: ["Artist bio", "Press photos", "One-click EPK", "Booking contact"],
  },
]

const steps = [
  {
    step: "01",
    label: "Build your artist HQ",
    body: "Profile, links, releases, shows, media and press kit.",
  },
  {
    step: "02",
    label: "Share one URL",
    body: "Send it to promoters, clubs, labels, festivals and fans.",
  },
  {
    step: "03",
    label: "Keep it current",
    body: "Update once. Your public profile stays ready.",
  },
]

export function FeaturesSection() {
  return (
    <div id="product">

      {/* ── Thin rule ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Editorial pillars ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent/55">
            What&apos;s inside
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-2xl font-black leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
            Everything a promoter needs,{" "}
            <span className="text-white/45">without sending five links.</span>
          </h2>

          {/* Three-column pillar grid — gap-px trick for thin dividers */}
          <div className="mt-12 overflow-hidden rounded-[20px] border border-white/[0.05] bg-white/[0.04] sm:grid sm:grid-cols-3">
            {pillars.map((pillar, i) => (
              <div
                key={pillar.label}
                className={[
                  "bg-background px-7 py-8 lg:px-9 lg:py-10",
                  i > 0 ? "border-t border-white/[0.04] sm:border-t-0 sm:border-l sm:border-white/[0.04]" : "",
                ].join(" ")}
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-accent/50">
                  {pillar.label}
                </p>
                <p className="mt-4 text-[14px] leading-[1.65] text-white/48">
                  {pillar.body}
                </p>
                <ul className="mt-7 space-y-2.5">
                  {pillar.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[12px] text-white/32">
                      <span className="h-px w-4 shrink-0 bg-accent/28" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Thin rule ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Three-step workflow ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent/55">
            How it works
          </p>

          <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-12">
            {steps.map((s) => (
              <div key={s.step}>
                <p className="font-mono text-[10px] tracking-[0.24em] text-accent/30">
                  {s.step}
                </p>
                <p className="mt-3 text-[15px] font-bold tracking-[-0.005em] text-foreground/88">
                  {s.label}
                </p>
                <p className="mt-2 text-[13px] leading-[1.65] text-white/38">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Thin rule ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Final CTA ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent/55">
            DJHQ
          </p>
          <h2 className="mt-4 max-w-sm text-balance text-2xl font-black leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
            See the profile.{" "}
            <span className="text-white/42">Request access when ready.</span>
          </h2>
          <p className="mt-4 max-w-xs text-[14px] leading-[1.65] text-white/35">
            DJHQ is opening gradually for selected artists.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/andresherrera"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/60 transition-all duration-150 hover:border-white/[0.22] hover:text-white/90"
            >
              View ANDRES:HERRERA
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="mailto:access@djhq.co"
              className="inline-flex h-11 items-center rounded-full bg-accent px-7 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
            >
              Request Access
            </a>
          </div>

        </div>
      </section>

    </div>
  )
}
