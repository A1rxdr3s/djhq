import Link from "next/link"
import { brand } from "@/lib/brand"

// ── Types ──────────────────────────────────────────────────────────────────

export type LegalArtist = {
  artistName: string
  contactEmail: string | null
}

type LegalType = "privacy" | "terms" | "cookies"

type Props = {
  type: LegalType
  artist?: LegalArtist | null
  inModal?: boolean
}

// ── Shared helpers ─────────────────────────────────────────────────────────

const LAST_UPDATED = "June 2026"

const TITLE_MAP: Record<LegalType, string> = {
  privacy: "Privacy",
  terms:   "Terms of Use",
  cookies: "Cookies",
}

const BOTTOM_NAV: Record<LegalType, [string, string][]> = {
  privacy: [["Terms", "/terms"],   ["Cookies", "/cookies"]],
  terms:   [["Privacy", "/privacy"], ["Cookies", "/cookies"]],
  cookies: [["Privacy", "/privacy"], ["Terms", "/terms"]],
}

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

// ── Privacy body ───────────────────────────────────────────────────────────

function PrivacyBody({ artist }: { artist?: LegalArtist | null }) {
  return (
    <>
      <p className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-white/40">
        This page explains how personal data is collected and handled on this official artist
        website powered by {brand.name}. It is provided for informational purposes and is not
        legal advice.
      </p>

      <div className="space-y-10">

        <Section n={1} title="What We Collect">
          <p>
            <span className="font-semibold text-white/70">Stay Connected / Audience Signup.</span>{" "}
            When you submit your email through the Stay Connected form on this artist website, we
            collect your email address, the date and time of signup, the source of the signup, and
            limited technical information such as browser type, referral source, and a one-way
            cryptographic hash of your IP address for security and abuse prevention. Your IP address
            is not stored in a reversible form.
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
          <p>Artist websites are hosted on Vercel.</p>
        </Section>

        <Section n={4} title="Third-Party Services">
          <p>
            We use the following third-party services to operate artist websites powered by{" "}
            {brand.name}:
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
                  ["Supabase",              "Database storage for audience and platform data"],
                  ["Resend",                "Transactional email delivery for booking inquiries and platform notifications"],
                  ["Vercel",                "Website hosting and content delivery"],
                  ["Vercel Analytics",      "Privacy-focused, aggregated website analytics — no persistent tracking cookies"],
                  ["Vercel Speed Insights", "Website performance measurement — no user-identifiable tracking"],
                ].map(([svc, purpose]) => (
                  <tr key={svc}>
                    <td className="px-4 py-3 font-medium text-white/60">{svc}</td>
                    <td className="px-4 py-3 text-white/42">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2">We do not sell, trade, or rent your personal data.</p>
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
            {brand.name}{" "}data requests:{" "}
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
            >
              {brand.supportEmail}
            </a>
          </p>
        </Section>

      </div>
    </>
  )
}

// ── Terms body ─────────────────────────────────────────────────────────────

function TermsBody({ artist }: { artist?: LegalArtist | null }) {
  return (
    <>
      <p className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-white/40">
        By using this artist website, you agree to the following terms. This website is an
        official artist presence powered by {brand.name}, which provides the underlying
        technical platform.
      </p>

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
            <Link
              href="/privacy"
              className="text-white/60 underline decoration-white/20 underline-offset-2 hover:text-white/80"
            >
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
            This artist website is powered by {brand.name}, which provides the technical
            platform, hosting infrastructure, and underlying tooling.
          </p>
          <p>
            As a platform provider, {brand.name} is not a party to booking agreements, event
            contracts, fan communications, press arrangements, or other direct relationships
            between you and the artist or their team.
          </p>
        </Section>

        <Section n={7} title="Site Availability">
          <p>
            This website may be updated, modified, taken offline temporarily, or permanently
            discontinued at any time.
          </p>
          <p>
            This website is provided on an &ldquo;as available&rdquo; basis.{" "}
            {brand.name} does not guarantee continuous uptime, availability, or error-free
            operation.
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
            {brand.name}{" "}support:{" "}
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors duration-150 hover:text-white/80"
            >
              {brand.supportEmail}
            </a>
          </p>
        </Section>

      </div>
    </>
  )
}

// ── Cookies body ───────────────────────────────────────────────────────────

function CookiesBody() {
  return (
    <>
      <div className="mb-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <p className="text-[13px] font-semibold text-white/62">Summary</p>
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
            preferences, analytics, and advertising. Some strictly necessary technologies may be
            used without a separate consent banner when they are required for the website to
            function.
          </p>
        </Section>

        <Section n={2} title="What This Website Uses">
          <p>This website currently uses only the following technologies:</p>
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
                    Measures page load performance using Web Vitals data. No user-identifiable
                    information collected.
                  </td>
                  <td className="px-4 py-3 text-white/35">No</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">
                    Authentication / session storage (HQ only)
                  </td>
                  <td className="px-4 py-3 text-white/42">
                    Used only when an artist or team member signs in to the management area.
                    Not required for normal public browsing.
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
            information. It is designed to support privacy-friendly analytics without using
            persistent tracking cookies.
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
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export function LegalContent({ type, artist, inModal = false }: Props) {
  const subtitle = artist
    ? `${artist.artistName} is powered by ${brand.name}.`
    : `Artist websites powered by ${brand.name}.`

  return (
    <div>
      {/* Full-page header — hidden in modal (modal title bar handles the title) */}
      {!inModal ? (
        <>
          {artist && (
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/22">
              Official Artist Website
            </p>
          )}
          <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-white/90 sm:text-[40px]">
            {TITLE_MAP[type]}
          </h1>
          <p className="mt-1.5 text-[13px] text-white/38">{subtitle}</p>
          <p className="mt-1.5 text-[12px] text-white/25">Last updated {LAST_UPDATED}</p>
          <div className="mt-8 mb-9 border-t border-white/[0.07]" />
        </>
      ) : (
        <>
          <p className="text-[13px] text-white/38">{subtitle}</p>
          <p className="mt-1 text-[12px] text-white/25">Last updated {LAST_UPDATED}</p>
          <div className="mt-6 mb-8 border-t border-white/[0.07]" />
        </>
      )}

      {/* Body */}
      {type === "privacy" && <PrivacyBody artist={artist} />}
      {type === "terms"   && <TermsBody   artist={artist} />}
      {type === "cookies" && <CookiesBody />}

      {/* Bottom nav — direct pages only */}
      {!inModal && (
        <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-7">
          <Link href="/" className={legalLinkClass}>{brand.name}</Link>
          {BOTTOM_NAV[type].map(([label, href]) => (
            <Link key={label} href={href} className={legalLinkClass}>{label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}
