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
  hasPressKit = false,
  pressKitHref = null,
  artistHandle = "",
  heroLogoUrl,
  heroIdentityMode,
  footerLogoUrl,
  footerLogoWidth = 120,
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

  // Logo: footer-specific → hero logo (logo/both mode) → null
  const resolvedLogoUrl =
    footerLogoUrl?.trim() ||
    ((heroIdentityMode === "logo" || heroIdentityMode === "both") && heroLogoUrl?.trim()
      ? heroLogoUrl.trim()
      : null)

  // Contact entries — only render those that have a value
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

  // Sitemap navigation links
  const sitemapLinks = [
    { label: "Releases",  href: "#music" },
    { label: "Shows",     href: "#shows" },
    { label: "Sets",      href: "#performance" },
    ...(hasPressKit && pressKitHref
      ? [{ label: "Press Kit", href: pressKitHref, external: true }]
      : []),
    { label: "Contact",   href: "#contact" },
  ]

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy",  href: "/cookies" },
    { label: "Terms of Service", href: "/terms" },
  ]

  // Shared typography tokens
  const headingClass = "mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/22"
  const linkClass    = "block text-[13px] text-white/45 transition-colors duration-200 hover:text-white/85"

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Main editorial grid ─────────────────────────────────────── */}
      <div className={cn(
        "grid gap-x-10 gap-y-10 py-12 sm:py-14 lg:gap-x-14 lg:py-16",
        "grid-cols-1 sm:grid-cols-2",
        footerNewsletterEnabled && contacts.length > 0
          ? "lg:grid-cols-4"
          : contacts.length > 0 || footerNewsletterEnabled
          ? "lg:grid-cols-3"
          : "lg:grid-cols-2",
      )}>

        {/* Col 1 — Sitemap + Legal */}
        <div className="space-y-8">
          <div>
            <p className={headingClass}>Sitemap</p>
            <ul className="space-y-2.5">
              {sitemapLinks.map(({ label, href, external }) => (
                <li key={label}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {label}
                    </a>
                  ) : (
                    <a href={href} className={linkClass}>{label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={headingClass}>Legal</p>
            <ul className="space-y-2.5">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={cn(linkClass, "text-white/32 hover:text-white/62")}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Col 2 — Connect (social icons) */}
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
                  className="text-white/40 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                >
                  <Icon className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Col 3 — Stay Connected (Newsletter) */}
        {footerNewsletterEnabled && (
          <div>
            <p className={headingClass}>Stay Connected</p>
            {status === "success" ? (
              <p className="text-[13px] text-white/40">You&apos;re on the list.</p>
            ) : (
              <>
                <p className="mb-4 text-[12px] text-white/28">Music. Shows. Guest Lists.</p>
                <form onSubmit={handleSubmit} noValidate className="space-y-2">
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
                      "h-9 w-full rounded-full border bg-transparent px-4 text-[12px] text-foreground/80 outline-none transition-colors duration-200 placeholder:text-white/15",
                      status === "error"
                        ? "border-red-500/30 focus:border-red-500/50"
                        : "border-white/[0.10] focus:border-accent/38",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="h-9 w-full rounded-full border border-white/[0.12] bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 transition-all duration-200 hover:border-white/[0.22] hover:text-white/65 disabled:opacity-40"
                  >
                    {status === "loading" ? "···" : "Join"}
                  </button>
                </form>
                {status === "error" ? (
                  <p className="mt-2 text-[10px] text-red-400/55">Enter a valid email address.</p>
                ) : (
                  <p className="mt-2 text-[10px] text-white/14">Occasional updates only.</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Col 4 — Booking / Contact / Demos */}
        {contacts.length > 0 && (
          <div className="space-y-5">
            {contacts.map(({ label, email: addr }) => (
              <div key={label}>
                <p className={headingClass}>{label}</p>
                <a
                  href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                  className="text-[13px] text-white/45 transition-colors duration-200 hover:text-white/80"
                >
                  {addr}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom bar: small logo + copyright ─────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/[0.04] py-5">
        {/* Signature mark — small, left-anchored */}
        {resolvedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogoUrl}
            alt={artistName}
            style={{ maxWidth: `${Math.min(footerLogoWidth, 160)}px` }}
            className="max-h-[40px] object-contain opacity-55"
          />
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/18">
            {artistName}
          </span>
        )}

        {/* Copyright + attribution */}
        <p className="text-[10px] text-white/18">
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
