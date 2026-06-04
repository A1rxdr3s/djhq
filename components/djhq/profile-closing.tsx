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
}

export function ProfileClosing({
  artistName,
  bookingEmail,
  isPro,
  socialLinks = [],
  heroLogoUrl,
  heroIdentityMode,
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

  const year       = new Date().getFullYear()
  const hasBooking = !!bookingEmail.trim()

  const showLogo = !!heroLogoUrl?.trim() &&
    (heroIdentityMode === "logo" || heroIdentityMode === "both" || !heroIdentityMode)

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
    <footer className="border-t border-white/[0.05] mt-12 sm:mt-16 lg:mt-20">

      {/* ── Identity + social + booking ─────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pb-10 pt-14 text-center sm:pb-14 sm:pt-20 lg:pt-24">

        {/* Logo — the footer's visual anchor */}
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroLogoUrl!}
            alt={artistName}
            className="mx-auto max-h-[110px] max-w-[260px] object-contain opacity-88 sm:max-h-[130px] sm:max-w-[300px] lg:max-h-[150px] lg:max-w-[340px]"
          />
        ) : (
          <p className="text-[2rem] font-black tracking-[-0.025em] text-foreground/88 sm:text-[2.5rem]">
            {artistName}
          </p>
        )}

        {/* Social icons — icon-only, premium hover */}
        {iconLinks.length > 0 && (
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

        {/* Booking — single clean line, no heading */}
        {hasBooking && (
          <a
            href={resolveSafeHref(`mailto:${bookingEmail}`) ?? "#"}
            className="mt-7 text-[13px] font-medium text-white/40 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/75 sm:mt-8 sm:text-[14px]"
          >
            {bookingEmail}
          </a>
        )}
      </div>

      {/* ── Newsletter — secondary, compact ─────────────────────────── */}
      <div className="border-t border-white/[0.04] px-6 py-8 text-center sm:py-10">
        {status === "success" ? (
          <p className="text-[12px] font-medium text-white/42">You&apos;re on the list.</p>
        ) : (
          <>
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/20">
              Stay Connected
            </p>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto flex max-w-[280px] gap-2 sm:max-w-xs"
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
                  "h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-[12px] text-foreground/85 outline-none transition-colors duration-200 placeholder:text-white/15",
                  status === "error"
                    ? "border-red-500/30 focus:border-red-500/50"
                    : "border-white/[0.09] focus:border-accent/35",
                )}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-9 shrink-0 rounded-full bg-accent px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition-colors duration-200 hover:bg-accent/90 disabled:opacity-50"
              >
                {status === "loading" ? "···" : "Join"}
              </button>
            </form>
            {status === "error" && (
              <p className="mt-2 text-[10px] text-red-400/60">
                Enter a valid email address.
              </p>
            )}
            {status !== "error" && (
              <p className="mt-2 text-[10px] text-white/14">
                Occasional updates only.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Copyright ────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 text-center">
        <p className="text-[10px] font-medium text-white/18">
          © {year} {artistName}
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
