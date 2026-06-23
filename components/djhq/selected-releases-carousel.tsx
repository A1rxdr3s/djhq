"use client"

import { useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Music2, Play } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { Release } from "@/types/djhq"
import { getReleasePlatformLinks } from "@/lib/release-platforms"
import { ReleaseListenContent } from "@/components/release-listen-panel"
import { resolveSafeHref } from "@/lib/safe-url"

// Only these three format types earn a badge; others add noise
const PRIMARY_RELEASE_TYPE_BADGES: Record<string, string> = {
  single: "Single",
  ep:     "EP",
  album:  "Album",
}

function isReleaseRemix(release: Release): boolean {
  if (release.versionType === "remix") return true
  return /remix/i.test(release.title) || /remix/i.test(release.credits ?? "")
}

const ADVANCE_MS = 8_000

type Props = {
  releases: Release[]
}

export function SelectedReleasesCarousel({ releases }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const dragRef = useRef(false)
  const dragStartRef = useRef(0)
  const dragScrollRef = useRef(0)
  const wasDraggingRef = useRef(false)

  // Double items for seamless infinite loop
  const items = [...releases, ...releases]

  // Seamless loop: when scrollLeft crosses into the second copy, jump back by one copy width
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || releases.length === 0) return
    const half = el.scrollWidth / 2
    if (el.scrollLeft >= half) {
      el.scrollLeft -= half
    }
  }, [releases.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [onScroll])

  // Auto-advance every ADVANCE_MS
  useEffect(() => {
    if (releases.length <= 1) return
    const tick = () => {
      if (pausedRef.current || dragRef.current) return
      const el = scrollRef.current
      if (!el) return
      const firstItem = el.querySelector("article")
      if (!firstItem) return
      const gap = parseFloat(getComputedStyle(el).columnGap) || 12
      const step = firstItem.getBoundingClientRect().width + gap
      el.scrollBy({ left: step, behavior: "smooth" })
    }
    const timer = setInterval(tick, ADVANCE_MS)
    return () => clearInterval(timer)
  }, [releases.length])

  // Mouse drag-to-scroll with window-level cleanup
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      pausedRef.current = true
      dragRef.current = false
      wasDraggingRef.current = false
      dragStartRef.current = e.clientX
      dragScrollRef.current = el.scrollLeft

      const onMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStartRef.current
        if (Math.abs(dx) > 4) {
          dragRef.current = true
          wasDraggingRef.current = true
        }
        if (dragRef.current) {
          el.scrollLeft = dragScrollRef.current - dx
        }
      }
      const onMouseUp = () => {
        dragRef.current = false
        setTimeout(() => {
          wasDraggingRef.current = false
          pausedRef.current = false
        }, 300)
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
      }
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    }

    el.addEventListener("mousedown", onMouseDown)
    return () => el.removeEventListener("mousedown", onMouseDown)
  }, [])

  if (releases.length === 0) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { if (!dragRef.current) pausedRef.current = false }}
    >
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 pl-4 select-none [scrollbar-width:none] sm:gap-7 sm:pl-6 lg:pl-0 [&::-webkit-scrollbar]:hidden"
        style={{ cursor: "grab" }}
      >
        {items.map((release, i) => {
          const platformLinks = getReleasePlatformLinks(release)
          const hasArtwork = !!(release.artworkUrl?.trim())
          const isRemix = isReleaseRemix(release)
          const isClone = i >= releases.length
          const releaseYear = release.releaseDate?.slice(0, 4) ?? null

          // Badge: only SINGLE/EP/ALBUM type + REMIX version
          const typeLabel = release.releaseType ? (PRIMARY_RELEASE_TYPE_BADGES[release.releaseType] ?? null) : null
          const remixBadge = isRemix ? "Remix" : null
          const badges = [typeLabel, remixBadge].filter(Boolean) as string[]
          const hasPlatformLinks = platformLinks.length > 0

          return (
            <article
              key={`${release.id}-${i}`}
              aria-hidden={isClone}
              className="flex w-[min(72vw,240px)] shrink-0 snap-start flex-col sm:w-[240px] lg:w-[240px]"
            >
              <DialogPrimitive.Root>
                {/* Artwork with hover lift + overlay */}
                <div className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-secondary shadow-md shadow-black/30 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-accent/40 hover:[box-shadow:0_0_16px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  {hasArtwork ? (
                    <Image
                      src={release.artworkUrl}
                      alt={`${release.title} artwork`}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.24),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                      <Music2 className="h-8 w-8 text-accent/75" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  {/* Cover overlay — opens listen dialog (same as LISTEN button) when platform links exist */}
                  {hasPlatformLinks ? (
                    <DialogPrimitive.Trigger asChild>
                      <button
                        tabIndex={isClone ? -1 : 0}
                        aria-label={`Listen to ${release.title}`}
                        className="absolute inset-0 flex items-center justify-center bg-transparent opacity-0 transition-all duration-200 group-hover:bg-black/52 group-hover:opacity-100 group-hover:backdrop-blur-[3px]"
                        onClick={(e) => { if (wasDraggingRef.current) e.preventDefault() }}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Listen
                        </span>
                      </button>
                    </DialogPrimitive.Trigger>
                  ) : (
                    <a
                      href={resolveSafeHref(release.platformUrl) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Listen to ${release.title}`}
                      tabIndex={isClone ? -1 : 0}
                      className="absolute inset-0 flex items-center justify-center bg-transparent opacity-0 transition-all duration-200 group-hover:bg-black/52 group-hover:opacity-100 group-hover:backdrop-blur-[3px]"
                      onClick={(e) => { if (wasDraggingRef.current) e.preventDefault() }}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Listen
                      </span>
                    </a>
                  )}
                </div>

                {/* Metadata — flex-col flex-1 keeps all CTAs on the same baseline */}
                <div className="mt-3 flex min-w-0 flex-1 flex-col">
                  {/* Type / version badges */}
                  {badges.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-accent/20 bg-accent/[0.04] px-2 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-accent/80"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="text-balance text-[15px] font-black leading-tight text-foreground">
                    {release.title}
                  </h3>

                  <p className="mt-2 text-[12px] text-white/42 line-clamp-1">{release.credits ?? ""}</p>

                  <p className="mt-1 line-clamp-1 text-[10px] uppercase tracking-[0.14em] text-white/28">
                    {[releaseYear, release.label].filter(Boolean).join(" · ")}
                  </p>

                  {/* Spacer — pushes CTA to bottom so all cards align on the same baseline */}
                  <div className="flex-1" />

                  {hasPlatformLinks && (
                    <>
                      <DialogPrimitive.Trigger
                        tabIndex={isClone ? -1 : 0}
                        className="mt-2 flex h-8 w-fit items-center justify-center rounded-full border border-accent/22 bg-transparent px-4 text-[10px] font-semibold uppercase tracking-[0.10em] text-accent/72 transition-all duration-150 hover:-translate-y-px hover:border-accent/50 hover:bg-accent/[0.08] hover:text-accent focus:outline-none"
                      >
                        LISTEN ↗
                      </DialogPrimitive.Trigger>
                      <ReleaseListenContent release={release} platformLinks={platformLinks} />
                    </>
                  )}
                </div>
              </DialogPrimitive.Root>
            </article>
          )
        })}
        {/* Trailing spacer — prevents last card from being clipped by scroll boundary */}
        <div className="flex-none w-4 sm:w-6 lg:hidden" aria-hidden />
      </div>

      {/* Right fade hint */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background/85 sm:w-24" />
    </div>
  )
}
