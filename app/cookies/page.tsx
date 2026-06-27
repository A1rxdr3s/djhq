import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"
import { resolveLegalArtistContext } from "@/lib/legal-artist-context"

export const metadata: Metadata = {
  title:       `Cookies — ${brand.name}`,
  description: `Cookie and analytics information for artist websites powered by ${brand.name}.`,
}

const LAST_UPDATED = "June 2026"

const legalLinkClass =
  "text-[11px] text-white/28 transition-colors duration-150 hover:text-white/55"

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
        {n}. {title}
      </h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-white/58">
        {children}
      </div>
    </section>
  )
}

export default async function CookiesPage() {
  const artist = await resolveLegalArtistContext()

  const backLabel = artist?.artistName ?? brand.name
  const subtitle  = artist
    ? `${artist.artistName} is powered by ${brand.name}.`
    : `Artist websites powered by ${brand.name}.`

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-[680px] px-6 pb-20 pt-10 sm:pt-14">

        {/* Back nav */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30 transition-colors duration-150 hover:text-white/60"
        >
          <ArrowLeft className="h-3 w-3" />
          {backLabel}
        </Link>

        {/* Header */}
        {artist && (
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/22">
            Official Artist Website
          </p>
        )}
        <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-white/90 sm:text-[40px]">
          Cookies
        </h1>
        <p className="mt-1.5 text-[13px] text-white/38">{subtitle}</p>
        <p className="mt-1.5 text-[12px] text-white/25">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 mb-9 border-t border-white/[0.07]" />

        {/* Summary callout */}
        <div className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-[13px] font-semibold text-white/62">Short answer</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/42">
            No persistent marketing or cross-site tracking cookies are currently used by this
            website. No cookie consent banner is shown because no non-essential tracking cookies
            are in use.
          </p>
        </div>

        <div className="space-y-10">

          <Section n={1} title="What Are Cookies">
            <p>
              Cookies are small text files or similar technical storage mechanisms that a website
              may place on your device. They can be used for authentication, session management,
              preferences, analytics, and advertising. Not all cookies require consent — session-
              critical and technically necessary storage is generally exempt under most privacy
              regulations.
            </p>
          </Section>

          <Section n={2} title="What This Website Uses">
            <p>
              This website currently uses only the following technologies:
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">
                      Technology
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">
                      Purpose
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">
                      Persistent tracking
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Vercel Analytics</td>
                    <td className="px-4 py-3 text-white/42">
                      Anonymous, aggregated page view and visit statistics. Privacy-focused.
                      No cross-site tracking.
                    </td>
                    <td className="px-4 py-3 text-white/35">No</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Vercel Speed Insights</td>
                    <td className="px-4 py-3 text-white/42">
                      Measures page load performance using Web Vitals data. No
                      user-identifiable information collected.
                    </td>
                    <td className="px-4 py-3 text-white/35">No</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Authentication (HQ only)</td>
                    <td className="px-4 py-3 text-white/42">
                      Session storage used for artist dashboard login. Only active when
                      you sign in to the management area — not set on public pages.
                    </td>
                    <td className="px-4 py-3 text-white/35">Necessary</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section n={3} title="What We Do Not Use">
            <p>This website does not currently use any of the following:</p>
            <ul className="mt-2 space-y-1.5 pl-4">
              {[
                "Google Analytics or Google Tag Manager",
                "Meta (Facebook) Pixel",
                "TikTok Pixel",
                "Advertising or retargeting cookies",
                "Cross-site user tracking",
                "Third-party marketing pixels",
                "Session recording tools (e.g. Hotjar, FullStory)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section n={4} title="Vercel Analytics — Privacy Details">
            <p>
              Vercel Analytics uses a privacy-first model that does not rely on cookies or
              browser fingerprinting to identify individual visitors. Visitor counts use
              an aggregation approach that does not store or transmit personally identifiable
              information. It is designed for GDPR and CCPA compliance without requiring a
              cookie consent banner.
            </p>
          </Section>

          <Section n={5} title="Your Controls">
            <p>
              Because this website does not set persistent marketing or tracking cookies, no
              cookie preferences panel is required. You may restrict cookies via your browser
              settings without affecting your ability to view the public portions of this site.
              The artist management area (HQ) requires session storage to function.
            </p>
          </Section>

          <Section n={6} title="Changes">
            <p>
              If additional analytics tools or technologies that set persistent cookies are added
              in the future, this page will be updated and a consent mechanism will be introduced
              if required by applicable law or regulation.
            </p>
          </Section>

          <Section n={7} title="Questions">
            <p>
              Questions about this page:{" "}
              <a
                href={`mailto:${brand.supportEmail}`}
                className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
              >
                {brand.supportEmail}
              </a>
            </p>
          </Section>

        </div>

        {/* Bottom nav */}
        <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-7">
          <Link href="/"        className={legalLinkClass}>{brand.name}</Link>
          <Link href="/privacy" className={legalLinkClass}>Privacy</Link>
          <Link href="/terms"   className={legalLinkClass}>Terms</Link>
        </div>

      </div>
    </main>
  )
}
