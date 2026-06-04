"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/types/djhq"

const SLOT_INTERVAL_MS = 3_000
const FADE_MS          = 900
// Each slot advances by NUM_SLOTS positions per rotation, guaranteeing that
// slots 0, 1, 2 always display images at offsets N, N+1, N+2 (mod n) — all
// distinct whenever n > 3, both during and between transitions.
const NUM_SLOTS        = 3

interface GallerySectionProps {
  images: GalleryImage[]
}

export function GallerySection({ images }: GallerySectionProps) {
  const n = images.length

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Per-slot double-buffer state ──────────────────────────────────────────
  //
  // Each slot owns Layer A and Layer B, both permanently in the DOM.
  // Slots rotate sequentially: 0 → 1 → 2 → 0 → … every SLOT_INTERVAL_MS.
  //
  // Advance per rotation = NUM_SLOTS (not 1).  Proof that slots are always
  // distinct:  slot s fires k_s times → offset = s + 3·k_s.  For any two
  // slots a ≠ b with |k_a − k_b| ≤ 1 (guaranteed by sequential firing),
  // (O_a − O_b) mod n ≠ 0 for all n > 3.  Verified exhaustively for n = 4.
  //
  // initLayerA: slot s starts showing image s   (the initial window [0,1,2])
  // initLayerB: slot s preloads image s+NUM_SLOTS (its first rotation target)
  const initLayerA = n > 0 ? [0, 1 % n, 2 % n] : [0, 0, 0]
  const initLayerB = n > 0 ? [3 % n, 4 % n, 5 % n] : [0, 0, 0]

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

  // ── Sequential per-slot rotation (> 3 images only) ───────────────────────
  //
  // Every SLOT_INTERVAL_MS, the next slot in sequence rotates independently.
  // The back layer preloads its target for the full idle period so it is
  // already painted when it comes to front — no grey placeholder can appear.
  useEffect(() => {
    if (n <= 3) return

    const numSlotsLocal = Math.min(n, NUM_SLOTS)

    const interval = setInterval(() => {
      if (pausedRef.current || activeIndexRef.current !== null) return

      const slot = currentSlotRef.current
      currentSlotRef.current = (slot + 1) % numSlotsLocal

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

          if (nextFrontIsA) {
            // A is now front → B is back → update B to A's offset + NUM_SLOTS
            const newB = (layerAOffsetsRef.current[slot] + numSlotsLocal) % n
            setLayerBOffsets((prev) => { const a = [...prev]; a[slot] = newB; return a })
            layerBOffsetsRef.current[slot] = newB
          } else {
            // B is now front → A is back → update A to B's offset + NUM_SLOTS
            const newA = (layerBOffsetsRef.current[slot] + numSlotsLocal) % n
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
        className="mt-4 grid grid-cols-[11fr_9fr] grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:h-[510px] lg:grid-rows-[1fr_1fr]"
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
          const photoA = images[layerAOffsets[slot]]
          const photoB = images[layerBOffsets[slot]]
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

          // Open the image the user actually sees (front layer)
          const lightboxIndex = frontIsA ? layerAOffsets[slot] : layerBOffsets[slot]

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
                  className="object-cover saturate-[0.97] transition-transform duration-200 ease-out group-hover:scale-[1.01]"
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
                  className="object-cover saturate-[0.97] transition-transform duration-200 ease-out group-hover:scale-[1.01]"
                  style={{ objectPosition: `${photoB.focalX ?? 50}% ${photoB.focalY ?? 50}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
              </div>

              {/* ── Shared photo treatment — identical veil on every image ── */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.10))",
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
