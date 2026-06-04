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

const PLATFORM_LABELS: Record<string, string> = {
  spotify:          "Spotify",
  beatport:         "Beatport",
  soundcloud:       "SoundCloud",
  youtube:          "YouTube",
  instagram:        "Instagram",
  tiktok:           "TikTok",
  "resident-advisor": "Resident Advisor",
  bandsintown:      "Bandsintown",
  website:          "Website",
  other:            "Website",
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
}

export function ProfileClosing({
  artistName,
  bookingEmail,
  isPro,
  socialLinks = [],
  hasPressKit = false,
  pressKitHref = null,
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

  const exploreLinks = [
    { label: "Releases", href: "#music",       external: false },
    { label: "Shows",    href: "#shows",       external: false },
    { label: "Sets",     href: "#performance", external: false },
    ...(hasPressKit && pressKitHref
      ? [{ label: "Press Kit", href: pressKitHref, external: true }]
      : []),
    ...(hasBooking
      ? [{ label: "Contact", href: "#contact", external: false }]
      : []),
  ]

  const filteredSocialLinks = socialLinks.filter((l) => l.url.trim().length > 0)

  const connectLinks = filteredSocialLinks
    .slice(0, 5)
    .map((l) => ({ label: PLATFORM_LABELS[l.platform] ?? l.label, href: resolveSafeHref(l.url) }))
    .filter((l): l is { label: string; href: string } => l.href !== null)

  const iconLinks = filteredSocialLinks
    .slice(0, 6)
    .map((l) => ({ ...l, href: resolveSafeHref(l.url), Icon: SOCIAL_ICONS[l.platform] }))
    .filter((l): l is typeof l & { href: string; Icon: LucideIcon } => l.href !== null && l.Icon !== undefined)

  return (
    <footer className="border-t border-white/[0.06]">
      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-10 sm:grid-cols-2 sm:gap-x-12 sm:py-12 lg:grid-cols-4 lg:gap-x-16 lg:py-14">

        {/* Col 1 — Explore */}
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/25">
            Explore
          </p>
          <ul className="space-y-2.5">
            {exploreLinks.map(({ label, href, external }) => (
              <li key={label}>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-white/55 transition-colors duration-200 hover:text-white/95"
                  >
                    {label}
                  </a>
                ) : (
                  <a
                    href={href}
                    className="text-[13px] font-medium text-white/55 transition-colors duration-200 hover:text-white/95"
                  >
                    {label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Col 2 — Connect: text links + icon row */}
        {(connectLinks.length > 0 || iconLinks.length > 0) && (
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/25">
              Connect
            </p>
            {connectLinks.length > 0 && (
              <ul className="space-y-2.5">
                {connectLinks.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-white/55 transition-colors duration-200 hover:text-white/95"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {/* Social icons — visual focal point below text links */}
            {iconLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-4">
                {iconLinks.map(({ platform, url, label, href, Icon }) => (
                  <a
                    key={`ico-${platform}-${url}`}
                    href={href}
                    aria-label={label}
                    title={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/45 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Col 3 — Join the List */}
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/25">
            Join the List
          </p>
          {status === "success" ? (
            <p className="text-[13px] font-medium text-white/55">You&apos;re on the list.</p>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-2"
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
                    "h-9 rounded-full border bg-white/[0.03] px-4 text-[12px] text-foreground outline-none transition-colors duration-200 placeholder:text-white/16",
                    status === "error"
                      ? "border-red-500/30 focus:border-red-500/50"
                      : "border-white/[0.09] focus:border-accent/38",
                  )}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="h-9 rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition-all duration-200 hover:bg-accent/90 disabled:opacity-50"
                >
                  {status === "loading" ? "···" : "Join"}
                </button>
              </form>
              {status === "error" ? (
                <p className="mt-2 text-[10px] text-red-400/65">
                  Enter a valid email address.
                </p>
              ) : (
                <p className="mt-2 text-[10px] text-white/16">
                  Occasional updates only.
                </p>
              )}
            </>
          )}
        </div>

        {/* Col 4 — Booking */}
        {hasBooking && (
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/25">
              Booking
            </p>
            <a
              href={resolveSafeHref(`mailto:${bookingEmail}`) ?? "#"}
              className="block text-[14px] font-medium leading-relaxed text-white/62 transition-colors duration-200 hover:text-accent/85"
            >
              {bookingEmail}
            </a>
          </div>
        )}
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/[0.04] py-4">
        <p className="text-[10px] font-medium text-white/22">
          © {year} {artistName}
        </p>
        {!isPro && (
          <Link
            href="/"
            className="text-[10px] font-medium text-white/18 transition-colors duration-150 hover:text-white/35"
          >
            {brand.copy.poweredBy}
          </Link>
        )}
      </div>
    </footer>
  )
}
