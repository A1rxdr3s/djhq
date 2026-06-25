"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { StoryImage } from "@/components/djhq/story-image"
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Calendar, X, Link2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"
import type { CareerTimelineItem } from "@/types/djhq"
import {
  getPublicCareerUpdates,
} from "@/lib/djhq/career-updates"
import { normalizeExternalImageUrl } from "@/lib/media"

// ── Constants ─────────────────────────────────────────────────────────────────

// How many items to show in the mosaic grid before "View all" kicks in.
// Show up to 9 (one per slot); fewer when count < 9.
function computeGridLimit(count: number): number {
  if (count >= 9) return 9
  return count
}

// ── Editorial mosaic — slot system ───────────────────────────────────────────
//
// 12-column CSS grid, grid-auto-rows: 86px. 6 rows total. 9 active slots.
// Section title sits above the grid (not inside it). All slots are content tiles.
//
//   Row 1: [L-TALL  3col r6] [TOP-FEAT-PRI  4col r2] [TOP-FEAT-SEC 2col r2] [R-TOP 3col r2]
//   Row 2: [L-TALL  r6     ] [TOP-FEAT-PRI  r2     ] [TOP-FEAT-SEC r2     ] [R-TOP r2     ]
//   Row 3: [L-TALL  r6     ] [COMPACT-A     3col r2] [COMPACT-B    3col r2] [R-BOT 3col r4]
//   Row 4: [L-TALL  r6     ] [COMPACT-A     r2     ] [COMPACT-B    r2     ] [R-BOT r4     ]
//   Row 5: [L-TALL  r6     ] [BOTTOM-L      3col r2] [BOTTOM-R     3col r2] [R-BOT r4     ]
//   Row 6: [L-TALL  r6     ] [BOTTOM-L      r2     ] [BOTTOM-R     r2     ] [R-BOT r4     ]
//
// Top center 60/40 split (4+2 = 6 cols total, same footprint as old hero):
//   top-feature-primary   — 4col × 2row = dominant/wider (~67% of top-center area)
//   top-feature-secondary — 2col × 2row = supporting/narrower (~33%)
//
// Primary assignment: storySlot field from HQ maps directly to a named slot.
// Conflicts (two items with the same storySlot): first in priority-sorted list wins.
// Fallback for items without storySlot: fill remaining slots in ORDERED_SLOTS order.
//
// Total grid height: 6 × 86 + 5 × 12 = 576 px (unchanged).

type StorySlotId =
  | 'left-tall-story'
  | 'top-feature-primary'
  | 'top-feature-secondary'
  | 'right-top'
  | 'compact-a'
  | 'compact-b'
  | 'right-bottom'
  | 'bottom-left'
  | 'bottom-right'

const SLOT_DESKTOP_CLASSES: Record<StorySlotId, string> = {
  'left-tall-story':     "lg:[grid-column:1/4] lg:[grid-row:1/7]",   // 3col × 6row — full left column
  'top-feature-primary': "lg:[grid-column:4/8] lg:[grid-row:1/3]",   // 4col × 2row — top centre dominant (~60%)
  'top-feature-secondary': "lg:[grid-column:8/10] lg:[grid-row:1/3]",// 2col × 2row — top centre supporting (~40%)
  'right-top':           "lg:[grid-column:10/13] lg:[grid-row:1/3]",  // 3col × 2row — top right
  'compact-a':           "lg:[grid-column:4/7] lg:[grid-row:3/5]",    // 3col × 2row
  'compact-b':           "lg:[grid-column:7/10] lg:[grid-row:3/5]",   // 3col × 2row
  'right-bottom':        "lg:[grid-column:10/13] lg:[grid-row:3/7]",  // 3col × 4row — tall right bottom
  'bottom-left':         "lg:[grid-column:4/7] lg:[grid-row:5/7]",    // 3col × 2row — lower left
  'bottom-right':        "lg:[grid-column:7/10] lg:[grid-row:5/7]",   // 3col × 2row — lower right
}

// Primary featured positions — use PrimaryCard for richer typographic treatment.
const PRIMARY_SLOTS = new Set<StorySlotId>(['left-tall-story', 'top-feature-primary'])

// Fill order when items have no explicit storySlot assignment.
const ORDERED_SLOTS: StorySlotId[] = [
  'left-tall-story',
  'top-feature-primary',
  'top-feature-secondary',
  'right-bottom',
  'compact-a',
  'compact-b',
  'right-top',
  'bottom-left',
  'bottom-right',
]

// Maps legacy slot IDs to current canonical names.
// 'hero' → top-feature-primary (migration 064 remaps DB rows; this handles lingering values).
// 'wide-bottom' → bottom-left (migration 062).
const SLOT_MIGRATION: Record<string, StorySlotId> = {
  'left-anchor': 'left-tall-story',
  'text-left':   'left-tall-story',
  'right-tall':  'right-bottom',
  'text-right':  'right-top',
  'hero':        'top-feature-primary',
  'wide-bottom': 'bottom-left',
}

// ── Text-density system ───────────────────────────────────────────────────────
//
// Resolves the concrete description display mode for a card.
// Explicit overrides (anything other than 'auto') are passed through directly.
// Auto rules are based on slot zone, image presence, and media treatment —
// never on milestone title, venue, artist name, or any content-specific value.
function resolveDescriptionMode(
  slot: StorySlotId,
  hasImage: boolean,
  treatment: CareerTimelineItem['imageTreatment'],
  explicit: CareerTimelineItem['descriptionMode'],
): 'full' | 'short' | 'minimal' | 'hidden' {
  if (explicit && explicit !== 'auto') return explicit

  // Image-backed cards: hide description in auto mode regardless of slot or treatment.
  // contain  = poster/artwork/flyer full composition
  // blurred-fill = release/artwork treatment
  // cover    = event photo or location image
  // All benefit from clean overlay: category · year / title / location only.
  // HQ can always override via explicit descriptionMode.
  if (hasImage) return 'hidden'

  // Text-only cards: description is the primary content — show it.
  // Actual line clamp depth is determined by the card component (PrimaryCard vs SecondaryCard)
  // and slot size (right-bottom gets an extra line via slot-aware clamping).
  return 'short'
}

// ── Slot resolver ─────────────────────────────────────────────────────────────
//
// Resolves which item occupies each slot:
//   1. Items with storySlot claim that named slot (first-wins per slot; items are
//      already priority-sorted by getPublicCareerUpdates → featured → sort_order → date).
//   2. Remaining items fill unclaimed slots in ORDERED_SLOTS order.
//   Legacy slot IDs are silently remapped via SLOT_MIGRATION before assignment.
function resolveSlots(
  items: CareerTimelineItem[],
): Array<{ item: CareerTimelineItem; slot: StorySlotId }> {
  function normalizeSlot(raw: string | null | undefined): StorySlotId | null {
    if (!raw) return null
    if (SLOT_DESKTOP_CLASSES[raw as StorySlotId]) return raw as StorySlotId
    return SLOT_MIGRATION[raw] ?? null
  }

  const claimed = new Map<StorySlotId, CareerTimelineItem>()
  const unassigned: CareerTimelineItem[] = []

  for (const item of items) {
    const sid = normalizeSlot(item.storySlot)
    if (sid && !claimed.has(sid)) {
      claimed.set(sid, item)
    } else {
      unassigned.push(item)
    }
  }

  let fallbackIdx = 0
  return ORDERED_SLOTS
    .map((slot): { item: CareerTimelineItem; slot: StorySlotId } | null => {
      if (claimed.has(slot)) return { item: claimed.get(slot)!, slot }
      if (fallbackIdx < unassigned.length) return { item: unassigned[fallbackIdx++], slot }
      return null
    })
    .filter((x): x is { item: CareerTimelineItem; slot: StorySlotId } => x !== null)
}

const CATEGORY_LABELS: Record<string, string> = {
  residency:     "Residency",
  festival:      "Festival",
  club_show:     "Club Show",
  international: "International",
  release:       "Release",
  press:         "Press",
  chart:         "Chart",
  tour:          "Tour",
  other:         "Other",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemYear(item: CareerTimelineItem): string {
  return item.eventDate.slice(0, 4)
}

function itemCatLabel(item: CareerTimelineItem): string {
  return CATEGORY_LABELS[item.category] ?? item.category
}

function formatDateLabel(eventDate: string): string {
  const d = new Date(eventDate + "T00:00:00")
  if (isNaN(d.getTime())) return eventDate.slice(0, 4)
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// ── Inline brand SVGs ─────────────────────────────────────────────────────────
// Lucide 0.564+ removed brand-specific icons. These are minimal inline SVGs.

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

// ── MetaChip — Category · Year ────────────────────────────────────────────────

function MetaChip({
  item,
  className,
  onImage,
}: {
  item:     CareerTimelineItem
  className?: string
  onImage?:   boolean
}) {
  const shadow = onImage ? { textShadow: '0 1px 3px rgba(0,0,0,0.72)' } : undefined
  return (
    <div className={cn("flex items-center gap-[5px]", className)}>
      <span
        className={cn(
          "shrink-0 text-[7px] font-bold uppercase tracking-[0.22em]",
          onImage ? "text-accent/84" : "text-accent/74",
        )}
        style={shadow}
      >
        {itemCatLabel(item)}
      </span>
      <span
        className={cn("shrink-0 text-[8px]", onImage ? "text-foreground/38" : "text-foreground/26")}
        style={shadow}
        aria-hidden
      >
        ·
      </span>
      <span
        className={cn(
          "shrink-0 text-[9px] font-medium tabular-nums",
          onImage ? "text-foreground/56" : "text-foreground/44",
        )}
        style={shadow}
      >
        {itemYear(item)}
      </span>
    </div>
  )
}

// ── StoryCardBackground ───────────────────────────────────────────────────────
// Renders the image background of a story card according to the item's
// imageTreatment. Handles cover, contain, and blurred-fill visual modes.
// text-only treatment is handled by the caller (don't render this component).

function StoryCardBackground({
  src,
  alt,
  treatment,
  positionX,
  positionY,
  zoom,
  isDrive,
  isPrimary,
  onError,
}: {
  src: string
  alt: string
  treatment: CareerTimelineItem['imageTreatment']
  positionX: number
  positionY: number
  zoom: number
  isDrive: boolean
  isPrimary?: boolean
  onError: () => void
}) {
  const hoverScale    = isPrimary ? 'group-hover:scale-[1.03]' : 'group-hover:scale-[1.04]'
  const sizes         = isPrimary
    ? "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 33vw"
    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  const coverImgClass = isPrimary ? undefined : "opacity-[0.72]"

  if (treatment === 'blurred-fill') {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          aria-hidden
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full pointer-events-none select-none"
          style={{
            objectFit: 'cover',
            objectPosition: `${positionX}% ${positionY}%`,
            filter: 'blur(28px)',
            transform: 'scale(1.2)',
            opacity: 0.5,
          }}
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className={`absolute inset-0 transition-transform duration-700 ${hoverScale}`}>
          <StoryImage
            src={src}
            alt={alt}
            fill
            unoptimized={isDrive}
            objectFit="contain"
            positionX={positionX}
            positionY={positionY}
            zoom={zoom}
            sizes={sizes}
            onError={onError}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-transparent" />
      </>
    )
  }

  if (treatment === 'contain') {
    return (
      <>
        <div className="absolute inset-0 bg-[oklch(0.08_0.004_160)]" />
        <div className={`absolute inset-0 transition-transform duration-700 ${hoverScale}`}>
          <StoryImage
            src={src}
            alt={alt}
            fill
            unoptimized={isDrive}
            objectFit="contain"
            positionX={positionX}
            positionY={positionY}
            zoom={zoom}
            sizes={sizes}
            onError={onError}
          />
        </div>
        <div className={isPrimary
          ? "absolute inset-0 bg-gradient-to-t from-black/88 via-black/16 to-transparent"
          : "absolute inset-0 bg-gradient-to-t from-black/82 via-black/6 to-transparent"
        } />
      </>
    )
  }

  // Default: cover
  return (
    <>
      <div className={`absolute inset-0 transition-transform duration-700 ${hoverScale}`}>
        <StoryImage
          src={src}
          alt={alt}
          fill
          unoptimized={isDrive}
          objectFit="cover"
          positionX={positionX}
          positionY={positionY}
          zoom={zoom}
          className={coverImgClass}
          sizes={sizes}
          onError={onError}
        />
      </div>
      <div className={isPrimary
        ? "absolute inset-0 bg-gradient-to-t from-black/96 via-black/54 to-black/0"
        : "absolute inset-0 bg-gradient-to-t from-black/94 via-black/52 to-black/10"
      } />
    </>
  )
}

// ── PrimaryCard ───────────────────────────────────────────────────────────────
// Top-left tile — tall. Image-assisted if imageUrl is present; premium
// text-first surface with oversized year watermark if not.
//
// IMPORTANT: never reads previewImageUrl — that field is HQ-only.

function PrimaryCard({
  item,
  slot = 'left-tall-story',
  onClick,
}: {
  item:    CareerTimelineItem
  slot?:   StorySlotId
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)

  // Normalize the image URL (converts Google Drive share links to thumbnail URLs).
  // previewImageUrl is never read here — only imageUrl is used publicly.
  const normalized  = item.imageUrl ? normalizeExternalImageUrl(item.imageUrl) : null
  const rawHasImage = !!normalized?.isRenderable && !imgFailed
  // text-only treatment: render as text card even when an imageUrl is set.
  const hasImage    = rawHasImage && item.imageTreatment !== 'text-only'
  const isDrive     = normalized?.source === "google-drive"

  const descMode  = resolveDescriptionMode(slot, hasImage, item.imageTreatment, item.descriptionMode)
  const descClamp = descMode === 'full' ? 'line-clamp-3' : descMode === 'short' ? 'line-clamp-2' : descMode === 'minimal' ? 'line-clamp-1' : null

  const actionIcon = (
    <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent/80 transition-all duration-200 group-hover:border-accent/52 group-hover:bg-accent/20 group-hover:text-accent">
      <ArrowUpRight className="h-[10px] w-[10px]" />
    </div>
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full h-full text-left overflow-hidden rounded-[10px] border border-white/[0.09] transition-[border-color] duration-200 hover:border-white/[0.19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {/* Background */}
      {hasImage ? (
        <StoryCardBackground
          src={normalized!.renderUrl}
          alt={item.title}
          treatment={item.imageTreatment}
          positionX={item.imageFocalX}
          positionY={item.imageFocalY}
          zoom={item.imageZoom}
          isDrive={isDrive}
          isPrimary
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[oklch(0.108_0.006_160)] transition-colors duration-200 group-hover:bg-[oklch(0.113_0.006_160)]" />
          {/* Year watermark — large editorial element for text-only cards */}
          <div
            className="pointer-events-none absolute right-3 bottom-3 select-none text-[68px] font-black leading-none tabular-nums text-white/[0.062]"
            aria-hidden
          >
            {itemYear(item)}
          </div>
        </>
      )}

      {/* Accent top line */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/58 via-accent/18 to-transparent"
        aria-hidden
      />

      {/* Content — split layout for image vs text-only */}
      {hasImage ? (
        <div className="relative flex flex-col h-full justify-end p-5 sm:p-[22px]">
          <MetaChip item={item} onImage />
          <h3
            className="mt-2 text-[18px] sm:text-[20px] font-black leading-[1.05] tracking-[-0.020em] text-foreground/96"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.82)' }}
          >
            {item.title}
          </h3>
          {item.location && (
            <p
              className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.16em] text-foreground/36"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
            >
              {item.location}
            </p>
          )}
          {item.description && descClamp && (
            <p
              className={cn("mt-[8px] text-[11.5px] leading-[1.52] text-foreground/62", descClamp)}
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.65)' }}
            >
              {item.description}
            </p>
          )}
          <div className="mt-4">{actionIcon}</div>
        </div>
      ) : (
        <div className="relative flex flex-col h-full p-[14px] sm:p-[16px] border-l-2 border-accent/[0.18]">
          <MetaChip item={item} />
          <h3 className={cn(
            "mt-2 font-black leading-[1.05] tracking-[-0.020em] text-foreground/96",
            slot === 'top-feature-primary' ? "text-[17px] sm:text-[21px]" : "text-[16px] sm:text-[19px]",
          )}>
            {item.title}
          </h3>
          {item.location && (
            <p className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.16em] text-foreground/30">
              {item.location}
            </p>
          )}
          {item.description && descClamp && (
            <p className={cn("mt-[8px] text-[11.5px] leading-[1.55] text-foreground/52", descClamp)}>
              {item.description}
            </p>
          )}
          {/* Spacer pushes action icon to bottom regardless of content length */}
          <div className="flex-1" />
          <div className="mt-3">{actionIcon}</div>
        </div>
      )}
    </button>
  )
}

// ── SecondaryCard ─────────────────────────────────────────────────────────────
// Supporting tile. Image overlay or text-first premium dark surface.
//
// IMPORTANT: never reads previewImageUrl — that field is HQ-only.

function SecondaryCard({
  item,
  slot = 'compact-a',
  onClick,
}: {
  item:    CareerTimelineItem
  slot?:   StorySlotId
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)

  const normalized  = item.imageUrl ? normalizeExternalImageUrl(item.imageUrl) : null
  const rawHasImage = !!normalized?.isRenderable && !imgFailed
  const hasImage    = rawHasImage && item.imageTreatment !== 'text-only'
  const isDrive     = normalized?.source === "google-drive"

  const descMode  = resolveDescriptionMode(slot, hasImage, item.imageTreatment, item.descriptionMode)
  // SecondaryCard is smaller — cap at line-clamp-2; minimal/hidden → don't render
  // right-bottom is 4 rows tall — allow 2 description lines for text-only where space exists
  const isTallSlot = slot === 'right-bottom'
  const descClamp = descMode === 'full' ? 'line-clamp-2'
    : descMode === 'short' ? (isTallSlot ? 'line-clamp-2' : 'line-clamp-1')
    : null

  const actionIcon = (
    <div className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full border border-accent/22 bg-accent/7 text-accent/56 transition-all duration-200 group-hover:border-accent/42 group-hover:bg-accent/14 group-hover:text-accent/86">
      <ArrowUpRight className="h-[8px] w-[8px]" />
    </div>
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full h-full text-left overflow-hidden rounded-[8px] border border-white/[0.06] transition-[border-color] duration-200 hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {hasImage ? (
        <StoryCardBackground
          src={normalized!.renderUrl}
          alt={item.title}
          treatment={item.imageTreatment}
          positionX={item.imageFocalX}
          positionY={item.imageFocalY}
          zoom={item.imageZoom}
          isDrive={isDrive}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-white/[0.024] transition-colors duration-200 group-hover:bg-white/[0.040]" />
          {/* Year watermark — editorial element for text-only */}
          <div
            className="pointer-events-none absolute -right-1 -bottom-2 select-none text-[42px] font-black leading-none tabular-nums text-white/[0.056]"
            aria-hidden
          >
            {itemYear(item)}
          </div>
        </>
      )}

      {/* Top accent stripe */}
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          hasImage
            ? "h-[1px] bg-gradient-to-r from-accent/22 via-accent/7 to-transparent"
            : "h-[2px] bg-accent/[0.14]",
        )}
        aria-hidden
      />

      {/* Content — split layout for image vs text-only */}
      {hasImage ? (
        <div className="relative flex flex-col h-full p-[10px] justify-end">
          <MetaChip item={item} onImage />
          <p
            className="mt-[5px] text-[12.5px] font-bold leading-snug tracking-[-0.009em] text-foreground/92 transition-colors duration-200 group-hover:text-foreground/100 line-clamp-2"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.72)' }}
          >
            {item.title}
          </p>
          {item.location && (
            <p
              className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.11em] text-foreground/30 truncate"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {item.location}
            </p>
          )}
          {item.description && descClamp && (
            <p
              className={cn("mt-[7px] text-[11px] leading-[1.46] text-foreground/50", descClamp)}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              {item.description}
            </p>
          )}
          <div className="mt-[10px]">{actionIcon}</div>
        </div>
      ) : (
        <div className={cn(
          "relative flex flex-col h-full p-[10px] justify-between",
          isTallSlot && "border-l border-accent/[0.11]",
        )}>
          {/* Top: meta + title + location + description */}
          <div>
            <MetaChip item={item} />
            <p className="mt-[5px] text-[12.5px] font-bold leading-snug tracking-[-0.009em] text-foreground/88 transition-colors duration-200 group-hover:text-foreground/98 line-clamp-2">
              {item.title}
            </p>
            {item.location && (
              <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.11em] text-foreground/28 truncate">
                {item.location}
              </p>
            )}
            {item.description && descClamp && (
              <p className={cn("mt-[7px] text-[11px] leading-[1.48] text-foreground/46", descClamp)}>
                {item.description}
              </p>
            )}
          </div>
          {/* Bottom: action anchored regardless of content length */}
          <div>{actionIcon}</div>
        </div>
      )}
    </button>
  )
}

// ── ArchiveListItem ───────────────────────────────────────────────────────────
// Compact row used in the "View all" expanded archive section.

function ArchiveListItem({
  item,
  onClick,
}: {
  item:    CareerTimelineItem
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[4px] border-b border-white/[0.034] px-1 py-[8px] text-left last:border-0 transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <span className="w-[72px] shrink-0 text-[7px] font-bold uppercase tracking-[0.18em] text-accent/44 group-hover:text-accent/64">
        {itemCatLabel(item)}
      </span>
      <span className="flex-1 truncate text-[12px] font-semibold text-foreground/70 group-hover:text-foreground/90">
        {item.title}
      </span>
      {item.location && (
        <span className="hidden shrink-0 text-[9px] text-foreground/26 sm:block">
          {item.location}
        </span>
      )}
      <ArrowUpRight className="h-[9px] w-[9px] shrink-0 text-foreground/22 transition-colors group-hover:text-accent/60" />
    </button>
  )
}

// ── UpdateDetail — Dialog modal ───────────────────────────────────────────────
// Full article-style detail view for a career update.
//
// IMPORTANT: never reads previewImageUrl — only imageUrl is shown here.

function UpdateDetail({
  item,
  open,
  onClose,
}: {
  item:    CareerTimelineItem | null
  open:    boolean
  onClose: () => void
}) {
  const [copied,    setCopied]    = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  // Reset image-failed state whenever the selected item changes so a new item's
  // image gets a fresh attempt rather than being suppressed by the prior failure.
  useEffect(() => { setImgFailed(false) }, [item?.id])

  if (!item) return null

  // Capture non-null reference for closures (TS can't narrow across closure boundaries).
  const activeItem = item

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function handleShareX() {
    const text = encodeURIComponent(activeItem.title)
    const url  = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=600,height=420,noopener,noreferrer")
  }

  function handleShareFacebook() {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=420,noopener,noreferrer")
  }

  const shareButtonClass =
    "flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground/40 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"

  // Only imageUrl is used — previewImageUrl is never shown publicly.
  // Normalize the URL (converts Drive share links to thumbnail URLs).
  const coverNormalized = activeItem.imageUrl
    ? normalizeExternalImageUrl(activeItem.imageUrl)
    : null
  const coverImage  = coverNormalized?.isRenderable && !imgFailed
    ? coverNormalized.renderUrl
    : null
  const coverIsDrive = coverNormalized?.source === "google-drive"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[88vh] max-w-[600px] overflow-y-auto border-white/[0.08] bg-[oklch(0.085_0.003_160)] p-0 text-foreground"
      >

        {/* ── Header bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5">
          <MetaChip item={activeItem} />
          <DialogClose asChild>
            <button
              type="button"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground/44 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-foreground/72 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              aria-label="Close"
            >
              <X className="h-[13px] w-[13px]" />
            </button>
          </DialogClose>
        </div>

        {/* ── Title + location/date ────────────────────────────────── */}
        <div className="px-6 pt-[14px]">
          <h2 className="text-[24px] font-black leading-[1.04] tracking-[-0.022em] text-foreground/96 sm:text-[30px]">
            {activeItem.title}
          </h2>
          <div className="mt-[10px] flex flex-wrap items-center gap-x-4 gap-y-1">
            {activeItem.location && (
              <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/34">
                <MapPin className="h-[9px] w-[9px] text-accent/52" />
                {activeItem.location}
              </span>
            )}
            <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/34">
              <Calendar className="h-[9px] w-[9px] text-accent/52" />
              {formatDateLabel(activeItem.eventDate)}
            </span>
          </div>
        </div>

        {/* ── No-image header decoration ───────────────────────────── */}
        {/* When there's no cover image, add a subtle accent bar so the modal
            doesn't look empty between the title and the description. */}
        {!coverImage && (
          <div className="mx-6 mt-5 h-[1px] bg-gradient-to-r from-accent/24 via-accent/8 to-transparent" />
        )}

        {/* ── Cover image (real only — never previewImageUrl) ──────── */}
        {coverImage && (
          <div className="relative mx-6 mt-5 aspect-[16/9] overflow-hidden rounded-[8px]">
            <Image
              src={coverImage}
              alt={activeItem.title}
              fill
              unoptimized={coverIsDrive}
              className="object-cover"
              sizes="600px"
              onError={() => setImgFailed(true)}
            />
          </div>
        )}

        {/* ── Description body ─────────────────────────────────────── */}
        {activeItem.description && (
          <div className={cn("px-6", coverImage ? "pt-5" : "pt-4")}>
            <p className="whitespace-pre-line text-[13px] leading-[1.70] text-foreground/58">
              {activeItem.description}
            </p>
          </div>
        )}

        {/* ── Event Recap — shown when a recap/video link is present ── */}
        {activeItem.link && (
          <div className="mx-6 mt-5">
            <div className="overflow-hidden rounded-[8px] border border-white/[0.06] bg-white/[0.028]">
              <div className="flex items-center gap-3 p-4">
                {coverImage && (
                  <div className="relative h-[52px] w-[84px] shrink-0 overflow-hidden rounded-[4px]">
                    <Image
                      src={coverImage}
                      alt=""
                      fill
                      unoptimized={coverIsDrive}
                      className="object-cover brightness-[0.72]"
                      sizes="84px"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="mb-[5px] text-[7px] font-bold uppercase tracking-[0.22em] text-accent/64">
                    Event Recap
                  </p>
                  <p className="mb-3 text-[11px] leading-[1.44] text-foreground/44">
                    Live set highlights from {activeItem.title}.
                  </p>
                  <a
                    href={activeItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-[6px] rounded-[5px] border border-accent/30 bg-accent/10 px-[10px] py-[5px] text-[9px] font-bold uppercase tracking-[0.16em] text-accent/80 transition-colors hover:border-accent/50 hover:bg-accent/18 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                  >
                    <Play className="h-[9px] w-[9px] fill-current" />
                    Watch Recap
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Share section ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pb-6 pt-5">
          <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-foreground/26">
            Share this update
          </p>
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={handleCopyLink}
              title={copied ? "Copied!" : "Copy link"}
              className={shareButtonClass}
            >
              <Link2 className="h-[13px] w-[13px]" />
            </button>
            <button
              type="button"
              onClick={handleShareFacebook}
              title="Share on Facebook"
              className={shareButtonClass}
            >
              <IconFacebook className="h-[13px] w-[13px]" />
            </button>
            <button
              type="button"
              onClick={handleShareX}
              title="Share on X"
              className={shareButtonClass}
            >
              <IconX className="h-[12px] w-[12px]" />
            </button>
            <button
              type="button"
              onClick={() => window.open("https://www.instagram.com", "_blank", "noopener,noreferrer")}
              title="Instagram"
              className={shareButtonClass}
            >
              <IconInstagram className="h-[13px] w-[13px]" />
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

// ── ArchiveCarousel ───────────────────────────────────────────────────────────
// Compact horizontal scroll track for milestones not rendered in the main grid.
// Shows only real items from the configured data source — no placeholders.

function ArchiveCarouselCard({
  item,
  onClick,
}: {
  item:    CareerTimelineItem
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const normalized = item.imageUrl ? normalizeExternalImageUrl(item.imageUrl) : null
  const hasImage   = !!normalized?.isRenderable && !imgFailed && item.imageTreatment !== 'text-only'
  const isDrive    = normalized?.source === "google-drive"

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[136px] w-[136px] shrink-0 flex-col overflow-hidden rounded-[8px] border border-white/[0.065] text-left [scroll-snap-align:start] transition-[border-color] duration-200 hover:border-white/[0.15] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
    >
      {/* Background */}
      {hasImage ? (
        <>
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.05]">
            <Image
              src={normalized!.renderUrl}
              alt={item.title}
              fill
              unoptimized={isDrive}
              sizes="136px"
              className="object-cover"
              style={{ objectPosition: `${item.imageFocalX ?? 50}% ${item.imageFocalY ?? 50}%` }}
              onError={() => setImgFailed(true)}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/44 to-black/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-white/[0.026] transition-colors duration-200 group-hover:bg-white/[0.044]" />
          {/* Year as large centered background element */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
            aria-hidden
          >
            <span className="text-[40px] font-black leading-none tabular-nums text-white/[0.058]">
              {itemYear(item)}
            </span>
          </div>
        </>
      )}

      {/* Top accent stripe */}
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          hasImage
            ? "h-[1px] bg-gradient-to-r from-accent/20 via-accent/6 to-transparent"
            : "h-[2px] bg-accent/[0.14]",
        )}
        aria-hidden
      />

      {/* Content — split layout: image cards anchor to bottom; text-only split top/bottom */}
      {hasImage ? (
        <div className="relative flex flex-col h-full p-[10px] justify-end">
          <div className="flex items-center gap-[4px]">
            <span
              className="text-[6.5px] font-bold uppercase tracking-[0.17em] text-accent/82 transition-colors group-hover:text-accent/96"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
            >
              {itemCatLabel(item)}
            </span>
            <span
              className="text-[6.5px] text-foreground/38"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              aria-hidden
            >
              ·
            </span>
            <span
              className="text-[6.5px] tabular-nums text-foreground/50"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {itemYear(item)}
            </span>
          </div>
          <p
            className="mt-[4px] text-[11.5px] font-bold leading-snug tracking-[-0.009em] text-foreground/92 line-clamp-2 transition-colors group-hover:text-white"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.72)' }}
          >
            {item.title}
          </p>
          {item.location && (
            <p
              className="mt-[3px] text-[7px] font-semibold uppercase tracking-[0.10em] text-foreground/32 truncate"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {item.location}
            </p>
          )}
          {/* Action indicator — always lightly visible */}
          <div className="mt-[7px]">
            <div className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-accent/28 bg-accent/10 text-accent/62 transition-all duration-200 group-hover:border-accent/52 group-hover:bg-accent/22 group-hover:text-accent">
              <ArrowUpRight className="h-[7px] w-[7px]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col h-full p-[10px] justify-between">
          {/* Top: category + year + title */}
          <div>
            <div className="flex items-center gap-[4px]">
              <span className="text-[6.5px] font-bold uppercase tracking-[0.17em] text-accent/80 transition-colors group-hover:text-accent/95">
                {itemCatLabel(item)}
              </span>
              <span className="text-[6.5px] text-foreground/28" aria-hidden>·</span>
              <span className="text-[6.5px] tabular-nums text-foreground/42">{itemYear(item)}</span>
            </div>
            <p className="mt-[5px] text-[12px] font-bold leading-[1.35] tracking-[-0.010em] text-foreground/88 line-clamp-3 transition-colors group-hover:text-foreground/100">
              {item.title}
            </p>
          </div>
          {/* Bottom: location + action — always visible */}
          <div>
            {item.location && (
              <p className="mb-[6px] text-[7px] font-semibold uppercase tracking-[0.10em] text-foreground/30 truncate">
                {item.location}
              </p>
            )}
            <div className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-accent/22 bg-accent/8 text-accent/50 transition-all duration-200 group-hover:border-accent/42 group-hover:bg-accent/16 group-hover:text-accent/88">
              <ArrowUpRight className="h-[7px] w-[7px]" />
            </div>
          </div>
        </div>
      )}
    </button>
  )
}

function ArchiveCarousel({
  items,
  onSelect,
}: {
  items:    CareerTimelineItem[]
  onSelect: (item: CareerTimelineItem) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (items.length === 0) return null

  function nudge(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -426 : 426, behavior: 'smooth' })
  }

  return (
    <div className="relative mt-[22px]">
      {/* Section label row */}
      <div className="mb-[10px] flex items-center gap-3">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-foreground/30">
          More milestones
        </span>
        <div className="h-px flex-1 bg-white/[0.05]" aria-hidden />
        {/* Desktop scroll controls */}
        <div className="hidden gap-1 lg:flex">
          <button
            type="button"
            onClick={() => nudge('left')}
            aria-label="Scroll left"
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.07] text-foreground/30 transition-colors hover:border-white/[0.12] hover:text-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            <ChevronLeft className="h-[9px] w-[9px]" />
          </button>
          <button
            type="button"
            onClick={() => nudge('right')}
            aria-label="Scroll right"
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.07] text-foreground/30 transition-colors hover:border-white/[0.12] hover:text-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            <ChevronRight className="h-[9px] w-[9px]" />
          </button>
        </div>
      </div>

      {/* Scroll track with edge fade */}
      <div
        className="relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
        }}
      >
        <div
          ref={scrollRef}
          className="flex gap-[10px] overflow-x-auto pb-[2px] [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ paddingLeft: '2px', paddingRight: '2px' }}
        >
          {items.map((item) => (
            <ArchiveCarouselCard
              key={item.id}
              item={item}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CareerUpdatesSection ──────────────────────────────────────────────────────
//
// Data-driven public Career Updates mosaic grid.
//
// Desktop layout (≥7 items): 12-column CSS Grid, grid-auto-rows: 120px.
//   See getMosaicDesktopClass() for the deterministic placement map.
//   Desktop layout (≥9 items): named slot mosaic, 9 editorial slots, 576px total height.
//   Desktop layout (<9 items): standard 3-col grid with self-start secondary tiles.
//
// Items beyond computeGridLimit() are shown in a compact year-grouped archive.
//
// Visibility contract:
//   • items pre-filtered by DB query (is_published = true)
//   • getPublicCareerUpdates() applies featured-first sort + safety guards
//   • previewImageUrl is NEVER read here — it is an HQ-only field
//   • No hardcoded milestone content

export interface CareerUpdatesSectionProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function CareerUpdatesSection({ items, headline, intro }: CareerUpdatesSectionProps) {
  const [selectedItem, setSelectedItem] = useState<CareerTimelineItem | null>(null)

  // Apply public filter + featured-first sort
  const published = getPublicCareerUpdates(items)
  if (published.length === 0) return null

  // Items with showInCollapsed = false bypass the grid and go directly to archive.
  const collapsedEligible = published.filter(i => i.showInCollapsed !== false)
  const archiveOnly       = published.filter(i => i.showInCollapsed === false)

  const gridLimit    = computeGridLimit(collapsedEligible.length)
  const gridItems    = collapsedEligible.slice(0, gridLimit)
  const archiveItems = [...collapsedEligible.slice(gridLimit), ...archiveOnly]

  const [primary, ...secondary] = gridItems

  // ≥7 items → 12-col mosaic; <7 items → standard 3-col grid.
  const useMosaicLayout = gridItems.length >= 7
  // Slot assignment for mosaic: storySlot-driven with positional fallback.
  const tileSlots = useMosaicLayout ? resolveSlots(gridItems) : []

  // Standard-mode layout slots (only used when !useMosaicLayout)
  const topRight  = secondary.slice(0, 2)
  const bottomRow = secondary.slice(2)

  // Whether the primary card has a renderable image URL.
  // Used to set min-height in the standard layout. Checked against the normalized
  // URL so Drive share links count as renderable.
  const primaryNormalized = primary.imageUrl
    ? normalizeExternalImageUrl(primary.imageUrl)
    : null
  const primaryHasImage = !!primaryNormalized?.isRenderable

  // Sort archive items reverse-chronologically for the carousel
  const carouselItems = [...archiveItems].sort((a, b) => b.eventDate.localeCompare(a.eventDate))

  return (
    <section id="story" className="mt-10 lg:mt-12">
      {/* Section spans the full content-area width (outer container is max-w-[1600px]).
          No inner max-width — the mosaic grid uses all available horizontal space. */}
      <div>

        {useMosaicLayout ? (

          // ── Editorial mosaic (≥9 items): section title above grid, 9 content slots ──
          // Total grid height: 6 rows × 86px + 5 gaps × 12px = 576px.
          <>
            <SectionHeader>Artist Story</SectionHeader>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:[grid-auto-rows:86px]">

              {/* Tile slots — positioned by SLOT_DESKTOP_CLASSES */}
              {tileSlots.map(({ item, slot }) => (
                <div
                  key={item.id}
                  className={cn(
                    "min-h-[160px]",
                    (slot === 'left-tall-story' || slot === 'top-feature-primary') && "sm:col-span-2 sm:min-h-[200px]",
                    SLOT_DESKTOP_CLASSES[slot],
                    "lg:min-h-0",
                  )}
                >
                  {PRIMARY_SLOTS.has(slot) ? (
                    <PrimaryCard item={item} slot={slot} onClick={() => setSelectedItem(item)} />
                  ) : (
                    <SecondaryCard item={item} slot={slot} onClick={() => setSelectedItem(item)} />
                  )}
                </div>
              ))}

            </div>
          </>

        ) : (

          // ── Standard 3-col grid (fewer than 7 items): intro above grid ─────────
          <>
            <SectionHeader>Career Updates</SectionHeader>
            {headline && (
              <h3 className="mt-3 max-w-2xl text-[19px] font-black tracking-[-0.022em] text-foreground/84 sm:text-[21px]">
                {headline}
              </h3>
            )}
            {intro && (
              <p className="mt-[7px] max-w-2xl text-[12px] leading-[1.62] text-foreground/44 sm:text-[12.5px]">
                {intro}
              </p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
              {/* Primary card */}
              <div className={cn(
                "sm:col-span-2 lg:col-span-1",
                primaryHasImage
                  ? "min-h-[280px] sm:min-h-[320px] lg:min-h-[380px]"
                  : "min-h-[210px] sm:min-h-[240px] lg:min-h-[230px]",
              )}>
                <PrimaryCard item={primary} onClick={() => setSelectedItem(primary)} />
              </div>
              {/* Top-right pair — self-start so they don't stretch to primary height */}
              {topRight.map((item) => (
                <div key={item.id} className="min-h-[160px] lg:self-start">
                  <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
                </div>
              ))}
              {/* Bottom row */}
              {bottomRow.map((item) => (
                <div key={item.id} className="min-h-[160px]">
                  <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
                </div>
              ))}
            </div>
          </>

        )}

        {/* ── Archive carousel — remaining milestones not in main grid ──── */}
        <ArchiveCarousel items={carouselItems} onSelect={setSelectedItem} />

        {/* ── Detail modal ──────────────────────────────────────────────────── */}
        <UpdateDetail
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />

      </div>
    </section>
  )
}
