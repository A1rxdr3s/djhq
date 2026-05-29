"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/types/djhq"

const ROTATION_MS = 6_000

interface GallerySectionProps {
  images: GalleryImage[]
}

export function GallerySection({ images }: GallerySectionProps) {
  // Lightbox state
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Rotation state
  const [rotationOffset, setRotationOffset] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)

  // Refs to avoid stale closures inside the interval
  const pausedRef = useRef(false)
  const activeIndexRef = useRef<number | null>(null)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

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
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") prev()
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
    const timer = setInterval(() => {
      if (pausedRef.current || activeIndexRef.current !== null) return
      // Fade out → swap images → fade in
      setContentVisible(false)
      setTimeout(() => {
        setRotationOffset((prev) => (prev + 3) % images.length)
        setContentVisible(true)
      }, 500)
    }, ROTATION_MS)
    return () => clearInterval(timer)
  }, [images.length])

  // ── Display slots ─────────────────────────────────────────────────────────
  // Cap at available image count so 1- or 2-image galleries don't duplicate
  const numSlots = Math.min(images.length, 3)
  const slots = Array.from({ length: numSlots }, (_, i) => ({
    photo: images[(rotationOffset + i) % images.length],
    lightboxIndex: (rotationOffset + i) % images.length,
  }))

  const activePhoto = activeIndex !== null ? images[activeIndex] : null

  if (images.length === 0) return null

  return (
    <>
      {/* ── Masonry grid ─────────────────────────────────────────────────── */}
      <div
        className="mt-4 grid grid-cols-[11fr_9fr] grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:h-[480px]"
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        {slots.map(({ photo, lightboxIndex }, slot) => (
          <button
            // key by slot position so the button DOM node is reused across rotations;
            // only the image src inside changes, which the fade transition covers.
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
            {/* Image + gradient — this layer fades during rotation */}
            <div
              className={cn(
                "absolute inset-0 transition-[opacity,transform] duration-500 ease-in-out",
                contentVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
              )}
            >
              <Image
                src={photo.imageUrl}
                alt={photo.altText}
                fill
                loading="eager"
                sizes={
                  slot === 0
                    ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
                    : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"
                }
                className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
            </div>

            {/* Hover overlay — lives outside the fading layer so it's always ready */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/87">
                View Photo ↗
              </span>
            </div>
          </button>
        ))}
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
          {/* Image */}
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

          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/60 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>

          {/* Index counter */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.10] bg-black/50 px-4 py-1.5 text-xs font-medium tabular-nums text-white/50">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Prev */}
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

          {/* Next */}
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
