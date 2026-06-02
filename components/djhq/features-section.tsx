import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const fragments = [
  "Linktree",
  "Dropbox folders",
  "Press PDFs",
  "Booking PDFs",
  "Random social links",
  "Old SoundCloud pages",
]

const contentBlocks = [
  {
    num: "01",
    name: "Releases",
    desc: "Latest music, labels, artwork and streaming links.",
  },
  {
    num: "02",
    name: "Shows",
    desc: "Upcoming gigs, venues, tickets and performance history.",
  },
  {
    num: "03",
    name: "Videos",
    desc: "Live recordings and artist content.",
  },
  {
    num: "04",
    name: "Press Kit",
    desc: "Bio, photography and technical information.",
  },
  {
    num: "05",
    name: "Booking",
    desc: "Management, contacts and direct inquiries.",
  },
]

const metrics = [
  { value: "38", label: "Performances" },
  { value: "12", label: "Releases" },
  { value: "4",  label: "Countries" },
  { value: "1",  label: "Public Profile" },
]

export function FeaturesSection() {
  return (
    <div>

      {/* ─────────────────────────────────────────── */}
      {/* SECTION 2 — Problem                        */}
      {/* ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Thin rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-20 sm:pt-28 lg:grid lg:grid-cols-2 lg:gap-20">

            {/* Left: headline + strikethrough list */}
            <div>
              <h2 className="max-w-sm text-[2rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.5rem]">
                Artists don&apos;t need<br />
                five different links.
              </h2>

              <ul className="mt-10 space-y-0">
                {fragments.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-4 border-b border-white/[0.04] py-3"
                  >
                    <span className="font-mono text-[11px] text-white/22">×</span>
                    <span className="text-[1.05rem] font-semibold text-white/22 line-through decoration-white/[0.12] decoration-1 sm:text-[1.2rem]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: strong editorial statement */}
            <div className="mt-14 flex flex-col justify-center lg:mt-0">
              <p className="max-w-sm text-[16px] leading-[1.75] text-white/40">
                Promoters, clubs, labels and festivals should find everything
                in one place. Not scattered across six different links and
                email threads.
              </p>
              <p className="mt-6 max-w-sm text-[16px] leading-[1.75] text-white/40">
                One URL. Everything current.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── */}
      {/* SECTION 3 — Content blocks                 */}
      {/* ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Thin rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-20 sm:pt-28">
            <h2 className="max-w-lg text-[2rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.5rem]">
              Everything needed<br />
              to get booked.
            </h2>

            <div className="mt-12">
              {contentBlocks.map((block) => (
                <div
                  key={block.num}
                  className="grid border-t border-white/[0.05] py-7 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-10 md:grid-cols-[5rem_16rem_1fr]"
                >
                  <span className="mb-2 font-mono text-[10px] tracking-[0.22em] text-white/18 sm:mb-0">
                    {block.num}
                  </span>
                  <p className="text-[1.15rem] font-black uppercase tracking-[-0.01em] text-foreground sm:text-[1.3rem]">
                    {block.name}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-[1.65] text-white/38 sm:mt-0">
                    {block.desc}
                  </p>
                </div>
              ))}
              <div className="h-px bg-white/[0.05]" />
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── */}
      {/* SECTION 4 — Case study                     */}
      {/* ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Thin rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-20 sm:pt-28">

            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-accent/55">
              A working example
            </p>

            {/* Two-column: editorial left, photo right */}
            <div className="mt-6 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-16">

              <div>
                {/* Large artist name as headline */}
                <h2 className="text-[3rem] font-black uppercase leading-[0.95] tracking-[-0.03em] text-foreground sm:text-[4.5rem] lg:text-[5.5rem]">
                  ANDRES:<br />HERRERA
                </h2>

                {/* Metrics strip */}
                <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/[0.05] pt-8 sm:grid-cols-4">
                  {metrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-[2.2rem] font-black leading-none tracking-[-0.02em] text-foreground sm:text-[2.8rem]">
                        {m.value}
                      </p>
                      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/32">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Editorial paragraph */}
                <p className="mt-10 max-w-md text-[15px] leading-[1.78] text-white/40">
                  One public profile centralizes everything that promoters,
                  venues and fans need — releases, shows, press assets and
                  booking contact. All current, all in one URL.
                </p>

                <Link
                  href="/andresherrera"
                  className="mt-7 inline-flex items-center gap-2 text-[12px] font-medium text-white/45 transition-colors hover:text-white/75"
                >
                  View profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Editorial photo — constrained, not dominant */}
              <div className="relative mt-14 lg:mt-0 lg:w-[260px] xl:w-[300px]">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
                  <Image
                    src="/images/dj-hero.jpg"
                    alt="ANDRES:HERRERA"
                    fill
                    sizes="300px"
                    className="object-cover object-[center_15%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── */}
      {/* SECTION 5 — Closing CTA                    */}
      {/* ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Thin rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-20 sm:pt-28">

            <h2 className="max-w-sm text-[2rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.5rem]">
              <span className="block">One profile.</span>
              <span className="block text-white/38">Always current.</span>
            </h2>
            <div className="mt-4 h-px w-10 bg-accent/35" />

            <p className="mt-7 max-w-xs text-[15px] leading-[1.72] text-white/38">
              Update once. Everything stays ready for promoters, festivals
              and fans.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/andresherrera"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.10] px-6 text-[13px] font-medium text-white/55 transition-all duration-150 hover:border-white/[0.22] hover:text-white/85"
              >
                View Live Example
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
        </div>
      </section>

    </div>
  )
}
