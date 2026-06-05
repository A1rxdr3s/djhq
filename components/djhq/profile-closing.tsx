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
  footerLogoUrl?: string | null
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
  bookingEmail,
  isPro,
  socialLinks = [],
  heroLogoUrl,
  heroIdentityMode,
  footerLogoUrl,
  footerLogoWidth = 220,
  footerBookingEmail,
  footerContactEmail,
  footerDemosEmail,
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

  // Logo resolution: footer-specific → hero logo → artist name text
  const resolvedLogoUrl = footerLogoUrl?.trim() || (
    (heroIdentityMode === "logo" || heroIdentityMode === "both")
      ? heroLogoUrl?.trim() || null
      : null
  )

  // Contact emails — only show those that are set
  const contactEmails: { label: string; email: string }[] = [
    footerBookingEmail?.trim() ? { label: "Booking", email: footerBookingEmail.trim() } : null,
    footerContactEmail?.trim() ? { label: "Contact", email: footerContactEmail.trim() } : null,
    footerDemosEmail?.trim()   ? { label: "Demos",   email: footerDemosEmail.trim() }   : null,
    // Fallback to main booking email if no footer emails are set
    !footerBookingEmail?.trim() && !footerContactEmail?.trim() && !footerDemosEmail?.trim() && bookingEmail
      ? { label: "Booking", email: bookingEmail }
      : null,
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

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Identity block: logo → social → contacts ─────────────── */}
      <div className="flex flex-col items-center px-6 pb-10 pt-14 text-center sm:pb-14 sm:pt-20 lg:pt-24">

        {/* 1. Logo */}
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

        {/* 2. Social icons — icon-only, larger, centered */}
        {footerSocialsEnabled && iconLinks.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-6 sm:mt-10 sm:gap-8">
            {iconLinks.map(({ platform, url, label, href, Icon }) => (
              <a
                key={`foot-${platform}-${url}`}
                href={href}
                aria-label={label}
                title={label}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/35 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
              >
                <Icon className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" />
              </a>
            ))}
          </div>
        )}

        {/* 3. Contact emails — premium multi-channel block */}
        {contactEmails.length > 0 && (
          <div className={cn(
            "mt-7 sm:mt-9",
            contactEmails.length > 1
              ? "flex flex-wrap items-start justify-center gap-x-8 gap-y-5 sm:gap-x-12"
              : "",
          )}>
            {contactEmails.map(({ label, email: addr }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/22">
                  {label}
                </p>
                <a
                  href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                  className="mt-1 block text-[12px] font-medium text-white/42 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/75 sm:text-[13px]"
                >
                  {addr}
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="h-8 sm:h-12" />
      </div>

      {/* ── Newsletter — secondary, compact ─────────────────────────── */}
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
                  className="h-8 shrink-0 rounded-full border border-white/[0.12] bg-transparent px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 transition-all duration-200 hover:border-white/22 hover:text-white/65 disabled:opacity-40"
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
