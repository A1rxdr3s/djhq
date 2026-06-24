"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowUpRight, ChevronDown, MapPin, Calendar, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/djhq/section-header"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"
import type { CareerTimelineItem } from "@/types/djhq"

// ── Constants ─────────────────────────────────────────────────────────────────

const GRID_LIMIT = 5

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
// Lead update. Image-assisted if imageUrl present; premium text-first otherwise.

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/12" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[oklch(0.105_0.005_160)] group-hover:bg-[oklch(0.11_0.005_160)] transition-colors duration-200" />
      )}

      {/* Accent top line */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-accent/55 via-accent/18 to-transparent"
        aria-hidden
      />

      {/* Content */}
      <div className={cn(
        "relative flex flex-col h-full p-5 sm:p-[22px]",
        hasImage ? "justify-end" : "justify-start",
      )}>
        <MetaChip item={item} />

        <h3 className="mt-2 text-[17px] font-black leading-[1.06] tracking-[-0.018em] text-foreground/94 sm:text-[19px]">
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

        {/* Arrow affordance */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent/80 transition-all duration-200 group-hover:border-accent/50 group-hover:bg-accent/20 group-hover:text-accent">
            <ArrowUpRight className="h-[11px] w-[11px]" />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── SecondaryCard ─────────────────────────────────────────────────────────────
// Supporting update card. Image overlay or text-first dark surface.

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
            className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-white/[0.022] group-hover:bg-white/[0.036] transition-colors duration-200" />
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

        <p className="mt-[5px] text-[13px] font-bold leading-snug tracking-[-0.009em] text-foreground/82 group-hover:text-foreground/94 transition-colors duration-200">
          {item.title}
        </p>

        {item.location && (
          <p className="mt-[2px] text-[8px] font-semibold uppercase tracking-[0.11em] text-foreground/22">
            {item.location}
          </p>
        )}

        {!hasImage && item.description && (
          <p className="mt-[8px] flex-1 text-[11px] leading-[1.46] text-foreground/38 line-clamp-3">
            {item.description}
          </p>
        )}
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
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[88vh] max-w-[600px] overflow-y-auto border-white/[0.08] bg-[oklch(0.085_0.003_160)] p-0 text-foreground"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pt-5">
          <MetaChip item={item} />
          <DialogClose asChild>
            <button
              type="button"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground/44 transition-colors hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              aria-label="Close"
            >
              <X className="h-[13px] w-[13px]" />
            </button>
          </DialogClose>
        </div>

        {/* Title */}
        <div className="px-6 pt-[14px]">
          <h2 className="text-[22px] font-black leading-[1.06] tracking-[-0.020em] text-foreground/95 sm:text-[26px]">
            {item.title}
          </h2>

          {/* Location + date sub-row */}
          <div className="mt-[9px] flex flex-wrap items-center gap-x-4 gap-y-1">
            {item.location && (
              <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/32">
                <MapPin className="h-[9px] w-[9px] text-accent/50" />
                {item.location}
              </span>
            )}
            <span className="flex items-center gap-[5px] text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/32">
              <Calendar className="h-[9px] w-[9px] text-accent/50" />
              {formatDateLabel(item.eventDate)}
            </span>
          </div>
        </div>

        {/* Cover image */}
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

        {/* Description body */}
        {item.description && (
          <div className={cn("px-6", item.imageUrl ? "pt-5" : "pt-4")}>
            <p className="text-[13px] leading-[1.68] text-foreground/58">
              {item.description}
            </p>
          </div>
        )}

        {/* External link CTA */}
        <div className={cn("px-6 pb-6", (item.description || item.imageUrl) ? "pt-4" : "pt-[14px]")}>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[7px] rounded-[6px] border border-accent/28 bg-accent/8 px-4 py-[7px] text-[10px] font-bold uppercase tracking-[0.16em] text-accent/78 transition-colors hover:border-accent/48 hover:bg-accent/14 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              <ExternalLink className="h-[11px] w-[11px]" />
              View more
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── CareerUpdatesSection ──────────────────────────────────────────────────────
//
// Replaces ArtistStory with a modular bento grid of career update tiles.
// Each tile opens a Dialog with the full update detail.
//
// Visibility:
//   • items arrives pre-filtered by the DB query (is_published = true).
//   • The component's own isPublished guard is a safety net for any leaks.

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

  const gridItems  = published.slice(0, GRID_LIMIT)
  const remaining  = published.slice(GRID_LIMIT)
  const hasMore    = remaining.length > 0

  const [primary, ...secondary] = gridItems

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

        {/* ── Bento grid ────────────────────────────────────────────────────
            Desktop (3 col): primary spans col 1 × rows 1-2; secondary fills 2×2.
            Tablet (2 col):  primary spans full width; secondary fills 2-col grid.
            Mobile:          stacked in DOM order.                               */}
        <div className="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">

          <div className="min-h-[260px] sm:col-span-2 sm:min-h-[300px] lg:col-span-1 lg:row-span-2 lg:min-h-0">
            <PrimaryCard item={primary} onClick={() => setSelectedItem(primary)} />
          </div>

          {secondary.map((item) => (
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

        {/* ── Show more / fewer control ──────────────────────────────────── */}
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
