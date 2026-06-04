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
      <div className="px-4 py-20 text-center sm:py-28 lg:py-32">
        {status === "success" ? (
          <div>
            <p className="text-[2rem] font-black tracking-[-0.02em] text-foreground sm:text-[3rem]">
              You&apos;re on the list.
            </p>
            <p className="mt-3 text-[13px] text-white/28">
              We&apos;ll be in touch.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-[2.5rem] font-black leading-none tracking-[-0.025em] text-foreground sm:text-[3.5rem] lg:text-[4.5rem]">
              STAY CONNECTED
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-white/36 sm:mt-5">
              New music, future shows, guest lists and exclusive updates.
            </p>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-8 flex max-w-md items-stretch gap-2 sm:mt-10"
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
                  "h-12 min-w-0 flex-1 rounded-full border bg-white/[0.04] px-5 text-[14px] text-foreground outline-none transition-colors duration-200 placeholder:text-white/20 sm:h-14",
                  status === "error"
                    ? "border-red-500/35 focus:border-red-500/55"
                    : "border-white/[0.10] focus:border-accent/40",
                )}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-12 shrink-0 rounded-full bg-accent px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition-all duration-200 hover:bg-accent/90 disabled:opacity-50 sm:h-14 sm:px-8"
              >
                {status === "loading" ? "···" : "Join"}
              </button>
            </form>
            {status === "error" ? (
              <p className="mt-3 text-[11px] text-red-400/65">
                Please enter a valid email address.
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-white/18">
                Occasional updates only.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Social icons ──────────────────────────────────────────────────── */}
      {activeSocialLinks.length > 0 && (
        <div className="px-4 pb-16 text-center sm:pb-20 lg:pb-24">
          <div className="flex items-center justify-center gap-7 sm:gap-10">
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
                  className="text-white/30 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white/85"
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Booking ───────────────────────────────────────────────────────── */}
      {hasBooking && (
        <div className="px-4 pb-16 text-center sm:pb-20 lg:pb-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/20">
            Booking
          </p>
          <a
            href={resolveSafeHref(`mailto:${bookingEmail}`) ?? "#"}
            className="mt-2 block text-[15px] text-white/42 transition-colors duration-200 hover:text-accent/75 sm:text-[16px]"
          >
            {bookingEmail}
          </a>
        </div>
      )}

      {/* ── Copyright ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] py-5 text-center">
        <p className="text-[10px] text-white/16">
          © {year} {artistName}
          {!isPro && (
            <>
              {" · "}
              <Link href="/" className="transition-colors duration-150 hover:text-white/32">
                {brand.copy.poweredBy}
              </Link>
            </>
          )}
        </p>
      </div>

    </footer>
  )
}
