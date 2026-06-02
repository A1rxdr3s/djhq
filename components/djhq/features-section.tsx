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
  { num: "01", name: "Releases",  desc: "Latest music, labels and streaming links." },
  { num: "02", name: "Shows",     desc: "Upcoming gigs and performance history." },
  { num: "03", name: "Videos",    desc: "Live recordings and artist content." },
  { num: "04", name: "Press Kit", desc: "Bio, photos and technical information." },
  { num: "05", name: "Booking",   desc: "Management and inquiries." },
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

      {/* ── Problem ── */}
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-7 sm:pt-8 lg:grid lg:grid-cols-2 lg:gap-16">

            <div>
              <h2 className="max-w-sm text-[1.6rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2rem]">
                Artists don&apos;t need<br />
                five different links.
              </h2>

              <ul className="mt-5 space-y-0">
                {fragments.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 border-b border-white/[0.04] py-1.5"
                  >
                    <span className="font-mono text-[10px] text-white/20">×</span>
                    <span className="text-[0.9rem] font-semibold text-white/20 line-through decoration-white/[0.10] decoration-1">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-col justify-center lg:mt-0">
              <p className="max-w-sm text-[14px] leading-[1.7] text-white/40">
                Promoters, clubs, labels and festivals should find everything
                in one place. Not scattered across six different links and
                email threads.
              </p>
              <p className="mt-3 text-[14px] text-white/40">
                One URL. Everything current.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-7 sm:pt-8">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/28">
              What&apos;s included
            </p>

            <div className="mt-4">
              {contentBlocks.map((block) => (
                <div
                  key={block.num}
                  className="grid border-t border-white/[0.04] py-2 sm:grid-cols-[3rem_10rem_1fr] sm:items-center sm:gap-8"
                >
                  <span className="font-mono text-[9px] tracking-[0.20em] text-white/18 max-sm:hidden">
                    {block.num}
                  </span>
                  <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-foreground/85">
                    {block.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-white/35 sm:mt-0">
                    {block.desc}
                  </p>
                </div>
              ))}
              <div className="h-px bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof ── */}
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-7 sm:pt-8">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent/50">
              A working example
            </p>

            <div className="mt-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">

              <div>
                <h2 className="text-[2.5rem] font-black uppercase leading-[0.95] tracking-[-0.03em] text-foreground sm:text-[3.25rem] lg:text-[3.75rem]">
                  ANDRES:<br />HERRERA
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/[0.05] pt-5 sm:grid-cols-4">
                  {metrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-[1.65rem] font-black leading-none tracking-[-0.02em] text-foreground sm:text-[1.9rem]">
                        {m.value}
                      </p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 max-w-md text-[13px] leading-[1.7] text-white/40">
                  One public profile centralizes everything that promoters,
                  venues and fans need — releases, shows, press assets and
                  booking contact. All current, all in one URL.
                </p>

                <Link
                  href="/andresherrera"
                  className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-white/45 transition-colors hover:text-white/75"
                >
                  View profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="relative mt-8 lg:mt-0 lg:w-[200px] xl:w-[240px]">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
                  <Image
                    src="/images/dj-hero.jpg"
                    alt="ANDRES:HERRERA"
                    fill
                    sizes="240px"
                    className="object-cover object-[center_15%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-8 pt-8 sm:pb-10 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="pt-7 sm:pt-8">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent/50">
              DJHQ
            </p>

            <h2 className="mt-3 max-w-sm text-[1.6rem] font-black leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[1.9rem]">
              <span className="block">One profile.</span>
              <span className="block text-white/38">Always current.</span>
            </h2>
            <div className="mt-2.5 h-px w-9 bg-accent/35" />

            <p className="mt-4 max-w-xs text-[13px] leading-[1.6] text-white/38">
              Update once. Everything stays ready for promoters, festivals
              and fans.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/andresherrera"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.10] px-5 text-[13px] font-medium text-white/55 transition-all duration-150 hover:border-white/[0.22] hover:text-white/85"
              >
                View Live Example
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="mailto:access@djhq.co"
                className="inline-flex h-10 items-center rounded-full bg-accent px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
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
