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

// ── Constants ─────────────────────────────────────────────────────────────────

// First 6 items shown in the bento grid; rest are behind "View all".
// Layout: col1 row1 = primary (tall); cols 2-3 row1 = 2 shorter cards (self-start);
//         cols 1-3 row2 = 3 standard-height cards.
const GRID_LIMIT = 6

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
// Top-left bento card — tall, image-assisted if imageUrl present.

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
      {hasImage ? (
        <>
          <Image
            src={item.imageUrl!}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-black/8" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[oklch(0.105_0.005_160)] transition-colors duration-200 group-hover:bg-[oklch(0.11_0.005_160)]" />
      )}

      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent"
        aria-hidden
      />

      <div className={cn(
        "relative flex flex-col h-full p-5 sm:p-[22px]",
        hasImage ? "justify-end" : "justify-start",
      )}>
        <MetaChip item={item} />

        <h3 className="mt-2 text-[18px] font-black leading-[1.05] tracking-[-0.020em] text-foreground/95 sm:text-[20px]">
          {item.title}
        </h3>

        {item.location && (
          <p className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.15em] text-foreground/30">
            {item.location}
          </p>
        )}

        {!hasImage && item.description && (
          <p className="mt-3 flex-1 text-[12px] leading-[1.58] text-foreground/46">
            {item.description}
          </p>
        )}

        <div className="mt-4">
          <div className="inline-flex h-[27px] w-[27px] items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent/80 transition-all duration-200 group-hover:border-accent/52 group-hover:bg-accent/20 group-hover:text-accent">
            <ArrowUpRight className="h-[11px] w-[11px]" />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── SecondaryCard ─────────────────────────────────────────────────────────────
// Supporting card. Image overlay if imageUrl present; text-first dark surface otherwise.

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
            className="object-cover opacity-72 transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/48 to-black/18" />
        </>
      ) : (
        <div className="absolute inset-0 bg-white/[0.022] transition-colors duration-200 group-hover:bg-white/[0.036]" />
      )}

      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/20 via-accent/6 to-transparent"
        aria-hidden
      />

      <div className={cn(
        "relative flex flex-col h-full p-[14px]",
        hasImage ? "justify-end" : "justify-start",
      )}>
        <MetaChip item={item} />

        <p className="mt-[5px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/84 transition-colors duration-200 group-hover:text-foreground/95">
          {item.title}
        </p>

        {item.location && (
          <p className="mt-[2px] text-[8px] font-semibold uppercase tracking-[0.11em] text-foreground/24">
            {item.location}
          </p>
        )}

        {!hasImage && item.description && (
          <p className="mt-[8px] flex-1 text-[11px] leading-[1.46] text-foreground/38 line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Arrow affordance */}
        <div className="mt-3">
          <div className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-accent/24 bg-accent/8 text-accent/60 transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/14 group-hover:text-accent/90">
            <ArrowUpRight className="h-[9px] w-[9px]" />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── UpdateDetail — Dialog modal ───────────────────────────────────────────────

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

  // Capture non-null reference for closures — TypeScript can't narrow
  // across closure boundaries even after an early-return guard.
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
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=600,height=420")
  }

  function handleShareFacebook() {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=420")
  }

  const shareButtonClass = "flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground/40 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[88vh] max-w-[600px] overflow-y-auto border-white/[0.08] bg-[oklch(0.085_0.003_160)] p-0 text-foreground"
      >
        {/* ── Header bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5">
          <MetaChip item={item} />
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

        {/* ── Title ──────────────────────────────────────────────────── */}
        <div className="px-6 pt-[14px]">
          <h2 className="text-[24px] font-black leading-[1.04] tracking-[-0.022em] text-foreground/96 sm:text-[30px]">
            {item.title}
          </h2>

          <div className="mt-[10px] flex flex-wrap items-center gap-x-4 gap-y-1">
            {item.location && (
              <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/34">
                <MapPin className="h-[9px] w-[9px] text-accent/52" />
                {item.location}
              </span>
            )}
            <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/34">
              <Calendar className="h-[9px] w-[9px] text-accent/52" />
              {formatDateLabel(item.eventDate)}
            </span>
          </div>
        </div>

        {/* ── Cover image ────────────────────────────────────────────── */}
        {item.imageUrl && (
          <div className="relative mx-6 mt-5 aspect-[16/9] overflow-hidden rounded-[8px]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="600px"
            />
          </div>
        )}

        {/* ── Description ────────────────────────────────────────────── */}
        {item.description && (
          <div className={cn("px-6", item.imageUrl ? "pt-5" : "pt-4")}>
            <p className="whitespace-pre-line text-[13px] leading-[1.70] text-foreground/58">
              {item.description}
            </p>
          </div>
        )}

        {/* ── Event Recap section ─────────────────────────────────────
            Shown when a recap/video link is present.
            Uses the main imageUrl as a small thumbnail.                  */}
        {item.link && (
          <div className="mx-6 mt-5">
            <div className="overflow-hidden rounded-[8px] border border-white/[0.06] bg-white/[0.028]">
              <div className="flex items-center gap-3 p-4">
                {/* Thumbnail */}
                {item.imageUrl && (
                  <div className="relative h-[52px] w-[84px] flex-shrink-0 overflow-hidden rounded-[4px]">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover brightness-75"
                      sizes="84px"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="mb-[6px] text-[7px] font-bold uppercase tracking-[0.22em] text-accent/64">
                    Event Recap
                  </p>
                  <p className="mb-3 text-[11px] leading-[1.44] text-foreground/44">
                    Live set highlights from {item.title}.
                  </p>
                  <a
                    href={item.link}
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

        {/* ── Share section ───────────────────────────────────────────── */}
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
// Data-driven bento grid of career update tiles.
// Each tile opens a Dialog with the full update detail.
//
// Grid (desktop, 3 cols):
//   Row 1: primary (col1, tall) + 2 shorter cards (col2-3, self-start)
//   Row 2: 3 standard-height cards (cols 1-3)
// Items beyond GRID_LIMIT are behind the "View all" expand action.
//
// Visibility: items pre-filtered by DB query (is_published = true).
// The component's own isPublished guard catches any leaks.

export interface CareerUpdatesSectionProps {
  items:     CareerTimelineItem[]
  headline?: string
  intro?:    string
}

export function CareerUpdatesSection({ items, headline, intro }: CareerUpdatesSectionProps) {
  const [selectedItem, setSelectedItem] = useState<CareerTimelineItem | null>(null)
  const [showAll, setShowAll] = useState(false)

  const published = items.filter((item) => item.isPublished)
  if (published.length === 0) return null

  const gridItems = published.slice(0, GRID_LIMIT)
  const remaining = published.slice(GRID_LIMIT)
  const hasMore   = remaining.length > 0

  const [primary, ...secondary] = gridItems

  // Top-right secondary cards (row 1, cols 2-3): self-start so they're shorter than primary.
  // Bottom secondary cards (row 2, all cols): fill their cell height.
  const topRight  = secondary.slice(0, 2)
  const bottomRow = secondary.slice(2)

  return (
    <section id="story" className="mt-10 lg:mt-12">
      <div className="mx-auto max-w-5xl">

        <SectionHeader>Career Updates</SectionHeader>

        {headline && (
          <h3 className="mt-3 max-w-xl text-[19px] font-black tracking-[-0.022em] text-foreground/84 sm:text-[21px]">
            {headline}
          </h3>
        )}

        {intro && (
          <p className="mt-[7px] max-w-2xl text-[12px] leading-[1.62] text-foreground/44 sm:text-[12.5px]">
            {intro}
          </p>
        )}

        {/* ── Bento grid ──────────────────────────────────────────────────
            Desktop (3 col):
              Row 1 — col1: primary (tall, min-h-[380px])
                    — col2+col3: 2 shorter cards (self-start, ~170px)
              Row 2 — cols 1-3: 3 standard-height cards
            Tablet (2 col): primary full-width; secondary 2-col grid below.
            Mobile: stacked in DOM order.                                   */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          {/* Primary — tall */}
          <div className="min-h-[280px] sm:col-span-2 sm:min-h-[300px] lg:col-span-1 lg:min-h-[380px]">
            <PrimaryCard item={primary} onClick={() => setSelectedItem(primary)} />
          </div>

          {/* Top-right — shorter, self-start on desktop so they don't stretch to primary height */}
          {topRight.map((item) => (
            <div key={item.id} className="min-h-[170px] lg:self-start">
              <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
            </div>
          ))}

          {/* Bottom row — standard height */}
          {bottomRow.map((item) => (
            <div key={item.id} className="min-h-[170px]">
              <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
            </div>
          ))}

        </div>

        {/* ── Expanded overflow items ────────────────────────────────────── */}
        {showAll && remaining.length > 0 && (
          <div className="mt-[10px] grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((item) => (
              <div key={item.id} className="min-h-[170px]">
                <SecondaryCard item={item} onClick={() => setSelectedItem(item)} />
              </div>
            ))}
          </div>
        )}

        {/* ── Show more / fewer ──────────────────────────────────────────── */}
        {hasMore && (
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
        )}

        {/* ── Detail modal ───────────────────────────────────────────────── */}
        <UpdateDetail
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />

      </div>
    </section>
  )
}
