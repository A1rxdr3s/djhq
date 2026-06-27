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
          By using this artist website, you agree to the following terms. This website is an
          official artist presence powered by {brand.name}, which provides the underlying
          technical platform.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <Section n={1} title="Use of This Website">
            <p>
              This website is an official artist presence powered by {brand.name}. You may view
              this website and share links to it.
            </p>
            <p>
              You may not scrape, copy, republish, reproduce, or commercially exploit content from
              this site without prior written permission from the artist, their representatives, or
              the relevant rights holders.
            </p>
          </Section>

          <Section n={2} title="Content Ownership">
            <p>
              All artist content on this website — including name, likeness, biography, photos,
              logos, music references, and related creative assets — remains the property of the
              artist or their respective rights holders. {brand.name} does not claim ownership of
              artist content.
            </p>
            <p>
              Press and editorial assets provided through the Press Kit section are made available
              for legitimate press, booking, editorial, and promotional use only. They may not be
              used for unrelated commercial purposes, altered to misrepresent the artist, or
              republished out of context.
            </p>
          </Section>

          <Section n={3} title="Booking Inquiries">
            <p>
              Submitting a booking inquiry through this website does not guarantee a booking,
              commitment, availability, pricing, or response.
            </p>
            <p>
              Inquiries are forwarded to the artist or their team for review. Availability,
              pricing, technical requirements, and booking terms are determined solely by the
              artist or their representatives.
            </p>
          </Section>

          <Section n={4} title="Audience Signup">
            <p>
              Subscribing through the Stay Connected form adds your email address to the
              artist&apos;s audience list. You may request removal from that list at any time by
              contacting the artist or by submitting a data request through the{" "}
              <Link href="/privacy" className="text-white/60 underline decoration-white/20 underline-offset-2 hover:text-white/80">
                Privacy
              </Link>{" "}
              page.
            </p>
            <p>
              Subscribing does not create a commercial relationship and does not entitle you to any
              products, services, tickets, guest list access, or other benefits unless explicitly
              stated by the artist or their team.
            </p>
          </Section>

          <Section n={5} title="External Links">
            <p>
              This website may contain links to third-party platforms including Spotify, SoundCloud,
              Apple Music, Beatport, YouTube, Instagram, TikTok, and others.
            </p>
            <p>
              These are independent services with their own terms and privacy policies.{" "}
              {brand.name} and the artist are not responsible for the content, availability,
              policies, or practices of external platforms.
            </p>
          </Section>

          <Section n={6} title="Platform Provider">
            <p>
              {brand.name} provides the technical platform, hosting infrastructure, and tooling
              that powers this artist website.
            </p>
            <p>
              {brand.name} is not a party to booking agreements, event contracts, fan
              communications, press arrangements, or other direct relationships between you and the
              artist or their team.
            </p>
          </Section>

          <Section n={7} title="Site Availability">
            <p>
              This website may be updated, modified, taken offline temporarily, or permanently
              discontinued at any time.
            </p>
            <p>
              {brand.name} provides this website on an &ldquo;as available&rdquo; basis and does
              not guarantee continuous uptime, availability, or error-free operation.
            </p>
          </Section>

          <Section n={8} title="Disclaimer">
            <p>
              This website is provided for informational and promotional purposes. To the fullest
              extent permitted by applicable law, {brand.name} and the artist disclaim warranties
              related to the website and are not responsible for losses or damages resulting from
              your use of, or inability to use, the site.
            </p>
            <p>
              Nothing on this website should be interpreted as a guaranteed offer, confirmed
              booking, endorsement, or contractual commitment unless separately agreed in writing
              by the relevant parties.
            </p>
          </Section>

          <Section n={9} title="Changes to These Terms">
            <p>
              These terms may be updated from time to time. The &ldquo;Last updated&rdquo; date
              above shows when they were most recently revised.
            </p>
          </Section>

          <Section n={10} title="Contact">
            {artist?.contactEmail && (
              <p>
                {artist.artistName ? `${artist.artistName} contact` : "Artist website contact"}:{" "}
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
