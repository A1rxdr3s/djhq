"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/types/djhq"

interface GallerySectionProps {
  images: GalleryImage[]
}

export function GallerySection({ images }: GallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

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

  const displayImages = images.slice(0, 3)
  const activePhoto = activeIndex !== null ? images[activeIndex] : null

  if (images.length === 0) return null

  return (
    <>
      {/* ── Masonry grid ── */}
      <div className="mt-4 grid grid-cols-[11fr_9fr] grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:h-[480px]">
        {displayImages.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "group relative cursor-pointer overflow-hidden bg-secondary text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              index === 0
                ? "col-span-1 row-span-2 aspect-[4/5] rounded-2xl shadow-md shadow-black/25 hover:shadow-lg hover:shadow-black/35 lg:aspect-auto lg:rounded-[1.5rem]"
                : "col-span-1 aspect-[4/3] rounded-xl shadow-sm shadow-black/20 hover:shadow-md hover:shadow-black/30 lg:aspect-auto",
            )}
          >
            <Image
              src={photo.imageUrl}
              alt={photo.altText}
              fill
              loading="eager"
              sizes={
                index === 0
                  ? "(min-width: 1024px) 600px, (min-width: 768px) 45vw, 60vw"
                  : "(min-width: 1024px) 450px, (min-width: 768px) 37vw, 40vw"
              }
              className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
            />
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                View Photo ↗
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Lightbox ── */}
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
