"use client"

import { useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Music2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Release } from "@/types/djhq"
import { getReleasePlatformLinks } from "@/lib/release-platforms"
import { ReleaseListenPanel } from "@/components/release-listen-panel"

function formatReleaseDateCatalog(releaseDate: string): string | null {
  if (!releaseDate) return null
  const date = new Date(releaseDate)
  if (isNaN(date.getTime())) return null
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase()
}

const VERSION_TYPE_LABELS: Record<string, string> = {
  original_mix: "Original Mix",
  extended_mix:  "Extended Mix",
  radio_edit:    "Radio Edit",
  remix:         "Remix",
  club_mix:      "Club Mix",
  dub_mix:       "Dub Mix",
  instrumental:  "Instrumental",
  vip_mix:       "VIP Mix",
  edit:          "Edit",
  mashup:        "Mashup",
  bootleg:       "Bootleg",
  rework:        "Rework",
  acapella:      "Acapella",
  tool:          "Tool",
}

const RELEASE_TYPE_LABELS: Record<string, string> = {
  single:      "Single",
  ep:          "EP",
  album:       "Album",
  compilation: "Compilation",
  va:          "VA",
}

function isReleaseRemix(release: Release): boolean {
  if (release.versionType === "remix") return true
  return /remix/i.test(release.title) || /remix/i.test(release.credits ?? "")
}

const ADVANCE_MS = 8_000

type Props = {
  releases: Release[]
  artistName: string
}

export function SelectedReleasesCarousel({ releases, artistName }: Props) {
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
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 select-none [scrollbar-width:none] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        style={{ cursor: "grab" }}
      >
        {items.map((release, i) => {
          const platformLinks = getReleasePlatformLinks(release)
          const hasArtwork = !!(release.artworkUrl?.trim())
          const isRemix = isReleaseRemix(release)
          const catalogDate = formatReleaseDateCatalog(release.releaseDate)
          const isClone = i >= releases.length

          // Badge: type + version
          const typeLabel = release.releaseType ? (RELEASE_TYPE_LABELS[release.releaseType] ?? null) : null
          const isRemixVersion = release.versionType === "remix" || (!release.versionType && isRemix)
          const versionLabel = release.versionType
            ? (VERSION_TYPE_LABELS[release.versionType] ?? release.versionType)
            : isRemix ? "Remix" : null
          const versionDisplay = isRemixVersion && release.remixer
            ? `${release.remixer} Remix`
            : versionLabel
          const badges = [typeLabel, versionDisplay].filter(Boolean) as string[]

          // Credits: hide when it's just the artist's own name
          const normalizedCredits = release.credits?.trim().toLowerCase() ?? ""
          const normalizedArtist = artistName.trim().toLowerCase()
          const creditsToShow =
            normalizedCredits && normalizedCredits !== normalizedArtist
              ? release.credits
              : null

          return (
            <article
              key={`${release.id}-${i}`}
              aria-hidden={isClone}
              className="w-[min(72vw,200px)] shrink-0 snap-start sm:w-[200px] lg:w-[200px]"
            >
              {/* Artwork with hover lift + overlay */}
              <div className="group relative aspect-square overflow-hidden rounded-2xl bg-secondary shadow-md shadow-black/30 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02]">
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
                {/* Hover overlay → primary platform URL */}
                <a
                  href={release.platformUrl}
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
              </div>

              {/* Metadata */}
              <div className="mt-3 min-w-0">
                {/* Type / version badges */}
                {badges.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-accent/25 bg-accent/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent/70"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <h3 className="text-balance text-base font-bold leading-tight text-foreground">
                  {release.title}
                </h3>

                {creditsToShow ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/75">{creditsToShow}</p>
                ) : null}

                <p className={cn(
                  "truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/55",
                  creditsToShow ? "mt-1.5" : "mt-1",
                )}>
                  {release.label}
                </p>

                {catalogDate ? (
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.10em] text-foreground/30">
                    {catalogDate}
                  </p>
                ) : null}

                <ReleaseListenPanel release={release} platformLinks={platformLinks} />
              </div>
            </article>
          )
        })}
      </div>

      {/* Right fade hint */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background/85 sm:w-24" />
    </div>
  )
}
