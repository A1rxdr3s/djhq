import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"

export const metadata: Metadata = {
  title:       `Cookies — ${brand.name}`,
  description: `How ${brand.name} artist websites use cookies and similar technologies.`,
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

export default function CookiesPage() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-[680px] px-6 pb-20 pt-10 sm:pt-14">

        {/* Back nav */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30 transition-colors duration-150 hover:text-white/60"
        >
          <ArrowLeft className="h-3 w-3" />
          {brand.name}
        </Link>

        {/* Header */}
        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/22">Legal</p>
        <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-white/90 sm:text-[40px]">
          Cookies
        </h1>
        <p className="mt-2 text-[12px] text-white/28">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 mb-9 border-t border-white/[0.07]" />

        {/* Summary callout */}
        <div className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-[13px] font-semibold text-white/62">Short answer</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/42">
            This site does not use advertising cookies, third-party tracking cookies, or
            persistent user-identification cookies. No cookie consent banner is required.
          </p>
        </div>

        <div className="space-y-10">

          <Section n={1} title="What Are Cookies">
            <p>
              Cookies are small text files stored on your device by a website. They can be used
              for authentication, session management, preferences, analytics, and advertising.
              Not all cookies require your consent — session-critical and technically necessary
              cookies are generally exempt under most privacy regulations.
            </p>
          </Section>

          <Section n={2} title="What This Site Uses">
            <p>
              This website uses only the following technologies:
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
                      Cookies set
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Vercel Analytics</td>
                    <td className="px-4 py-3 text-white/42">
                      Anonymous, aggregated page view and visit statistics. No personal data
                      is stored. No cross-site tracking.
                    </td>
                    <td className="px-4 py-3 text-white/35">None</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Vercel Speed Insights</td>
                    <td className="px-4 py-3 text-white/42">
                      Measures page load performance using anonymous Web Vitals data.
                      No user-identifiable information is collected.
                    </td>
                    <td className="px-4 py-3 text-white/35">None</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white/60">Authentication (HQ only)</td>
                    <td className="px-4 py-3 text-white/42">
                      Session cookies used for artist dashboard login. Only set when
                      you sign in to the artist management area — not on public pages.
                    </td>
                    <td className="px-4 py-3 text-white/35">Session (necessary)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section n={3} title="What We Do Not Use">
            <p>We do not use any of the following:</p>
            <ul className="mt-2 space-y-1.5 pl-4">
              {[
                "Google Analytics or Google Tag Manager",
                "Meta (Facebook) Pixel",
                "TikTok Pixel",
                "Advertising or retargeting cookies",
                "Cross-site user tracking",
                "Third-party marketing pixels",
                "Cookie-based A/B testing platforms",
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
              browser fingerprinting to identify unique visitors. It counts visitors using
              an aggregation technique that does not store or transmit personally identifiable
              information. It is compliant with GDPR and CCPA without requiring a cookie
              consent banner.
            </p>
          </Section>

          <Section n={5} title="Your Controls">
            <p>
              Because this site does not set persistent tracking cookies, no cookie preferences
              panel is needed. You may block all cookies via your browser settings without
              affecting your ability to use the public portions of this site. The artist
              management area (HQ) requires session cookies to function.
            </p>
          </Section>

          <Section n={6} title="Changes">
            <p>
              If we add analytics tools or other technologies that set cookies in the future,
              this page will be updated and a cookie consent mechanism will be added if required.
            </p>
          </Section>

          <Section n={7} title="Questions">
            <p>
              Questions about this cookie policy:{" "}
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
