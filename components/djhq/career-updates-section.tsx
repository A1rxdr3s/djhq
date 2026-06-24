"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowUpRight, ChevronDown, MapPin, Calendar, X, Link2, Play } from "lucide-react"
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
  buildChronologyGroups,
} from "@/lib/djhq/career-updates"

// ── Constants ─────────────────────────────────────────────────────────────────

// How many items to show in the mosaic grid before "View all" kicks in.
// With the row-span-2 layout (≥7 items), 7 produces a clean 2+2-right + 2-partial-row3,
// and 8 produces a perfect 2+2-right + 3-full-row3. Show all up to 8.
function computeGridLimit(count: number): number {
  if (count >= 8) return 8
  return count
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

function MetaChip({ item, className }: { item: CareerTimelineItem; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[5px]", className)}>
      <span className="shrink-0 text-[7px] font-bold uppercase tracking-[0.22em] text-accent/68">
        {itemCatLabel(item)}
      </span>
      <span className="shrink-0 text-[8px] text-foreground/16" aria-hidden>·</span>
      <span className="shrink-0 text-[9px] font-medium tabular-nums text-foreground/26">
        {itemYear(item)}
      </span>
    </div>
  )
}

// ── PrimaryCard ───────────────────────────────────────────────────────────────
// Top-left tile — tall. Image-assisted if imageUrl is present; premium
// text-first surface with oversized year watermark if not.
//
// IMPORTANT: never reads previewImageUrl — that field is HQ-only.

function PrimaryCard({
  item,
  onClick,
}: {
  item:    CareerTimelineItem
  onClick: () => void
}) {
  const hasImage = !!item.imageUrl

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full h-full text-left overflow-hidden rounded-[10px] border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {/* Background */}
      {hasImage ? (
        <>
          <Image
            src={item.imageUrl!}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/6" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[oklch(0.108_0.006_160)] transition-colors duration-200 group-hover:bg-[oklch(0.113_0.006_160)]" />
          {/* Oversized year watermark — editorial depth without fake imagery */}
          <div
            className="pointer-events-none absolute -right-3 bottom-0 select-none text-[88px] font-black leading-none tabular-nums text-white/[0.038]"
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

      {/* Content */}
      <div className={cn(
        "relative flex flex-col h-full",
        hasImage ? "justify-end p-5 sm:p-[22px]" : "justify-start p-4 sm:p-5",
      )}>
        <MetaChip item={item} />

        <h3 className={cn(
          "mt-2 font-black leading-[1.05] tracking-[-0.020em] text-foreground/95",
          hasImage ? "text-[18px] sm:text-[20px]" : "text-[17px] sm:text-[19px]",
        )}>
          {item.title}
        </h3>

        {item.location && (
          <p className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.16em] text-foreground/30">
            {item.location}
          </p>
        )}

        {!hasImage && item.description && (
          <p className="mt-[10px] text-[12px] leading-[1.58] text-foreground/46 line-clamp-3">
            {item.description}
          </p>
        )}

        <div className={cn(hasImage ? "mt-4" : "mt-3")}>
          <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent/80 transition-all duration-200 group-hover:border-accent/52 group-hover:bg-accent/20 group-hover:text-accent">
            <ArrowUpRight className="h-[10px] w-[10px]" />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── SecondaryCard ─────────────────────────────────────────────────────────────
// Supporting tile. Image overlay or text-first premium dark surface.
//
// IMPORTANT: never reads previewImageUrl — that field is HQ-only.

function SecondaryCard({
  item,
  onClick,
}: {
  item:    CareerTimelineItem
  onClick: () => void
}) {
  const hasImage = !!item.imageUrl

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full h-full text-left overflow-hidden rounded-[8px] border border-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {hasImage ? (
        <>
          <Image
            src={item.imageUrl!}
            alt={item.title}
            fill
            className="object-cover opacity-[0.72] transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/48 to-black/16" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-white/[0.023] transition-colors duration-200 group-hover:bg-white/[0.038]" />
          {/* Subtle year watermark */}
          <div
            className="pointer-events-none absolute -right-2 -bottom-2 select-none text-[58px] font-black leading-none tabular-nums text-white/[0.034]"
            aria-hidden
          >
            {itemYear(item)}
          </div>
        </>
      )}

      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/20 via-accent/6 to-transparent"
        aria-hidden
      />

      <div className={cn(
        "relative flex flex-col h-full p-[13px]",
        hasImage ? "justify-end" : "justify-start",
      )}>
        <MetaChip item={item} />

        <p className="mt-[5px] text-[12.5px] font-bold leading-snug tracking-[-0.009em] text-foreground/84 transition-colors duration-200 group-hover:text-foreground/96 line-clamp-2">
          {item.title}
        </p>

        {item.location && (
          <p className="mt-[3px] text-[8px] font-semibold uppercase tracking-[0.11em] text-foreground/24 truncate">
            {item.location}
          </p>
        )}

        {!hasImage && item.description && (
          <p className="mt-[7px] text-[11px] leading-[1.46] text-foreground/36 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="mt-[10px]">
          <div className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full border border-accent/22 bg-accent/7 text-accent/56 transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/13 group-hover:text-accent/84">
            <ArrowUpRight className="h-[8px] w-[8px]" />
          </div>
        </div>
      </div>
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
  const [copied, setCopied] = useState(false)

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
  const coverImage = activeItem.imageUrl

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
              className="object-cover"
              sizes="600px"
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

// ── CareerUpdatesSection ──────────────────────────────────────────────────────
//
// Data-driven public Career Updates bento grid.
//
// Grid layout (desktop, 3 cols):
//   Row 1 — col1: primary card (height adaptive: tall with image, compact without)
//          — col2+col3: 2 shorter cards (self-start, ~160px)
//   Row 2 — cols 1-3: up to 3 standard-height cards
//   Row 3 — cols 1-2: up to 2 cards (shown when count >= 8, partial row is expected)
//
// computeGridLimit(): shows 8 when ≥8 items available, 6 when count=7 (avoids
// a single-card last row), and count otherwise.
// Items beyond the grid limit are shown in a compact year-grouped archive.
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
  const [showAll, setShowAll] = useState(false)

  // Apply public filter + featured-first sort
  const published   = getPublicCareerUpdates(items)
  if (published.length === 0) return null

  const gridLimit   = computeGridLimit(published.length)
  const gridItems   = published.slice(0, gridLimit)
  const remaining   = published.slice(gridLimit)
  const hasMore     = remaining.length > 0

  const [primary, ...secondary] = gridItems

  // Mosaic row-span layout: when we have 7+ items, the primary card spans 2
  // grid rows (left anchor), creating the mosaic/hero effect from the reference.
  // ≥7 items → row-span-2 primary; produces a clean 2-row right section + optional partial row3.
  // <7 items → standard layout with topRight self-start + bottomRow.
  const useRowSpanLayout = gridItems.length >= 7

  // Standard-mode layout slots (only used when !useRowSpanLayout)
  const topRight  = secondary.slice(0, 2)
  const bottomRow = secondary.slice(2)

  // Height for primary wrapper (only relevant in standard mode; row-span mode is grid-controlled)
  const primaryHasImage = !!primary.imageUrl

  // Build chronology groups for the "View all" archive
  const archiveGroups = buildChronologyGroups(
    [...remaining].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
  )

  return (
    <section id="story" className="mt-10 lg:mt-12">
      {/* Section spans the full content-area width (outer container is max-w-[1600px]).
          No inner max-width — the mosaic grid uses all available horizontal space. */}
      <div>

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

        {/* ── Mosaic grid ──────────────────────────────────────────────────
            ≥7 items (row-span mode):
              Desktop (3 col) — primary spans rows 1+2 (left anchor):
                Row 1 — col1: primary [row-span-2]  | col2: sec0  | col3: sec1
                Row 2 —                             | col2: sec2  | col3: sec3
                Row 3 — col1: sec4  | col2: sec5  | col3: sec6 (if count=8)
            <7 items (standard mode):
              Row 1 — col1: primary (self-height) | col2: sec0 | col3: sec1
              Row 2 — col1: sec2 | col2: sec3 | col3: sec4
            Tablet (2 col): primary spans full width; secondary fills 2-col grid.
            Mobile: stacked in DOM order.                                         */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          {/* Primary card */}
          <div className={cn(
            "sm:col-span-2 lg:col-span-1",
            useRowSpanLayout
              // Row-span mode: grid rows control height; just set a mobile floor
              ? "min-h-[240px] sm:min-h-[280px] lg:row-span-2"
              // Standard mode: explicit height based on image availability
              : primaryHasImage
                ? "min-h-[280px] sm:min-h-[320px] lg:min-h-[380px]"
                : "min-h-[210px] sm:min-h-[240px] lg:min-h-[230px]",
          )}>
            <PrimaryCard item={primary} onClick={() => setSelectedItem(primary)} />
          </div>

          {useRowSpanLayout ? (
            // Mosaic mode: all secondary items fill their grid cells uniformly
            secondary.map((item) => (
              <div key={item.id} className="min-h-[150px]">
                <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
              </div>
            ))
          ) : (
            // Standard mode: top-right cards don't stretch to primary height
            <>
              {topRight.map((item) => (
                <div key={item.id} className="min-h-[160px] lg:self-start">
                  <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
                </div>
              ))}
              {bottomRow.map((item) => (
                <div key={item.id} className="min-h-[160px]">
                  <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
                </div>
              ))}
            </>
          )}

        </div>

        {/* ── View all control + compact archive ──────────────────────────── */}
        {hasMore && (
          <>
            <div className="mt-[18px]">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                aria-expanded={showAll}
                className="flex items-center gap-[7px] rounded-[5px] border border-white/[0.07] bg-white/[0.022] px-[14px] py-[7px] text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/44 transition-colors hover:border-white/[0.12] hover:bg-white/[0.038] hover:text-foreground/64 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ChevronDown
                  className={cn(
                    "h-[10px] w-[10px] transition-transform duration-200",
                    showAll && "rotate-180",
                  )}
                  aria-hidden
                />
                {showAll ? "Show fewer updates" : "View all career updates"}
              </button>
            </div>

            {/* Compact year-grouped archive — editorial, not another bento grid */}
            {showAll && archiveGroups.length > 0 && (
              <div className="mt-4 border-t border-white/[0.05] pt-4">
                {archiveGroups.map((group, gi) => (
                  <div key={group.year} className={gi > 0 ? "mt-4" : ""}>
                    <div className="mb-[6px] flex items-center gap-[8px]">
                      <span className="text-[8px] font-bold tabular-nums tracking-[0.04em] text-foreground/22">
                        {group.year}
                      </span>
                      <div className="h-px flex-1 bg-white/[0.04]" aria-hidden />
                    </div>
                    {group.items.map((item) => (
                      <ArchiveListItem
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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
