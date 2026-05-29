"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/types/djhq"

const ROTATION_MS = 6_000
const FADE_MS     = 900
// Slot stagger delays: featured → top-right → bottom-right
const STAGGER_MS  = [0, 150, 300] as const

interface GallerySectionProps {
  images: GalleryImage[]
}

export function GallerySection({ images }: GallerySectionProps) {
  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Double-buffer rotation ────────────────────────────────────────────────
  //
  // Two layers (A and B) are permanently in the DOM per slot — never mounted
  // or unmounted.  Only their opacity flips, so no grey background can appear
  // between unmount and the browser painting the new image.
  //
  // layerAOffset / layerBOffset: which image from `images` each layer shows.
  // frontIsA:   true  → Layer A visible (opacity 1), Layer B preloading (opacity 0)
  //             false → Layer B visible (opacity 1), Layer A preloading (opacity 0)
  // isTransitioning: enables CSS transitions; disabled at idle so settling
  //                  snaps instantly without animating.
  const [layerAOffset,    setLayerAOffset]    = useState(0)
  const [layerBOffset,    setLayerBOffset]    = useState(() => Math.min(1, images.length - 1))
  const [frontIsA,        setFrontIsA]        = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Refs used inside timers/rAF to avoid stale-closure bugs
  const pausedRef       = useRef(false)
  const activeIndexRef  = useRef<number | null>(null)
  const layerAOffsetRef = useRef(0)
  const layerBOffsetRef = useRef(Math.min(1, images.length - 1))
  const frontIsARef     = useRef(true)
  const settleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])

  // ── Lightbox callbacks ────────────────────────────────────────────────────
  const close = useCallback(() => setActiveIndex(null), [])

  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  )

  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
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

  // ── Auto-rotation (> 3 images only) ──────────────────────────────────────
  useEffect(() => {
    if (images.length <= 3) return

    const interval = setInterval(() => {
      if (
        pausedRef.current          ||
        activeIndexRef.current !== null ||
        settleTimerRef.current !== null
      ) return

      // Step 1 — enable CSS transitions (layers are still at their current values).
      setIsTransitioning(true)

      // Step 2 — one rAF later, flip which layer is front.  The browser has now
      // committed render-1 (transitions on, values unchanged), so it has a valid
      // "from" state and will animate the property change in render-2.
      requestAnimationFrame(() => {
        const nextFrontIsA = !frontIsARef.current
        setFrontIsA(nextFrontIsA)
        frontIsARef.current = nextFrontIsA

        // Step 3 — after every staggered slot has finished, settle.
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null

          // Disable transitions BEFORE updating the offset of the now-back layer
          // so the image-source swap is invisible (layer is at opacity 0).
          setIsTransitioning(false)

          if (nextFrontIsA) {
            // Layer A came to front → Layer B is now back → update B to preload next
            const newB = (layerAOffsetRef.current + 1) % images.length
            setLayerBOffset(newB)
            layerBOffsetRef.current = newB
          } else {
            // Layer B came to front → Layer A is now back → update A to preload next
            const newA = (layerBOffsetRef.current + 1) % images.length
            setLayerAOffset(newA)
            layerAOffsetRef.current = newA
          }
        }, STAGGER_MS[2] + FADE_MS + 80)
      })
    }, ROTATION_MS)

    return () => {
      clearInterval(interval)
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    }
  }, [images.length])

  // ── Derived ───────────────────────────────────────────────────────────────
  const numSlots   = Math.min(images.length, 3)
  const activePhoto = activeIndex !== null ? images[activeIndex] : null

  if (images.length === 0) return null

  return (
    <>
      {/* ── Masonry grid ─────────────────────────────────────────────────── */}
      <div
        className="mt-4 grid grid-cols-[11fr_9fr] grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:flex-1 lg:min-h-0 lg:grid-rows-[1fr_1fr]"
        onMouseEnter={() => { pausedRef.current = true  }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        {Array.from({ length: numSlots }, (_, slot) => {
          const photoA = images[(layerAOffset + slot) % images.length]
          const photoB = images[(layerBOffset + slot) % images.length]

          // Layer A is front when frontIsA; Layer B is front otherwise.
          // Front  layer: opacity 1, scale(1)
          // Back   layer: opacity 0, scale(0.99) — invisible but preloading
          //   → when it comes to front it zooms in from 0.99 → 1 (subtle)
          //   → when it goes to back it zooms out from 1 → 0.99 (subtle)

          const delay = STAGGER_MS[slot]
          const transitionCSS = isTransitioning
            ? `opacity ${FADE_MS}ms ease-in-out ${delay}ms, transform ${FADE_MS}ms ease-in-out ${delay}ms`
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

          // Open the image the user actually sees (front layer).
          const frontOffset    = frontIsA ? layerAOffset : layerBOffset
          const lightboxIndex  = (frontOffset + slot) % images.length

          const sizesAttr = slot === 0
            ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
            : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"

          return (
            <button
              // Keyed by slot — DOM node is STABLE across rotations.
              // No remount means no grey-flash between unmount and image paint.
              key={slot}
              type="button"
              onClick={() => setActiveIndex(lightboxIndex)}
              className={cn(
                "group relative cursor-pointer overflow-hidden bg-secondary text-left",
                "border border-white/10 transition-[transform,box-shadow,border-color] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-accent/70 hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
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
                  className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  style={{ objectPosition: `${photoA.focalX ?? 50}% ${photoA.focalY ?? 50}%` }}
                />
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
                  className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  style={{ objectPosition: `${photoB.focalX ?? 50}% ${photoB.focalY ?? 50}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
              </div>

              {/* ── Hover overlay — always above both image layers ── */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100"
                style={{ zIndex: 10 }}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/87">
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
            {activeIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/60 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Previous photo</span>
            </button>
          )}

          {images.length > 1 && (
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
