import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"
import { resolveLegalArtistContext } from "@/lib/legal-artist-context"

export const metadata: Metadata = {
  title:       `Privacy — ${brand.name}`,
  description: `How personal data is collected and handled on artist websites powered by ${brand.name}.`,
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

export default async function PrivacyPage() {
  const artist = await resolveLegalArtistContext()

  const backLabel   = artist?.artistName ?? brand.name
  const subtitle    = artist
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
          Privacy
        </h1>
        <p className="mt-1.5 text-[13px] text-white/38">{subtitle}</p>
        <p className="mt-1.5 text-[12px] text-white/25">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 mb-9 border-t border-white/[0.07]" />

        {/* Intro */}
        <p className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-white/40">
          This page explains how personal data is collected and handled on this official artist
          website powered by {brand.name}. It is provided for informational purposes and is not
          legal advice.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <Section n={1} title="What We Collect">
            <p>
              <span className="font-semibold text-white/70">Stay Connected / Audience Signup.</span>{" "}
              When you submit your email through the Stay Connected form on this artist website, we
              collect your email address, the date and time of signup, the source of the signup, and
              limited technical information such as browser type, referral source, and a one-way
              cryptographic hash of your IP address for security and abuse prevention. Your IP address is not stored in a
              reversible form.
            </p>
            <p>
              <span className="font-semibold text-white/70">Booking Inquiries.</span>{" "}
              When you submit a booking inquiry, we may collect your name, email address, optional
              phone number, and event details such as date, city, venue, and any additional notes
              you provide. This information is used to deliver your inquiry to the artist or their
              team and to support communication about potential bookings.
            </p>
            <p>
              <span className="font-semibold text-white/70">Technical Information.</span>{" "}
              We may collect limited technical request information to help operate, secure, and
              improve the website.
            </p>
            <p>
              <span className="font-semibold text-white/70">What We Do Not Collect.</span>{" "}
              We do not collect payment information through this website. We do not collect data
              from your social media accounts. We do not track your activity across other websites.
              We do not build advertising profiles or sell personal data.
            </p>
          </Section>

          <Section n={2} title="How We Use Data">
            <p>
              Audience signup data is used to maintain an artist&apos;s audience list and, if you
              remain subscribed, to support occasional updates from that artist.
            </p>
            <p>
              Booking inquiry data is used to deliver your message to the artist or their team and
              to facilitate communication about potential engagements.
            </p>
            <p>
              Technical data is used for security monitoring, abuse prevention, reliability, and
              basic site performance measurement.
            </p>
          </Section>

          <Section n={3} title="Where Data Is Stored and Processed">
            <p>
              Audience signup data is stored in Supabase, the database provider used by{" "}
              {brand.name}.
            </p>
            <p>
              Booking inquiry data may be processed by {brand.name} and delivered by email through
              Resend, a transactional email provider. Depending on the artist website configuration,
              booking inquiry details may also be stored for operational purposes.
            </p>
            <p>
              Artist websites are hosted on Vercel.
            </p>
          </Section>

          <Section n={4} title="Third-Party Services">
            <p>
              We use the following third-party services to operate artist websites powered by {brand.name}:
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">
                      Service
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    ["Supabase",               "Database storage for audience and platform data"],
                    ["Resend",                 "Transactional email delivery for booking inquiries and platform notifications"],
                    ["Vercel",                 "Website hosting and content delivery"],
                    ["Vercel Analytics",       "Privacy-focused, aggregated website analytics — no persistent tracking cookies"],
                    ["Vercel Speed Insights",  "Website performance measurement — no user-identifiable tracking"],
                  ].map(([svc, purpose]) => (
                    <tr key={svc}>
                      <td className="px-4 py-3 font-medium text-white/60">{svc}</td>
                      <td className="px-4 py-3 text-white/42">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              We do not sell, trade, or rent your personal data.
            </p>
          </Section>

          <Section n={5} title="Your Choices and Rights">
            <p>
              You may request to be removed from an artist&apos;s audience list, ask for correction
              or deletion of your contact information, or ask what personal data is associated with
              your email address.
            </p>
            <p>
              To make a request, contact the artist using the booking or contact email shown on
              their profile, or contact {brand.name} directly.
            </p>
          </Section>

          <Section n={6} title="Data Retention">
            <p>
              Audience entries are retained until you request removal, unsubscribe, or are removed
              by the artist or their team.
            </p>
            <p>
              Booking inquiry data is retained only as needed for communication, operational needs,
              security, and reasonable business records.
            </p>
            <p>
              You may request deletion of your personal data at any time, subject to any legitimate
              operational or legal retention needs.
            </p>
          </Section>

          <Section n={7} title="Children">
            <p>
              This website is not intended for children under the age required by applicable law.
              We do not knowingly collect personal information from children. If you believe a
              child has submitted personal data through this site, please contact us so we can
              review and remove it.
            </p>
          </Section>

          <Section n={8} title="Changes to This Page">
            <p>
              We may update this page from time to time. The &ldquo;Last updated&rdquo; date above
              shows when it was most recently revised.
            </p>
          </Section>

          <Section n={9} title="Contact">
            {artist?.contactEmail && (
              <p>
                {artist.artistName} website contact:{" "}
                <a
                  href={`mailto:${artist.contactEmail}`}
                  className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
                >
                  {artist.contactEmail}
                </a>
              </p>
            )}
            <p>
              {brand.name} data requests:{" "}
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
          <Link href="/terms"   className={legalLinkClass}>Terms</Link>
          <Link href="/cookies" className={legalLinkClass}>Cookies</Link>
        </div>

      </div>
    </main>
  )
}
