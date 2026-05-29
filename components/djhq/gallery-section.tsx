"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/types/djhq"

const ROTATION_MS  = 6_000  // interval between rotations
const FADE_MS      = 700    // opacity + scale transition duration per slot
const STAGGER_MS   = [0, 120, 240] // slot 0 → 1 → 2 stagger

interface GallerySectionProps {
  images: GalleryImage[]
}

export function GallerySection({ images }: GallerySectionProps) {
  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Rotation ──────────────────────────────────────────────────────────────
  // displayedOffset: the settled, fully-visible set of images
  // incomingOffset:  the arriving set (non-null only during the transition window)
  // isEntering:      true = transition is live (CSS fires); false = idle or pre-paint
  const [displayedOffset, setDisplayedOffset] = useState(0)
  const [incomingOffset,  setIncomingOffset]  = useState<number | null>(null)
  const [isEntering,      setIsEntering]      = useState(false)

  // Refs used inside setInterval / rAF to avoid stale closures
  const pausedRef         = useRef(false)
  const activeIndexRef    = useRef<number | null>(null)
  const currentOffsetRef  = useRef(0)

  useEffect(() => { activeIndexRef.current   = activeIndex      }, [activeIndex])
  useEffect(() => { currentOffsetRef.current = displayedOffset  }, [displayedOffset])

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
      if (e.key === "Escape")      close()
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

    let settleTimer: ReturnType<typeof setTimeout> | null = null
    let raf1 = 0
    let raf2 = 0

    const interval = setInterval(() => {
      // Skip if hovered, lightbox open, or a transition is already in flight
      if (pausedRef.current || activeIndexRef.current !== null || settleTimer !== null) return

      const incoming = (currentOffsetRef.current + 1) % images.length
      setIncomingOffset(incoming)

      // Two rAFs guarantee the browser has painted the incoming layer at opacity:0
      // before we flip isEntering, so the CSS transition sees a real 0→1 change.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsEntering(true)

          // Wait for the slowest slot to finish, then settle state
          settleTimer = setTimeout(() => {
            settleTimer = null
            // All three sets are batched into one React render (React 18)
            setDisplayedOffset(incoming)
            setIncomingOffset(null)
            setIsEntering(false)
            currentOffsetRef.current = incoming
          }, STAGGER_MS[2] + FADE_MS + 80)
        })
      })
    }, ROTATION_MS)

    return () => {
      clearInterval(interval)
      if (settleTimer) clearTimeout(settleTimer)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [images.length])

  // ── Derived render values ─────────────────────────────────────────────────
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
          const displayedPhoto = images[(displayedOffset + slot) % images.length]
          const incomingPhoto  = incomingOffset !== null
            ? images[(incomingOffset + slot) % images.length]
            : null

          const delay = STAGGER_MS[slot]

          // During a live transition, clicking opens the arriving image
          const lightboxIndex = isEntering && incomingOffset !== null
            ? (incomingOffset  + slot) % images.length
            : (displayedOffset + slot) % images.length

          // Only animate when a transition is active; snap instantly when settling
          const transitionValue = isEntering || incomingOffset !== null
            ? `opacity ${FADE_MS}ms ease-in-out ${delay}ms, transform ${FADE_MS}ms ease-in-out ${delay}ms`
            : "none"

          return (
            <button
              // key by slot index — keeps the DOM node stable across rotations
              // so the CSS transition fires in-place rather than on mount/unmount
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
              {/* ── Outgoing image layer ── */}
              {/* Always present; opacity 1 when idle → 0 when entering */}
              <div
                className="absolute inset-0"
                style={{
                  opacity:    isEntering ? 0 : 1,
                  transform:  isEntering ? "scale(0.985)" : "scale(1)",
                  transition: transitionValue,
                }}
              >
                <Image
                  src={displayedPhoto.imageUrl}
                  alt={displayedPhoto.altText}
                  fill
                  loading="eager"
                  sizes={
                    slot === 0
                      ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
                      : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"
                  }
                  className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  style={{ objectPosition: `${displayedPhoto.focalX ?? 50}% ${displayedPhoto.focalY ?? 50}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
              </div>

              {/* ── Incoming image layer ── */}
              {/* Mounted at opacity 0 before entering, fades to 1 when entering */}
              {incomingPhoto !== null && (
                <div
                  className="absolute inset-0"
                  style={{
                    opacity:    isEntering ? 1 : 0,
                    transform:  isEntering ? "scale(1)" : "scale(1.015)",
                    transition: `opacity ${FADE_MS}ms ease-in-out ${delay}ms, transform ${FADE_MS}ms ease-in-out ${delay}ms`,
                  }}
                >
                  <Image
                    src={incomingPhoto.imageUrl}
                    alt={incomingPhoto.altText}
                    fill
                    sizes={
                      slot === 0
                        ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
                        : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"
                    }
                    className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    style={{ objectPosition: `${incomingPhoto.focalX ?? 50}% ${incomingPhoto.focalY ?? 50}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
                </div>
              )}

              {/* ── Hover overlay ── */}
              {/* DOM-last so it always paints above both image layers */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100">
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
