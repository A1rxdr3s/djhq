"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { resolveSafeHref } from "@/lib/safe-url"
import { brand } from "@/lib/brand"
import type { SocialLink } from "@/types/djhq"

const PLATFORM_LABELS: Record<string, string> = {
  beatport:         "Beatport",
  spotify:          "Spotify",
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
  location: string
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
  location,
  bookingEmail,
  isPro,
  genres = [],
  socialLinks = [],
  hasPressKit = false,
  pressKitHref = null,
  artistHandle = "",
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
  const locationStr = location.replace(/\s*\/\s*/g, " · ")

  const exploreLinks = [
    { label: "Releases", href: "#music" },
    { label: "Shows",    href: "#shows" },
    { label: "Sets",     href: "#performance" },
    ...(hasPressKit && pressKitHref ? [{ label: "Press Kit", href: pressKitHref, external: true }] : []),
    ...(hasBooking ? [{ label: "Contact", href: `#contact` }] : []),
  ]

  const connectLinks = socialLinks
    .filter((l) => l.url.trim().length > 0)
    .slice(0, 6)
    .map((l) => ({
      label: PLATFORM_LABELS[l.platform] ?? l.label,
      href:  resolveSafeHref(l.url),
    }))
    .filter((l) => l.href !== null) as { label: string; href: string }[]

  return (
    <footer className="mt-16 border-t border-white/[0.06] sm:mt-20 lg:mt-24">

      {/* ── Main columns ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 px-0 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-x-12 lg:py-20">

        {/* Col 1 — Artist identity */}
        <div className="sm:col-span-2 lg:col-span-1">
          <p
            className="text-[1.75rem] font-black leading-none tracking-[-0.025em] text-foreground sm:text-[2.1rem]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {artistName}
          </p>
          {genres.length > 0 && (
            <p className="mt-3 text-[12px] text-white/32">
              {genres.join(" · ")}
            </p>
          )}
          {locationStr && (
            <p className="mt-1 text-[12px] text-white/28">{locationStr}</p>
          )}
        </div>

        {/* Col 2 — Explore */}
        <div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">
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
                    className="text-[13px] text-white/48 transition-colors duration-200 hover:text-white/88"
                  >
                    {label}
                  </a>
                ) : (
                  <a
                    href={href}
                    className="text-[13px] text-white/48 transition-colors duration-200 hover:text-white/88"
                  >
                    {label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Connect */}
        {connectLinks.length > 0 && (
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">
              Connect
            </p>
            <ul className="space-y-2.5">
              {connectLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-white/48 transition-colors duration-200 hover:text-white/88"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Col 4 — Booking */}
        {hasBooking && (
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">
              Booking
            </p>
            <a
              href={resolveSafeHref(`mailto:${bookingEmail}`) ?? "#"}
              className="text-[13px] leading-relaxed text-white/48 transition-colors duration-200 hover:text-accent/80"
            >
              {bookingEmail}
            </a>
          </div>
        )}
      </div>

      {/* ── Newsletter ──────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] py-10 sm:py-12">
        {status === "success" ? (
          <div className="text-center">
            <p className="text-[1.1rem] font-black tracking-[-0.01em] text-foreground">
              You&apos;re on the list.
            </p>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/25">
              We&apos;ll be in touch.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-md text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
              Join the List
            </p>
            <p className="mt-2 text-[12px] text-white/28">
              Guest Lists · Early Access · New Music
            </p>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 flex items-center gap-2"
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
                  "h-9 min-w-0 flex-1 border-b bg-transparent px-0 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-white/18",
                  status === "error"
                    ? "border-red-500/40 focus:border-red-500/60"
                    : "border-white/[0.12] focus:border-accent/40",
                )}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex h-9 shrink-0 items-center rounded-full bg-accent px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground transition-all duration-150 hover:bg-accent/90 disabled:opacity-50"
              >
                {status === "loading" ? "···" : "Join"}
              </button>
            </form>
            {status === "error" && (
              <p className="mt-2 text-[10px] text-red-400/70">
                Please enter a valid email address.
              </p>
            )}
            {status !== "error" && (
              <p className="mt-2 text-[10px] text-white/16">
                Occasional updates only.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/[0.04] py-4">
        <p className="text-[10px] text-white/18">
          © {year} {artistName}
        </p>
        {!isPro && (
          <Link
            href="/"
            className="text-[10px] text-white/14 transition-colors duration-150 hover:text-white/32"
          >
            {brand.copy.poweredBy}
          </Link>
        )}
      </div>

    </footer>
  )
}
