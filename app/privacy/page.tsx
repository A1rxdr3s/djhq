import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"

export const metadata: Metadata = {
  title:       `Privacy — ${brand.name}`,
  description: `How ${brand.name} artist websites handle your personal data.`,
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

export default function PrivacyPage() {
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
          Privacy
        </h1>
        <p className="mt-2 text-[12px] text-white/28">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 mb-9 border-t border-white/[0.07]" />

        {/* Note */}
        <p className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-white/40">
          This page describes how data is collected and handled on artist websites powered by {brand.name}.
          It is provided for informational purposes and is not legal advice.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <Section n={1} title="What We Collect">
            <p>
              <span className="font-semibold text-white/70">Stay Connected (audience signup).</span>{" "}
              When you submit your email through the Stay Connected form on an artist profile, we collect
              your email address, the date and time of signup, the source of the signup, and basic
              technical information (browser type, a one-way cryptographic hash of your IP address) used
              solely for abuse prevention. Your IP address is not stored in a reversible form.
            </p>
            <p>
              <span className="font-semibold text-white/70">Booking inquiries.</span>{" "}
              When you submit a booking inquiry, we collect your name, email address, optional phone
              number, and event details including date, city, venue, and any additional notes you provide.
              Technical request information is collected for security monitoring only.
            </p>
            <p>
              <span className="font-semibold text-white/70">What we do not collect.</span>{" "}
              We do not collect payment information. We do not collect data from social media accounts.
              We do not track your activity across other websites. We do not build advertising profiles.
            </p>
          </Section>

          <Section n={2} title="How We Use It">
            <p>
              Audience data is used to maintain your subscription to an artist&apos;s audience list and,
              if you remain subscribed, to deliver occasional updates from that artist. Booking inquiry
              data is used to deliver your message to the artist or their team and to facilitate
              communication about potential engagements. Technical data is used solely for security
              monitoring and abuse prevention.
            </p>
          </Section>

          <Section n={3} title="Where Data Is Stored">
            <p>
              Audience and booking data is stored in Supabase, a cloud database platform with enterprise-grade
              security and infrastructure. Booking inquiry notifications may be delivered via Resend,
              a transactional email service. Artist websites are hosted on Vercel.
            </p>
          </Section>

          <Section n={4} title="Third-Party Services">
            <p>We work with the following third-party services to operate this platform:</p>
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
                    ["Supabase",          "Database storage for audience and booking data"],
                    ["Resend",            "Transactional email delivery for booking notifications"],
                    ["Vercel",            "Website hosting and content delivery"],
                    ["Vercel Analytics",  "Anonymous, aggregated website analytics — no personal data stored, no persistent tracking cookies"],
                    ["Vercel Speed Insights", "Performance measurement — no user-identifiable data"],
                  ].map(([svc, purpose]) => (
                    <tr key={svc}>
                      <td className="px-4 py-3 font-medium text-white/60">{svc}</td>
                      <td className="px-4 py-3 text-white/42">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              We do not sell, trade, or share your personal data with any other third parties.
            </p>
          </Section>

          <Section n={5} title="Your Rights">
            <p>
              You may at any time request removal from an artist&apos;s audience list, request
              correction or deletion of your contact information, or ask what data we hold about you.
              To make a data request, contact the artist using the booking or contact email shown on
              their profile, or contact {brand.name} directly.
            </p>
            <p>
              Data requests:{" "}
              <a
                href={`mailto:${brand.supportEmail}`}
                className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
              >
                {brand.supportEmail}
              </a>
            </p>
          </Section>

          <Section n={6} title="Data Retention">
            <p>
              Audience entries are retained until you request removal or are unsubscribed by the
              artist or their team. Booking inquiry data is retained as needed for communication
              and business records. You may request deletion of your data at any time.
            </p>
          </Section>

          <Section n={7} title="Children">
            <p>
              We do not knowingly collect personal information from children under 13. If you
              believe a child has submitted data to this site, please contact us for immediate removal.
            </p>
          </Section>

          <Section n={8} title="Changes">
            <p>
              This page may be updated. The date at the top reflects when it was last revised.
              Continued use of the site after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

        </div>

        {/* Bottom nav */}
        <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-7">
          <Link href="/"         className={legalLinkClass}>{brand.name}</Link>
          <Link href="/terms"    className={legalLinkClass}>Terms</Link>
          <Link href="/cookies"  className={legalLinkClass}>Cookies</Link>
        </div>

      </div>
    </main>
  )
}
