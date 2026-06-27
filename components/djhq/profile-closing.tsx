"use client"

import { Radio, Music2, Play, Youtube, Instagram, Music, Globe, Link2, Calendar } from "lucide-react"
import Link from "next/link"
import { resolveSafeHref } from "@/lib/safe-url"
import { brand } from "@/lib/brand"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"
import type { SocialLink, SocialPlatform } from "@/types/djhq"
import type { LucideIcon } from "lucide-react"

const SOCIAL_ICONS: Partial<Record<SocialPlatform, LucideIcon>> = {
  spotify:            Radio,
  beatport:           Music2,
  soundcloud:         Play,
  youtube:            Youtube,
  instagram:          Instagram,
  tiktok:             Music,
  "resident-advisor": Globe,
  bandsintown:        Calendar,
  website:            Globe,
  other:              Link2,
}

type Props = {
  artistName: string
  location?: string
  bookingEmail: string
  isPro: boolean
  genres?: string[]
  socialLinks?: SocialLink[]
  hasPressKit?: boolean
  pressKitHref?: string | null
  artistHandle?: string
  heroLogoUrl?: string | null
  heroIdentityMode?: string
  footerLogoUrl?: string | null
  footerLogoMode?: "auto" | "light" | "dark"
  footerLogoWidth?: number
  footerBookingEmail?: string | null
  footerContactEmail?: string | null
  footerDemosEmail?: string | null
  footerNewsletterEnabled?: boolean
  footerSocialsEnabled?: boolean
  footerCopyright?: string | null
}

export function ProfileClosing({
  artistName,
  location,
  bookingEmail,
  isPro,
  genres,
  socialLinks = [],
  hasPressKit = false,
  pressKitHref = null,
  artistHandle,
  heroLogoUrl,
  heroIdentityMode,
  footerLogoUrl,
  footerLogoMode = "auto",
  footerLogoWidth = 120,
  footerBookingEmail,
  footerContactEmail,
  footerDemosEmail,
  footerNewsletterEnabled = true,
  footerSocialsEnabled = true,
  footerCopyright,
}: Props) {
  const year = new Date().getFullYear()

  const resolvedLogoUrl =
    footerLogoUrl?.trim() ||
    ((heroIdentityMode === "logo" || heroIdentityMode === "both") && heroLogoUrl?.trim()
      ? heroLogoUrl.trim()
      : null)

  const logoFilter: string | undefined =
    footerLogoMode === "light" ? "brightness(0) invert(1)" : undefined

  const contacts: { label: string; email: string }[] = [
    (footerBookingEmail?.trim() || bookingEmail?.trim())
      ? { label: "Booking", email: (footerBookingEmail?.trim() || bookingEmail?.trim()) as string }
      : null,
    footerContactEmail?.trim() ? { label: "Contact", email: footerContactEmail.trim() } : null,
    footerDemosEmail?.trim()   ? { label: "Demos",   email: footerDemosEmail.trim() }   : null,
  ].filter(Boolean) as { label: string; email: string }[]

  const copyrightLine = footerCopyright?.trim() || `© ${year} ${artistName}`

  const iconLinks = socialLinks
    .filter((l) => l.url.trim().length > 0)
    .slice(0, 6)
    .map((l) => ({
      platform: l.platform,
      url:      l.url,
      label:    l.label,
      href:     resolveSafeHref(l.url),
      Icon:     SOCIAL_ICONS[l.platform],
    }))
    .filter((l): l is typeof l & { href: string; Icon: LucideIcon } =>
      l.href !== null && l.Icon !== undefined,
    )

  // Identity descriptor — genre tags (max 3) and/or location.
  // Falls back to "Official artist website" so the column is never empty.
  const genreLabel   = genres?.length ? genres.slice(0, 3).join(' · ') : null
  const locationLabel = location?.trim() || null
  const officialDescriptor = !genreLabel && !locationLabel ? 'Official artist website' : null

  const headingClass = "mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-white/35"

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      <div className="py-8 sm:hidden">

        {/* 1. Identity: logo / name */}
        {resolvedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogoUrl}
            alt={artistName}
            style={{ maxWidth: `${Math.min(footerLogoWidth, 160)}px`, filter: logoFilter }}
            className="max-h-[38px] object-contain opacity-80"
          />
        ) : (
          <p className="text-[14px] font-bold uppercase tracking-[0.14em] text-white/75">{artistName}</p>
        )}

        {/* Genre / location descriptor */}
        {genreLabel && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent/60">
            {genreLabel}
          </p>
        )}
        {locationLabel && (
          <p className="mt-1 text-[11px] text-white/36">{locationLabel}</p>
        )}
        {officialDescriptor && (
          <p className="mt-2 text-[11px] text-white/32">{officialDescriptor}</p>
        )}

        {/* Divider */}
        <div className="mt-6 border-t border-white/[0.05]" />

        {/* 2. Booking */}
        {contacts[0] && (
          <div className="mt-5">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/28">
              {contacts[0].label}
            </p>
            <a
              href={resolveSafeHref(`mailto:${contacts[0].email}`) ?? "#"}
              className="text-[13px] text-white/72 transition-colors duration-200 hover:text-white/92"
            >
              {contacts[0].email}
            </a>
            {contacts.slice(1).map(({ label, email: addr }) => (
              <div key={label} className="mt-2">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">{label}</p>
                <a
                  href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                  className="text-[13px] text-white/60 transition-colors duration-200 hover:text-white/85"
                >
                  {addr}
                </a>
              </div>
            ))}
            {artistHandle && (
              <div className="mt-4">
                <BookingInquiryModal
                  artistHandle={artistHandle}
                  artistName={artistName}
                  pressKitUrl={pressKitHref ?? undefined}
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Connect */}
        {footerSocialsEnabled && iconLinks.length > 0 && (
          <div className="mt-7">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.24em] text-white/28">Connect</p>
            <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3">
              {iconLinks.map(({ platform, url, label, href, Icon }) => (
                <a
                  key={`m-${platform}-${url}`}
                  href={href}
                  aria-label={label}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/55 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                >
                  <Icon className="h-[22px] w-[22px]" />
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
      {/* ── end mobile ───────────────────────────────────────────────── */}

      {/* ── Desktop editorial grid ───────────────────────────────────── */}
      <div className="hidden sm:grid sm:grid-cols-[2fr_1.2fr] sm:items-start sm:gap-x-12 sm:py-10 lg:gap-x-20 lg:py-12">

        {/* Col 1: Artist identity */}
        <div className="max-w-[440px]">
          {resolvedLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedLogoUrl}
              alt={artistName}
              style={{ maxWidth: `${Math.min(footerLogoWidth, 180)}px`, filter: logoFilter }}
              className="max-h-[52px] object-contain opacity-82"
            />
          ) : (
            <p className="text-[15px] font-bold uppercase tracking-[0.14em] text-white/75">{artistName}</p>
          )}

          {/* Genre descriptor */}
          {genreLabel && (
            <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent/55">
              {genreLabel}
            </p>
          )}

          {/* Location */}
          {locationLabel && (
            <p className="mt-1.5 text-[12px] text-white/34">{locationLabel}</p>
          )}

          {/* Fallback descriptor */}
          {officialDescriptor && (
            <p className="mt-3 text-[12px] text-white/30">{officialDescriptor}</p>
          )}
        </div>

        {/* Col 2: Booking + Connect */}
        <div className="space-y-8">
          {contacts.length > 0 && (
            <div>
              <p className={headingClass}>Booking</p>
              <p className="mb-3 text-[11px] leading-[1.6] text-white/28">
                For bookings, press, and professional inquiries.
              </p>
              <div className="space-y-3">
                {contacts.map(({ label, email: addr }) => (
                  <div key={label}>
                    {contacts.length > 1 && (
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">{label}</p>
                    )}
                    <a
                      href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                      className="text-[13px] text-white/72 transition-colors duration-200 hover:text-white/92"
                    >
                      {addr}
                    </a>
                  </div>
                ))}
              </div>
              {artistHandle && (
                <div className="mt-5">
                  <BookingInquiryModal
                    artistHandle={artistHandle}
                    artistName={artistName}
                    pressKitUrl={pressKitHref ?? undefined}
                  />
                </div>
              )}
            </div>
          )}

          {footerSocialsEnabled && iconLinks.length > 0 && (
            <div>
              <p className={headingClass}>Connect</p>
              <div className="flex flex-wrap gap-4">
                {iconLinks.map(({ platform, url, label, href, Icon }) => (
                  <a
                    key={`foot-${platform}-${url}`}
                    href={href}
                    aria-label={label}
                    title={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/55 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                  >
                    <Icon className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
      {/* ── end desktop grid ─────────────────────────────────────────── */}

      {/* ── Bottom utility bar (all sizes) ──────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 sm:py-5">
        <div className="flex flex-wrap items-center">
          <span className="whitespace-nowrap text-[11px] text-white/48">
            {copyrightLine}
            {!isPro && (
              <>
                {" · "}
                <Link href="/" className="transition-colors duration-150 hover:text-white/58">
                  {brand.copy.poweredBy}
                </Link>
              </>
            )}
          </span>
        </div>
      </div>

    </footer>
  )
}
