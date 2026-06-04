"use client"

import { useState, type FormEvent } from "react"
import { Radio, Music2, Play, Youtube, Instagram, Music, Globe, Link2, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { resolveSafeHref } from "@/lib/safe-url"
import { brand } from "@/lib/brand"
import type { SocialLink, SocialPlatform } from "@/types/djhq"
import type { LucideIcon } from "lucide-react"

const SOCIAL_ICONS: Partial<Record<SocialPlatform, LucideIcon>> = {
  spotify:          Radio,
  beatport:         Music2,
  soundcloud:       Play,
  youtube:          Youtube,
  instagram:        Instagram,
  tiktok:           Music,
  "resident-advisor": Globe,
  bandsintown:      Calendar,
  website:          Globe,
  other:            Link2,
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
  // Footer-specific branding fields
  footerLogoUrl?: string | null
  footerLogoWidth?: number
  footerBookingEmail?: string | null
  footerNewsletterEnabled?: boolean
  footerSocialsEnabled?: boolean
  footerCopyright?: string | null
}

export function ProfileClosing({
  artistName,
  bookingEmail,
  isPro,
  socialLinks = [],
  heroLogoUrl,
  heroIdentityMode,
  footerLogoUrl,
  footerLogoWidth = 180,
  footerBookingEmail,
  footerNewsletterEnabled = true,
  footerSocialsEnabled = true,
  footerCopyright,
}: Props) {
  const [email, setEmail]   = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error")
      return
    }
    setStatus("loading")
    setTimeout(() => setStatus("success"), 750)
  }

  const year = new Date().getFullYear()

  // Resolve which logo to show: footer-specific → hero logo → artist name text
  const resolvedLogoUrl = footerLogoUrl?.trim() || (
    (heroIdentityMode === "logo" || heroIdentityMode === "both")
      ? heroLogoUrl?.trim() || null
      : null
  )
  // Resolve booking email: footer-specific overrides main
  const resolvedBookingEmail = footerBookingEmail?.trim() || bookingEmail
  const hasBooking = !!resolvedBookingEmail
  // Copyright line
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

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Priority 1: Logo ────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-14 text-center sm:pt-20 lg:pt-24">
        {resolvedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogoUrl}
            alt={artistName}
            style={{ maxWidth: `${footerLogoWidth}px` }}
            className="mx-auto max-h-[130px] object-contain opacity-88 sm:max-h-[150px]"
          />
        ) : (
          <p className="text-[2rem] font-black tracking-[-0.025em] text-foreground/88 sm:text-[2.5rem]">
            {artistName}
          </p>
        )}

        {/* Priority 2: Social icons */}
        {footerSocialsEnabled && iconLinks.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-5 sm:mt-10 sm:gap-7">
            {iconLinks.map(({ platform, url, label, href, Icon }) => (
              <a
                key={`foot-${platform}-${url}`}
                href={href}
                aria-label={label}
                title={label}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/38 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/90"
              >
                <Icon className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" />
              </a>
            ))}
          </div>
        )}

        {/* Priority 3: Booking email */}
        {hasBooking && (
          <a
            href={resolveSafeHref(`mailto:${resolvedBookingEmail}`) ?? "#"}
            className="mt-7 text-[13px] font-medium text-white/38 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/72 sm:mt-8 sm:text-[14px]"
          >
            {resolvedBookingEmail}
          </a>
        )}

        {/* Bottom spacing before newsletter */}
        <div className="h-10 sm:h-14" />
      </div>

      {/* ── Priority 4: Newsletter — compact, secondary ─────────────── */}
      {footerNewsletterEnabled && (
        <div className="border-t border-white/[0.04] px-6 py-7 text-center sm:py-9">
          {status === "success" ? (
            <p className="text-[12px] font-medium text-white/38">You&apos;re on the list.</p>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/20">
                Stay Connected
              </p>
              <p className="mt-1 text-[12px] text-white/22">
                Music. Shows. Guest Lists.
              </p>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mx-auto mt-4 flex max-w-[260px] gap-2 sm:max-w-xs"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (status === "error") setStatus("idle")
                  }}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  className={cn(
                    "h-8 min-w-0 flex-1 rounded-full border bg-transparent px-3.5 text-[11px] text-foreground/75 outline-none transition-colors duration-200 placeholder:text-white/14",
                    status === "error"
                      ? "border-red-500/28 focus:border-red-500/45"
                      : "border-white/[0.08] focus:border-accent/32",
                  )}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="h-8 shrink-0 rounded-full border border-white/[0.12] bg-transparent px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-all duration-200 hover:border-white/25 hover:text-white/70 disabled:opacity-40"
                >
                  {status === "loading" ? "···" : "Join"}
                </button>
              </form>
              {status === "error" && (
                <p className="mt-1.5 text-[10px] text-red-400/55">
                  Enter a valid email address.
                </p>
              )}
              {status !== "error" && (
                <p className="mt-1.5 text-[10px] text-white/13">
                  Occasional updates only.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Copyright ─────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 text-center">
        <p className="text-[10px] font-medium text-white/18">
          {copyrightLine}
          {!isPro && (
            <>
              {" · "}
              <Link href="/" className="transition-colors duration-150 hover:text-white/35">
                {brand.copy.poweredBy}
              </Link>
            </>
          )}
        </p>
      </div>

    </footer>
  )
}
