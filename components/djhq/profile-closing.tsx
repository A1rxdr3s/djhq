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
  bookingEmail,
  isPro,
  socialLinks = [],
  hasPressKit = false,
  pressKitHref = null,
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

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms",          href: "/terms" },
    { label: "Cookies Policy", href: "/cookies" },
  ]

  const headingClass = "mb-3.5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/35"

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      <div className="sm:hidden py-5">

        {/* 1. Identity: logo / name + genres + location */}
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

        {/* 2. Booking */}
        {contacts[0] && (
          <div className="mt-4">
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/28">
              {contacts[0].label}
            </p>
            <a
              href={resolveSafeHref(`mailto:${contacts[0].email}`) ?? "#"}
              className="text-[13px] text-white/58 transition-colors duration-200 hover:text-white/88"
            >
              {contacts[0].email}
            </a>
          </div>
        )}

        {/* 3. Connect */}
        {footerSocialsEnabled && iconLinks.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-[22px] gap-y-3">
            {iconLinks.map(({ platform, url, label, href, Icon }) => (
              <a
                key={`m-${platform}-${url}`}
                href={href}
                aria-label={label}
                title={label}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
              >
                <Icon className="h-[22px] w-[22px]" />
              </a>
            ))}
          </div>
        )}

        {/* 4. Newsletter */}
        {footerNewsletterEnabled && (
          <div className="mt-6">
            <div className="mb-5 border-t border-white/[0.05]" />
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/35">
              STAY CONNECTED
            </p>
            {status === "success" ? (
              <p className="text-[12px] text-white/45">You&apos;re on the list.</p>
            ) : (
              <>
                <p className="mb-3 text-[12px] text-white/35">New music, shows, and guest list access.</p>
                <form onSubmit={handleSubmit} noValidate className="flex gap-2">
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
                      "h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-[12px] text-foreground/80 outline-none transition-colors duration-200 placeholder:text-white/18",
                      status === "error"
                        ? "border-red-500/30 focus:border-red-500/50"
                        : "border-white/[0.18] focus:border-accent/50",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="h-9 shrink-0 rounded-full border border-accent/35 bg-transparent px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/65 transition-all duration-200 hover:border-accent/55 hover:text-accent/90 disabled:opacity-40"
                  >
                    {status === "loading" ? "···" : "Join"}
                  </button>
                </form>
                {status === "error" && (
                  <p className="mt-1.5 text-[10px] text-red-400/55">Enter a valid email address.</p>
                )}
              </>
            )}
          </div>
        )}


      </div>
      {/* ── end mobile ───────────────────────────────────────────────── */}

      {/* ── Desktop editorial grid ───────────────────────────────────── */}
      <div className={cn(
        "hidden sm:grid sm:items-start sm:gap-x-10 sm:py-9 lg:gap-x-16 lg:py-11",
        footerNewsletterEnabled ? "sm:grid-cols-[2fr_1.2fr_2fr]" : "sm:grid-cols-[2fr_1.2fr]",
      )}>

        {/* Col 1: Artist identity */}
        <div>
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
        </div>

        {/* Col 2: Booking + Connect */}
        <div className="space-y-8">
          {contacts.length > 0 && (
            <div>
              <p className={headingClass}>Booking</p>
              <div className="space-y-4">
                {contacts.map(({ label, email: addr }) => (
                  <div key={label}>
                    {contacts.length > 1 && (
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">{label}</p>
                    )}
                    <a
                      href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                      className="text-[13px] text-white/58 transition-colors duration-200 hover:text-white/88"
                    >
                      {addr}
                    </a>
                  </div>
                ))}
              </div>
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
                    className="text-white/52 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                  >
                    <Icon className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Col 3: Newsletter */}
        {footerNewsletterEnabled && (
          <div>
            <p className={headingClass}>STAY CONNECTED</p>
            {status === "success" ? (
              <p className="text-[13px] text-white/45">You&apos;re on the list.</p>
            ) : (
              <>
                <p className="mb-4 text-[12px] text-white/38">New music, shows, and guest list access.</p>
                <form onSubmit={handleSubmit} noValidate className="flex gap-2">
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
                      "h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-[12px] text-foreground/80 outline-none transition-colors duration-200 placeholder:text-white/18",
                      status === "error"
                        ? "border-red-500/30 focus:border-red-500/50"
                        : "border-white/[0.18] focus:border-accent/50",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="h-9 shrink-0 rounded-full border border-accent/35 bg-transparent px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/65 transition-all duration-200 hover:border-accent/55 hover:text-accent/90 disabled:opacity-40"
                  >
                    {status === "loading" ? "···" : "Join"}
                  </button>
                </form>
                {status === "error" ? (
                  <p className="mt-2 text-[10px] text-red-400/55">Enter a valid email address.</p>
                ) : (
                  <p className="mt-2 text-[10px] text-white/18">Occasional updates only.</p>
                )}
              </>
            )}
          </div>
        )}

      </div>
      {/* ── end desktop grid ─────────────────────────────────────────── */}

      {/* ── Bottom utility bar (all sizes) ──────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 sm:py-5">
        <div className="flex flex-wrap items-center">
          <span className="whitespace-nowrap text-[11px] text-white/40">
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
          {legalLinks.map(({ label, href }) => (
            <span key={label} className="flex items-center">
              <span className="mx-2 text-[11px] text-white/20" aria-hidden>·</span>
              <Link href={href} className="text-[10px] text-white/32 transition-colors duration-150 hover:text-white/55">
                {label}
              </Link>
            </span>
          ))}
        </div>
      </div>

    </footer>
  )
}
