"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Globe,
  Instagram,
  MoreHorizontal,
  Music,
  Music2,
  Play,
  Radio,
  Link2,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { resolveSafeHref } from "@/lib/safe-url"
import type { SocialLink, SocialPlatform } from "@/types/djhq"

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram:          Instagram,
  beatport:           Music2,
  spotify:            Radio,
  soundcloud:         Play,
  youtube:            Youtube,
  tiktok:             Music,
  "resident-advisor": Globe,
  bandsintown:        Calendar,
  website:            Globe,
  other:              Link2,
}

export function HeroSocialLinks({ links }: { links: SocialLink[] }) {
  const [open, setOpen] = useState(false)

  const mobileVisible = links.slice(0, 3)
  const mobileExtra   = links.slice(3)
  const desktopVisible = links.slice(0, 5)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      {/* ── Mobile: up to 3 priority icons + More button ── */}
      <div className="flex items-center gap-3 sm:hidden">
        {mobileVisible.map((link) => {
          const href = resolveSafeHref(link.url)
          if (!href) return null
          const Icon = SOCIAL_ICONS[link.platform]
          return (
            <a
              key={link.platform}
              href={href}
              aria-label={link.label}
              title={link.label}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/75 transition-colors duration-300 hover:text-accent"
            >
              <Icon className="h-[22px] w-[22px]" />
            </a>
          )
        })}
        {mobileExtra.length > 0 && (
          <button
            type="button"
            aria-label={`${mobileExtra.length} more social links`}
            onClick={() => setOpen(true)}
            className="text-white/50 transition-colors duration-300 hover:text-white/80"
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
          </button>
        )}
      </div>

      {/* ── Desktop: up to 5 icons — unchanged from previous behavior ── */}
      <div className="hidden items-center gap-7 sm:flex">
        {desktopVisible.map((link) => {
          const href = resolveSafeHref(link.url)
          if (!href) return null
          const Icon = SOCIAL_ICONS[link.platform]
          return (
            <a
              key={link.platform}
              href={href}
              aria-label={link.label}
              title={link.label}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/75 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
            >
              <Icon className="h-[26px] w-[26px]" />
            </a>
          )
        })}
      </div>

      {/* ── Mobile social drawer — fixed bottom sheet ── */}
      {open && (
        <div className="sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Bottom sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Social links"
            className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl border-t border-white/[0.08] bg-[rgba(10,10,10,0.97)] px-5 pb-8 pt-5 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                More links
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white/70"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {mobileExtra.map((link) => {
                const href = resolveSafeHref(link.url)
                if (!href) return null
                const Icon = SOCIAL_ICONS[link.platform]
                return (
                  <a
                    key={link.platform}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white/80 transition-colors active:bg-white/[0.06]"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent" />
                    <span className="truncate text-[13px] font-medium">{link.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
