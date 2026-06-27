import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"
import { resolveLegalArtistContext } from "@/lib/legal-artist-context"

export const metadata: Metadata = {
  title:       `Terms — ${brand.name}`,
  description: `Terms of use for artist websites powered by ${brand.name}.`,
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

export default async function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mt-1.5 text-[13px] text-white/38">{subtitle}</p>
        <p className="mt-1.5 text-[12px] text-white/25">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 mb-9 border-t border-white/[0.07]" />

        {/* Intro */}
        <p className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-white/40">
          By using this artist website you agree to the following terms. This website is an
          official artist presence powered by {brand.name}, which provides the underlying
          technical platform.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <Section n={1} title="Use of This Website">
            <p>
              This website is an official artist presence powered by {brand.name}. You may view,
              download for personal use, and share links to this website. You may not scrape, copy,
              republish, or reproduce content from this site for commercial purposes without prior
              written permission from the artist or their representatives.
            </p>
          </Section>

          <Section n={2} title="Content Ownership">
            <p>
              All artist content on this website — including name, likeness, biography, photos,
              logos, music, and related creative assets — remains the property of the artist or
              their respective rights holders. {brand.name} does not claim ownership of artist
              content.
            </p>
            <p>
              Press and editorial assets provided via the Press Kit section are made available for
              legitimate press, booking, and promotional use only. They may not be used for
              commercial purposes, altered to misrepresent the artist, or republished out of
              context.
            </p>
          </Section>

          <Section n={3} title="Booking Inquiries">
            <p>
              Submitting a booking inquiry through this website does not guarantee a booking,
              commitment, or response. Inquiries are forwarded to the artist or their team for
              review. Availability, pricing, and terms are determined solely by the artist or
              their representatives.
            </p>
          </Section>

          <Section n={4} title="Audience Signup">
            <p>
              Subscribing via the Stay Connected form adds your email address to the artist&apos;s
              audience list. You may unsubscribe at any time by contacting the artist or by
              submitting a data request via our{" "}
              <Link href="/privacy" className="text-white/60 underline decoration-white/20 underline-offset-2 hover:text-white/80">
                Privacy
              </Link>{" "}
              page. Subscribing does not constitute a commercial relationship or entitle you to
              any services or products.
            </p>
          </Section>

          <Section n={5} title="External Links">
            <p>
              This website may contain links to third-party platforms including Spotify, SoundCloud,
              Apple Music, Beatport, YouTube, Instagram, TikTok, and others. These are independent
              services with their own terms and privacy policies. {brand.name} and the artist are
              not responsible for the content or practices of external platforms.
            </p>
          </Section>

          <Section n={6} title="Platform Provider">
            <p>
              {brand.name} provides the technical platform, hosting infrastructure, and tooling
              that powers this artist website. {brand.name} is not a party to booking agreements
              or fan communications between you and the artist or their team.
            </p>
          </Section>

          <Section n={7} title="Site Availability">
            <p>
              This website may be updated, modified, taken offline temporarily, or permanently
              discontinued at any time. {brand.name} provides this service on an &ldquo;as
              available&rdquo; basis and makes no guarantee of continuous uptime or availability.
            </p>
          </Section>

          <Section n={8} title="Disclaimer">
            <p>
              This website is provided as-is. To the fullest extent permitted by applicable law,
              {" "}{brand.name} and the artist disclaim all warranties and liability for any loss,
              damage, or harm resulting from your use of this site.
            </p>
          </Section>

          <Section n={9} title="Changes">
            <p>
              These terms may be updated from time to time. The date at the top reflects the most
              recent revision. Continued use of this website after changes constitutes your
              acceptance of the updated terms.
            </p>
          </Section>

          <Section n={10} title="Contact">
            {artist?.contactEmail && (
              <p>
                {artist.artistName} contact:{" "}
                <a
                  href={`mailto:${artist.contactEmail}`}
                  className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
                >
                  {artist.contactEmail}
                </a>
              </p>
            )}
            <p>
              {brand.name} support:{" "}
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
          <Link href="/cookies" className={legalLinkClass}>Cookies</Link>
        </div>

      </div>
    </main>
  )
}
