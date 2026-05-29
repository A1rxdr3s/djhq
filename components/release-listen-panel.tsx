"use client"

import Image from "next/image"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowUpRight, Music2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Release } from "@/types/djhq"
import type { PlatformLink } from "@/lib/release-platforms"

interface ReleaseListenPanelProps {
  release: Release
  platformLinks: PlatformLink[]
}

export function ReleaseListenPanel({ release, platformLinks }: ReleaseListenPanelProps) {
  if (platformLinks.length === 0) return null

  const releaseYear = release.releaseDate?.slice(0, 4) ?? null
  const hasArtwork = !!(release.artworkUrl?.trim())

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-accent/30 bg-accent/10 px-4 text-[11px] font-semibold uppercase tracking-[0.10em] text-accent transition-all duration-150 hover:-translate-y-px hover:border-accent/50 hover:bg-accent/[0.15] focus:outline-none"
      >
        Listen
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 focus:outline-none",
            // Mobile: bottom sheet
            "max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-2xl",
            // Desktop: centered panel
            "sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            // Panel styling
            "bg-[#0c0c0c] border border-white/[0.08] shadow-2xl shadow-black/60",
            // Animations
            "data-[state=open]:animate-in data-[state=closed]:animate-out duration-200",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "max-sm:data-[state=open]:slide-in-from-bottom-4 max-sm:data-[state=closed]:slide-out-to-bottom-4",
            "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
          )}
        >
          {/* Mobile drag bar */}
          <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-white/[0.12] sm:hidden" />

          {/* Header: artwork + release info + close */}
          <div className="flex items-center gap-4 p-5">
            <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
              {hasArtwork ? (
                <Image
                  src={release.artworkUrl}
                  alt={`${release.title} artwork`}
                  fill
                  sizes="60px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music2 className="h-5 w-5 text-white/20" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-sm font-bold text-white">
                {release.title}
              </DialogPrimitive.Title>
              {release.credits ? (
                <p className="mt-0.5 truncate text-xs text-white/50">{release.credits}</p>
              ) : null}
              <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">
                {[release.label, releaseYear].filter(Boolean).join(" · ")}
              </p>
            </div>
            <DialogPrimitive.Close className="ml-1 shrink-0 rounded-full p-1.5 text-white/30 transition-colors duration-100 hover:bg-white/[0.06] hover:text-white/60 focus:outline-none focus-visible:text-white/60">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-white/[0.06]" />

          {/* Platform rows */}
          <div className="py-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
            {platformLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between px-5 py-3.5 transition-colors duration-100 hover:bg-white/[0.04]"
              >
                <span className="text-sm font-medium text-white/75 transition-colors duration-100 group-hover:text-white/90">
                  {link.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/30 transition-colors duration-100 group-hover:text-accent/70">
                  {link.action}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </a>
            ))}
          </div>

          <DialogPrimitive.Description className="sr-only">
            Platform links for {release.title}. Select a platform to listen or purchase.
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
