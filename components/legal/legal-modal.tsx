"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { LegalContent, type LegalArtist } from "./legal-content"

type LegalType = "privacy" | "terms" | "cookies"

type Props = {
  open: boolean
  type: LegalType | null
  artist?: LegalArtist | null
  onClose: () => void
}

const TITLE_MAP: Record<LegalType, string> = {
  privacy: "Privacy",
  terms:   "Terms of Use",
  cookies: "Cookies",
}

export function LegalModal({ open, type, artist, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Move focus to close button when modal opens
  useEffect(() => {
    if (open) closeButtonRef.current?.focus()
  }, [open])

  if (!open || !type) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={TITLE_MAP[type]}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered card on desktop */}
      <div className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.07] bg-[#0b0b0b] sm:max-w-[720px] sm:rounded-2xl" style={{ maxHeight: "93dvh" }}>

        {/* Header bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5 sm:px-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/30">
            {TITLE_MAP[type]}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/30 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
          <LegalContent type={type} artist={artist} inModal />
        </div>

      </div>
    </div>
  )
}
