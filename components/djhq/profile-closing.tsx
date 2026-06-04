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
}

export function ProfileClosing({
  artistName,
  bookingEmail,
  isPro,
  socialLinks = [],
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
  const activeSocialLinks = socialLinks
    .filter((l) => l.url.trim().length > 0)
    .slice(0, 6)

  return (
    <footer className="border-t border-white/[0.06]">

      {/* ── Newsletter ────────────────────────────────────────────────────── */}
      <div className="px-4 py-10 text-center sm:py-14 lg:py-16">
        {status === "success" ? (
          <div>
            <p className="text-[1.25rem] font-black tracking-[-0.02em] text-foreground sm:text-[1.5rem]">
              You&apos;re on the list.
            </p>
            <p className="mt-2 text-[12px] text-white/28">
              We&apos;ll be in touch.
            </p>
          </div>
        ) : (
          <>
            {/* Footer-scale headline — not a hero element */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
              Stay Connected
            </p>
            <h2 className="mt-2 text-[1.5rem] font-black leading-none tracking-[-0.02em] text-foreground sm:text-[1.9rem]">
              Join the List
            </h2>
            <p className="mx-auto mt-2.5 max-w-xs text-[13px] text-white/30 sm:mt-3">
              New music, future shows, guest lists and exclusive updates.
            </p>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-5 flex max-w-sm items-stretch gap-2 sm:mt-6"
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
                  "h-10 min-w-0 flex-1 rounded-full border bg-white/[0.04] px-4 text-[13px] text-foreground outline-none transition-colors duration-200 placeholder:text-white/18 sm:h-11",
                  status === "error"
                    ? "border-red-500/35 focus:border-red-500/55"
                    : "border-white/[0.10] focus:border-accent/40",
                )}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-10 shrink-0 rounded-full bg-accent px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition-all duration-200 hover:bg-accent/90 disabled:opacity-50 sm:h-11 sm:px-6"
              >
                {status === "loading" ? "···" : "Join"}
              </button>
            </form>
            {status === "error" ? (
              <p className="mt-2 text-[10px] text-red-400/65">
                Please enter a valid email address.
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-white/16">
                Occasional updates only.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Social icons ──────────────────────────────────────────────────── */}
      {activeSocialLinks.length > 0 && (
        <div className="px-4 pb-8 text-center sm:pb-10">
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            {activeSocialLinks.map((link) => {
              const href = resolveSafeHref(link.url)
              if (!href) return null
              const Icon = SOCIAL_ICONS[link.platform]
              if (!Icon) return null
              return (
                <a
                  key={`foot-${link.platform}-${link.url}`}
                  href={href}
                  aria-label={link.label}
                  title={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/38 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/88"
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Booking ───────────────────────────────────────────────────────── */}
      {hasBooking && (
        <div className="px-4 pb-8 text-center sm:pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/18">
            Booking
          </p>
          <a
            href={resolveSafeHref(`mailto:${bookingEmail}`) ?? "#"}
            className="mt-1.5 block text-[13px] text-white/38 transition-colors duration-200 hover:text-accent/72"
          >
            {bookingEmail}
          </a>
        </div>
      )}

      {/* ── Copyright ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] py-4 text-center">
        <p className="text-[10px] text-white/15">
          © {year} {artistName}
          {!isPro && (
            <>
              {" · "}
              <Link href="/" className="transition-colors duration-150 hover:text-white/30">
                {brand.copy.poweredBy}
              </Link>
            </>
          )}
        </p>
      </div>

    </footer>
  )
}
