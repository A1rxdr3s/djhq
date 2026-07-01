"use client"

import { useState, type FormEvent } from "react"
import { Radio, Music2, Play, Youtube, Instagram, Music, Globe, Link2, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { resolveSafeHref } from "@/lib/safe-url"
import { brand } from "@/lib/brand"
import type { SocialLink, SocialPlatform } from "@/types/djhq"
import type { LucideIcon } from "lucide-react"
import { LegalModal } from "@/components/legal/legal-modal"

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const [email,  setEmail]  = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle")
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | "cookies" | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setStatus("error")
      return
    }
    setStatus("loading")
    try {
      const res  = await fetch("/api/newsletter-signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: trimmed, artistHandle }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus(data.alreadySubscribed ? "duplicate" : "success")
        if (!data.alreadySubscribed) setEmail("")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
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
    footerContactEmail?.trim() ? { label: "General", email: footerContactEmail.trim() } : null,
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

  // Newsletter column is shown only when enabled AND we have a handle to identify the artist.
  const showNewsletter = footerNewsletterEnabled && Boolean(artistHandle)

  const headingClass = "mb-3.5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/52"

  return (
    <footer className="mt-12 border-t border-white/[0.05] sm:mt-16 lg:mt-20">

      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      <div className="sm:hidden py-5">

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

        {/* 2. Connect */}
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
                className="text-white/62 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
              >
                <Icon className="h-[22px] w-[22px]" />
              </a>
            ))}
          </div>
        )}

        {/* 3. Contact */}
        {contacts.length > 0 && (
          <div className="mt-4 space-y-3">
            {contacts.map(({ label, email: addr }) => (
              <div key={label}>
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/48">
                  {label}
                </p>
                <a
                  href={resolveSafeHref(`mailto:${addr}`) ?? "#"}
                  className="text-[13px] text-white/72 transition-colors duration-200 hover:text-white/92"
                >
                  {addr}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* 4. Stay Connected newsletter */}
        {showNewsletter && (
          <div className="mt-6">
            <div className="mb-5 border-t border-white/[0.05]" />
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/52">
              Stay Connected
            </p>
            {status === "success" ? (
              <p className="text-[12px] text-white/45">Thanks — you&apos;re on the list.</p>
            ) : status === "duplicate" ? (
              <p className="text-[12px] text-white/45">You&apos;re already subscribed.</p>
            ) : (
              <>
                <p className="mb-1.5 text-[14px] font-semibold leading-snug text-white/78">
                  Get updates directly from {artistName}
                </p>
                <p className="mb-3 text-[12px] text-white/52">New music, shows, and guest list access.</p>
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
                      "h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-[12px] text-foreground/80 outline-none transition-colors duration-200 placeholder:text-white/38",
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
                    {status === "loading" ? "Joining…" : "Join"}
                  </button>
                </form>
                {status === "error" && (
                  <p className="mt-1.5 text-[10px] text-red-400/55">
                    Couldn&apos;t join right now. Please try again.
                  </p>
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
        showNewsletter ? "sm:grid-cols-[2fr_1.2fr_2fr]" : "sm:grid-cols-[2fr_1.2fr]",
      )}>

        {/* Col 1: Artist identity + Connect */}
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

          {footerSocialsEnabled && iconLinks.length > 0 && (
            <div className="mt-8">
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
                    className="text-white/65 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                  >
                    <Icon className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Col 2: Contact channels */}
        <div>
          {contacts.length > 0 && (
            <div>
              <p className={headingClass}>Contact</p>
              <div className="space-y-4">
                {contacts.map(({ label, email: addr }) => (
                  <div key={label}>
                    {contacts.length > 1 && (
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/42">{label}</p>
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
            </div>
          )}
        </div>

        {/* Col 3: Stay Connected newsletter — real /api/newsletter-signup endpoint */}
        {showNewsletter && (
          <div>
            <p className={headingClass}>Stay Connected</p>
            {status === "success" ? (
              <p className="text-[13px] text-white/45">Thanks — you&apos;re on the list.</p>
            ) : status === "duplicate" ? (
              <p className="text-[13px] text-white/45">You&apos;re already subscribed.</p>
            ) : (
              <>
                <p className="mb-1.5 text-[15px] font-semibold leading-snug text-white/78">
                  Get updates directly from {artistName}
                </p>
                <p className="mb-4 text-[12px] text-white/55">New music, shows, and guest list access.</p>
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
                      "h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-[12px] text-foreground/80 outline-none transition-colors duration-200 placeholder:text-white/38",
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
                    {status === "loading" ? "Joining…" : "Join"}
                  </button>
                </form>
                {status === "error" ? (
                  <p className="mt-2 text-[10px] text-red-400/55">
                    Couldn&apos;t join right now. Please try again.
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-white/38">Occasional updates only.</p>
                )}
              </>
            )}
          </div>
        )}

      </div>
      {/* ── end desktop grid ─────────────────────────────────────────── */}

      {/* ── Bottom utility bar (all sizes) ──────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="whitespace-nowrap text-[11px] text-white/62">
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
          <div className="flex items-center gap-x-4">
            <button type="button" onClick={() => setLegalModal("privacy")} className="text-[11px] text-white/48 transition-colors duration-150 hover:text-white/70 cursor-pointer">Privacy</button>
            <button type="button" onClick={() => setLegalModal("terms")}   className="text-[11px] text-white/48 transition-colors duration-150 hover:text-white/70 cursor-pointer">Terms</button>
            <button type="button" onClick={() => setLegalModal("cookies")} className="text-[11px] text-white/48 transition-colors duration-150 hover:text-white/70 cursor-pointer">Cookies</button>
          </div>
        </div>
      </div>

      <LegalModal
        open={legalModal !== null}
        type={legalModal}
        artist={{
          artistName:   artistName,
          contactEmail: footerContactEmail?.trim() || footerBookingEmail?.trim() || bookingEmail?.trim() || null,
        }}
        onClose={() => setLegalModal(null)}
      />

    </footer>
  )
}
