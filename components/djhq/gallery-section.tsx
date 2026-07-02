"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage, GalleryPolish } from "@/types/djhq"

const SLOT_INTERVAL_MS = 3_000
const FADE_MS          = 900
const NUM_SLOTS        = 3

// ── Per-image color grade helpers ─────────────────────────────────────────────
// Overlay approach for tinted grades (warm, red_club, blue_night, green_laser):
//   an absolutely positioned div with a color background at low opacity.
// Filter approach for desaturation grades (mono, muted):
//   inline CSS filter on the <img> element, overriding the base Tailwind classes.

const GRADE_OVERLAY_COLOR: Record<string, string> = {
  warm:        "255,160,50",
  red_club:    "255,40,20",
  blue_night:  "20,60,210",
  green_laser: "30,220,80",
}
const GRADE_MAX_OPACITY: Record<string, number> = {
  warm: 0.18, red_club: 0.16, blue_night: 0.16, green_laser: 0.14,
}

function gradeOverlayStyle(photo: GalleryImage): React.CSSProperties | null {
  const g = photo.colorGrade
  const s = photo.colorGradeStrength ?? 0
  if (!g || g === "none" || s === 0) return null
  const rgb = GRADE_OVERLAY_COLOR[g]
  const maxOp = GRADE_MAX_OPACITY[g]
  if (!rgb || maxOp === undefined) return null
  const opacity = (Math.min(100, Math.max(0, s)) / 100) * maxOp
  if (opacity < 0.001) return null
  return { background: `rgba(${rgb},${opacity.toFixed(3)})` }
}

function gradeImageFilter(photo: GalleryImage): string | undefined {
  const g = photo.colorGrade
  const s = photo.colorGradeStrength ?? 0
  if (!g || g === "none" || s === 0) return undefined
  const t = Math.min(100, Math.max(0, s)) / 100
  if (g === "mono")  return `saturate(${(1 - t * 0.9).toFixed(3)}) brightness(0.96)`
  if (g === "muted") return `saturate(${(1 - t * 0.5).toFixed(3)}) contrast(${(1 - t * 0.08).toFixed(3)}) brightness(0.96)`
  return undefined
}

interface GallerySectionProps {
  images: GalleryImage[]
  galleryPolish?: GalleryPolish | null
}

export function GallerySection({ images, galleryPolish }: GallerySectionProps) {
  const n = images.length

  // ── Placement-aware per-slot pools ────────────────────────────────────────
  //
  // Slot 0 (large, tall) rotates within largePool.
  // Slot 1 (top right)   rotates within topPool.
  // Slot 2 (bottom right) rotates within bottomPool.
  // Each falls back to autoPool (null/"auto") then to all images if its
  // dedicated pool is empty.  This lets artists pin specific photos to slots
  // while the remaining images fill gaps automatically.
  const slotPools = useMemo(() => {
    const largePool  = images.filter((i) => i.momentsPlacement === "large")
    const topPool    = images.filter((i) => i.momentsPlacement === "top")
    const bottomPool = images.filter((i) => i.momentsPlacement === "bottom")
    const autoPool   = images.filter((i) => !i.momentsPlacement || i.momentsPlacement === "auto")
    const fallback   = autoPool.length > 0 ? autoPool : images
    return [
      largePool.length  > 0 ? largePool  : fallback,
      topPool.length    > 0 ? topPool    : fallback,
      bottomPool.length > 0 ? bottomPool : fallback,
    ] as [GalleryImage[], GalleryImage[], GalleryImage[]]
  }, [images])

  // Keep a ref so the rotation effect can read current pools without re-subscribing
  const slotPoolsRef = useRef(slotPools)
  useEffect(() => { slotPoolsRef.current = slotPools }, [slotPools])

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Per-slot double-buffer state ──────────────────────────────────────────
  //
  // Each slot owns Layer A and Layer B, both permanently in the DOM.
  // Offsets are indices into the slot's own pool (not the global images array).
  // Layer A starts at 0; Layer B preloads offset 1 if the pool has > 1 image.
  const initLayerA = [0, 0, 0]
  const initLayerB = slotPools.map((pool) => (pool.length > 1 ? 1 : 0))

  const [layerAOffsets,    setLayerAOffsets]    = useState<number[]>(initLayerA)
  const [layerBOffsets,    setLayerBOffsets]    = useState<number[]>(initLayerB)
  const [frontIsAs,        setFrontIsAs]        = useState<boolean[]>([true, true, true])
  const [isTransitionings, setIsTransitionings] = useState<boolean[]>([false, false, false])

  // Refs used inside timers/rAF to avoid stale-closure bugs
  const pausedRef        = useRef(false)
  const activeIndexRef   = useRef<number | null>(null)
  const layerAOffsetsRef = useRef<number[]>([...initLayerA])
  const layerBOffsetsRef = useRef<number[]>([...initLayerB])
  const frontIsAsRef     = useRef<boolean[]>([true, true, true])
  const settleTimerRefs  = useRef<Array<ReturnType<typeof setTimeout> | null>>([null, null, null])
  const currentSlotRef   = useRef<number>(0)
  // Delayed-resume timer: rotation restarts 4s after the cursor leaves the grid
  const resumeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])

  // Clean up the delayed-resume timer on unmount
  useEffect(() => {
    const ref = resumeTimerRef
    return () => { if (ref.current) clearTimeout(ref.current) }
  }, [])

  // ── Lightbox callbacks ────────────────────────────────────────────────────
  const close = useCallback(() => setActiveIndex(null), [])

  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + n) % n)),
    [n],
  )

  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % n)),
    [n],
  )

  useEffect(() => {
    if (activeIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")          close()
      else if (e.key === "ArrowLeft")  prev()
      else if (e.key === "ArrowRight") next()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [activeIndex, close, prev, next])

  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [activeIndex])

  // ── Sequential per-slot rotation ─────────────────────────────────────────
  //
  // Every SLOT_INTERVAL_MS the next slot rotates, advancing by 1 within its
  // own pool.  A slot is skipped silently if its pool has ≤ 1 image.
  useEffect(() => {
    if (n <= 3) return

    const interval = setInterval(() => {
      if (pausedRef.current || activeIndexRef.current !== null) return

      const slot = currentSlotRef.current
      currentSlotRef.current = (slot + 1) % NUM_SLOTS

      // Skip slots whose pool can't rotate
      if (slotPoolsRef.current[slot].length <= 1) return
      if (settleTimerRefs.current[slot] !== null) return

      // Step 1 — enable CSS transition for this slot
      setIsTransitionings((prev) => { const a = [...prev]; a[slot] = true; return a })

      // Step 2 — one rAF later, flip front/back so CSS sees a valid from-state
      requestAnimationFrame(() => {
        const nextFrontIsA = !frontIsAsRef.current[slot]
        setFrontIsAs((prev) => { const a = [...prev]; a[slot] = nextFrontIsA; return a })
        frontIsAsRef.current[slot] = nextFrontIsA

        // Step 3 — settle: disable transition, preload next target into back layer
        settleTimerRefs.current[slot] = setTimeout(() => {
          settleTimerRefs.current[slot] = null
          setIsTransitionings((prev) => { const a = [...prev]; a[slot] = false; return a })

          const poolSize = slotPoolsRef.current[slot].length
          if (nextFrontIsA) {
            // A is now front → B is back → update B to next after A
            const newB = (layerAOffsetsRef.current[slot] + 1) % poolSize
            setLayerBOffsets((prev) => { const a = [...prev]; a[slot] = newB; return a })
            layerBOffsetsRef.current[slot] = newB
          } else {
            // B is now front → A is back → update A to next after B
            const newA = (layerBOffsetsRef.current[slot] + 1) % poolSize
            setLayerAOffsets((prev) => { const a = [...prev]; a[slot] = newA; return a })
            layerAOffsetsRef.current[slot] = newA
          }
        }, FADE_MS + 80)
      })
    }, SLOT_INTERVAL_MS)

    const timers = settleTimerRefs.current
    return () => {
      clearInterval(interval)
      timers.forEach((t) => { if (t) clearTimeout(t) })
    }
  }, [n])

  // ── Derived ───────────────────────────────────────────────────────────────
  const numSlots    = Math.min(n, NUM_SLOTS)
  const activePhoto = activeIndex !== null ? images[activeIndex] : null

  if (n === 0) return null

  return (
    <>
      {/* ── Masonry grid ─────────────────────────────────────────────────── */}
      <div
        className="mt-4 grid grid-cols-[11fr_9fr] grid-rows-2 gap-3 sm:gap-3.5 lg:mt-5 lg:h-[710px] xl:h-[780px] lg:grid-rows-[1fr_1fr]"
        onMouseEnter={() => {
          if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current)
            resumeTimerRef.current = null
          }
          pausedRef.current = true
        }}
        onMouseLeave={() => {
          if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
          resumeTimerRef.current = setTimeout(() => {
            resumeTimerRef.current = null
            pausedRef.current = false
          }, 4_000)
        }}
      >
        {Array.from({ length: numSlots }, (_, slot) => {
          const pool   = slotPools[slot]
          const photoA = pool[layerAOffsets[slot]] ?? images[0]
          const photoB = pool[layerBOffsets[slot]] ?? images[0]
          const frontIsA      = frontIsAs[slot]
          const isTransitioning = isTransitionings[slot]

          const transitionCSS = isTransitioning
            ? `opacity ${FADE_MS}ms ease-in-out, transform ${FADE_MS}ms ease-in-out`
            : "none"

          const layerAStyle: React.CSSProperties = {
            position:   "absolute",
            inset:      0,
            opacity:    frontIsA ? 1 : 0,
            transform:  frontIsA ? "scale(1)" : "scale(0.99)",
            transition: transitionCSS,
            zIndex:     frontIsA ? 1 : 0,
          }
          const layerBStyle: React.CSSProperties = {
            position:   "absolute",
            inset:      0,
            opacity:    frontIsA ? 0 : 1,
            transform:  frontIsA ? "scale(0.99)" : "scale(1)",
            transition: transitionCSS,
            zIndex:     frontIsA ? 0 : 1,
          }

          // Open the image the user actually sees (front layer) in the global lightbox
          const frontPhoto = frontIsA ? photoA : photoB
          const lightboxIndex = images.indexOf(frontPhoto)

          // Per-photo color grade derived values (computed once, used twice — A and B layers)
          const overlayA = gradeOverlayStyle(photoA)
          const overlayB = gradeOverlayStyle(photoB)
          const polishFilter = galleryPolish === "soft" ? "saturate(0.97) brightness(0.97)" : undefined
          const perA = gradeImageFilter(photoA)
          const perB = gradeImageFilter(photoB)
          const filterA = polishFilter && perA ? `${polishFilter} ${perA}` : polishFilter ?? perA
          const filterB = polishFilter && perB ? `${polishFilter} ${perB}` : polishFilter ?? perB

          const sizesAttr = slot === 0
            ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
            : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"

          return (
            <button
              key={slot}
              type="button"
              aria-label="View photo"
              onClick={() => setActiveIndex(lightboxIndex)}
              className={cn(
                "group relative cursor-pointer overflow-hidden bg-secondary text-left",
                "border border-white/[0.06] transition-[transform,border-color,box-shadow] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-accent/45 hover:[box-shadow:0_0_18px_color-mix(in_srgb,var(--accent)_10%,transparent)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                slot === 0
                  ? "col-span-1 row-span-2 aspect-[4/5] rounded-2xl shadow-md shadow-black/25 lg:aspect-auto lg:rounded-[1.5rem]"
                  : "col-span-1 aspect-[4/3] rounded-xl shadow-sm shadow-black/20 lg:aspect-auto",
              )}
            >
              {/* ── Layer A — always in the DOM ── */}
              <div style={layerAStyle}>
                <Image
                  src={photoA.imageUrl}
                  alt={photoA.altText}
                  fill
                  loading="eager"
                  sizes={sizesAttr}
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.01]"
                  style={{
                    objectPosition: `${photoA.focalX ?? 50}% ${photoA.focalY ?? 50}%`,
                    filter: filterA,
                  }}
                />
                {overlayA && <div className="pointer-events-none absolute inset-0" style={overlayA} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
              </div>

              {/* ── Layer B — always in the DOM ── */}
              <div style={layerBStyle}>
                <Image
                  src={photoB.imageUrl}
                  alt={photoB.altText}
                  fill
                  loading="eager"
                  sizes={sizesAttr}
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.01]"
                  style={{
                    objectPosition: `${photoB.focalX ?? 50}% ${photoB.focalY ?? 50}%`,
                    filter: filterB,
                  }}
                />
                {overlayB && <div className="pointer-events-none absolute inset-0" style={overlayB} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
              </div>

              {/* ── Neutral dark vignette ────────────────────────────────────── */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 100%)",
                  zIndex: 2,
                }}
              />

              {/* ── Hover overlay — always above both image layers ── */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/28 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ zIndex: 10 }}
              >
                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/70">
                  View Photo ↗
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {activePhoto !== null && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery lightbox"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={close}
        >
          <div
            className="relative h-[85vh] w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activePhoto.imageUrl}
              alt={activePhoto.altText}
              fill
              sizes="85vw"
              className="object-contain"
              style={{ objectPosition: `${activePhoto.focalX ?? 50}% ${activePhoto.focalY ?? 50}%` }}
            />
          </div>

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/60 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.10] bg-black/50 px-4 py-1.5 text-xs font-medium tabular-nums text-white/50">
            {activeIndex + 1} / {n}
          </div>

          {n > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/60 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Previous photo</span>
            </button>
          )}

          {n > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/60 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Next photo</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
