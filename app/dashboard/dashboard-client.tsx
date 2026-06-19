"use client"

import { useState, useRef, useLayoutEffect, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowRight, Briefcase, Calendar, Camera, Check, ChevronDown, ChevronRight, Copy, Disc3, Download, ExternalLink, FileText, FolderOpen, Globe, Headphones, Image as ImageIcon, Inbox, Instagram, Layers, Link2, Loader2, LogOut, Mail, MapPin, Monitor, MoreVertical, Music, Music2, PanelBottom, Play, Plus, Radio, Route, Save, Send, Sparkles, Star, Trash2, TrendingUp, Upload, User, Wrench, X, Youtube } from "lucide-react"
import type { Artist, ArtistAccentTheme, DjSet, GalleryImage, HeroContentSurface, HeroContentWidth, HeroLogoLayout, HeroLogoPlacement, HeroLogoReadability, HeroLogoStyle, PerformanceType, ReleaseType, SocialPlatform, Video } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { computeDjSetTitle, PERFORMANCE_TYPE_LABELS } from "@/lib/dj-set-title"
import { computeVideoTitle } from "@/lib/performance-title"
import { ACCENT_THEMES, getAccentTheme } from "@/lib/accent-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { GigCard } from "@/components/dashboard/gig-card"
import { ShowModal } from "@/components/dashboard/add-show-modal"
import { VenueAutocomplete } from "@/components/dashboard/venue-autocomplete"
import { BookingsSection } from "@/components/dashboard/bookings-section"
import { TourCalendar, type TourCalendarGig } from "@/components/djhq/tour-calendar"
import { hqListBookingLeads } from "@/app/actions/booking-lead-actions"
import { HqPageHeader } from "@/components/djhq/hq-page-header"
import { HeroIdentity } from "@/components/djhq/hero-identity"
import { HeroLogoElement } from "@/components/djhq/hero-logo-element"
import { brand } from "@/lib/brand"

// Natural dimensions of the virtual hero used for CSS-scale preview.
// The preview container scales this viewport-equivalent canvas down to fit.
const PREVIEW_NATURAL_W = 1440
const PREVIEW_NATURAL_H = Math.round(PREVIEW_NATURAL_W * 7 / 16) // 630

// Canonical app host used for display copy. Controlled by NEXT_PUBLIC_APP_URL in production.
const APP_DISPLAY_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")

type NavItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { label: string; items: NavItem[] }

type BrandSourceFile = {
  id: string
  filename: string
  fileType: string
  fileExt: string
  fileUrl: string
  fileSize: number | null
  status: "uploaded" | "processing" | "processed" | "failed" | "stored_only"
  createdAt: string
}

type BrandAsset = {
  id: string
  sourceFileId: string | null
  name: string | null
  assetType: "logo" | "wordmark" | "monogram" | "favicon" | "unknown"
  status: string
  previewUrl: string
  hasSolidBg: boolean
  variant: string
  sourcePage: number | null
  createdAt: string
}

/**
 * detectCandidateBounds — pure pixel analysis, no external deps.
 *
 * Assumes a white (or near-white) page background.
 * Finds distinct foreground clusters using row/column projections and
 * returns bounding boxes of likely logo regions.
 */
function detectCandidateBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Array<{ x: number; y: number; w: number; h: number }> {
  // ── Build foreground mask ───────────────────────────────────────────────────
  // Foreground = visible AND not near-white (R,G,B all > 235)
  const fg = new Uint8Array(width * height)
  let totalFg = 0
  for (let y = 0; y < height; y++) {
    const pxRow = y * width * 4
    const fgRow = y * width
    for (let x = 0; x < width; x++) {
      const i = pxRow + x * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a > 30 && !(r > 235 && g > 235 && b > 235)) { fg[fgRow + x] = 1; totalFg++ }
    }
  }
  if (totalFg === 0) return []

  const ROW_GAP = Math.max(8, Math.floor(height * 0.025))
  const COL_GAP = Math.max(8, Math.floor(width  * 0.025))
  const MIN_AREA = width * height * 0.001          // ≥ 0.1% of page
  const PAD = Math.max(10, Math.floor(Math.min(width, height) * 0.015))

  // ── Row projection ──────────────────────────────────────────────────────────
  const rowFg = new Int32Array(height)
  for (let y = 0; y < height; y++) {
    const base = y * width
    for (let x = 0; x < width; x++) rowFg[y] += fg[base + x]
  }
  const rowActive = new Uint8Array(height)
  for (let y = 0; y < height; y++) {
    for (let dy = -ROW_GAP; dy <= ROW_GAP; dy++) {
      const yy = y + dy
      if (yy >= 0 && yy < height && rowFg[yy] > 0) { rowActive[y] = 1; break }
    }
  }

  // ── Horizontal bands ────────────────────────────────────────────────────────
  const bands: Array<{ y0: number; y1: number }> = []
  let inBand = false, bandStart = 0
  for (let y = 0; y <= height; y++) {
    const a = y < height && rowActive[y]
    if (a && !inBand)  { inBand = true;  bandStart = y }
    if (!a && inBand)  { inBand = false; if (y - bandStart > ROW_GAP) bands.push({ y0: bandStart, y1: y }) }
  }

  const candidates: Array<{ x: number; y: number; w: number; h: number }> = []

  for (const { y0, y1 } of bands) {
    // ── Column projection within band ─────────────────────────────────────────
    const colFg = new Int32Array(width)
    for (let y = y0; y < y1; y++) {
      const base = y * width
      for (let x = 0; x < width; x++) colFg[x] += fg[base + x]
    }
    const colActive = new Uint8Array(width)
    for (let x = 0; x < width; x++) {
      for (let dx = -COL_GAP; dx <= COL_GAP; dx++) {
        const xx = x + dx
        if (xx >= 0 && xx < width && colFg[xx] > 0) { colActive[x] = 1; break }
      }
    }

    let inGroup = false, groupStart = 0
    for (let x = 0; x <= width; x++) {
      const a = x < width && colActive[x]
      if (a && !inGroup) { inGroup = true; groupStart = x }
      if (!a && inGroup) {
        inGroup = false
        // Precise bounds within this cell
        let minX = width, maxX = 0, minY = height, maxY = 0
        for (let cy = y0; cy < y1; cy++) {
          const base = cy * width
          for (let cx = groupStart; cx < x; cx++) {
            if (fg[base + cx]) {
              if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
              if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
            }
          }
        }
        if (maxX > minX && maxY > minY) {
          const area = (maxX - minX) * (maxY - minY)
          // Skip if too small or covers almost the entire page (just the bg)
          if (area > MIN_AREA && area / (width * height) < 0.82) {
            const x0 = Math.max(0, minX - PAD)
            const y0c = Math.max(0, minY - PAD)
            candidates.push({
              x: x0, y: y0c,
              w: Math.min(width,  maxX + PAD + 1) - x0,
              h: Math.min(height, maxY + PAD + 1) - y0c,
            })
          }
        }
      }
    }
  }

  return candidates.slice(0, 8)
}

/** Re-trim a crop to its tightest non-white bounding box, then apply 10% padding */
function normalizeCrop(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext("2d")!
  const { width: w, height: h } = src
  const data = ctx.getImageData(0, 0, w, h).data
  let minX = w, maxX = 0, minY = h, maxY = 0
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a > 30 && !(r > 240 && g > 240 && b > 240)) {
        if (px < minX) minX = px; if (px > maxX) maxX = px
        if (py < minY) minY = py; if (py > maxY) maxY = py
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return src
  const cw = maxX - minX, ch = maxY - minY
  const padX = Math.max(8, Math.round(cw * 0.10))
  const padY = Math.max(8, Math.round(ch * 0.10))
  const x0 = Math.max(0, minX - padX), y0 = Math.max(0, minY - padY)
  const x1 = Math.min(w, maxX + padX + 1), y1 = Math.min(h, maxY + padY + 1)
  const nc = document.createElement("canvas")
  nc.width = x1 - x0; nc.height = y1 - y0
  const nCtx = nc.getContext("2d")!
  nCtx.fillStyle = "#ffffff"
  nCtx.fillRect(0, 0, nc.width, nc.height)
  nCtx.drawImage(src, x0, y0, nc.width, nc.height, 0, 0, nc.width, nc.height)
  return nc
}

/** Map pixel analysis → asset_type DB value */
function classifyAssetType(
  w: number, h: number, fgPx: number,
): BrandAsset["assetType"] {
  const ratio = w / h
  const density = fgPx / (w * h)
  if (ratio > 2.8) return "wordmark"
  if (density < 0.20 && ratio > 0.7 && ratio < 1.5) return "monogram"
  return "logo"
}

/** Map pixel analysis → friendly display name (stored in asset.name) */
function displayTypeName(assetType: BrandAsset["assetType"], w: number, h: number): string {
  if (assetType === "wordmark") return "Wordmark"
  if (assetType === "monogram") return "Monogram"
  const ratio = w / h
  if (ratio > 1.8) return "Horizontal Logo"
  if (ratio < 0.7) return "Stacked Logo"
  return "Primary Logo"
}

/** Detect color variant by sampling foreground pixels */
function detectVariant(data: Uint8ClampedArray): string {
  let sumR = 0, sumG = 0, sumB = 0, count = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a > 30 && !(r > 235 && g > 235 && b > 235)) {
      sumR += r; sumG += g; sumB += b; count++
    }
  }
  if (count === 0) return "original"
  const r = sumR / count, g = sumG / count, b = sumB / count
  const brightness = (r + g + b) / 3
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  if (brightness < 65 && chroma < 35)  return "black"
  if (brightness > 195 && chroma < 35) return "white"
  if (r > 140 && g > 100 && b < 90 && r > b + 55) return "gold"
  if (brightness > 115 && brightness < 190 && chroma < 40) return "silver"
  return "original"
}

/** 8×8 shape hash — binary foreground mask, ignores color entirely */
function shapeHash(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(64)
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const px = Math.floor(gx * w / 8), py = Math.floor(gy * h / 8)
      const i = (py * w + px) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      out[gy * 8 + gx] = (a > 30 && !(r > 235 && g > 235 && b > 235)) ? 1 : 0
    }
  }
  return out
}

/** Hamming distance between two shape hashes — < 8 means same silhouette */
function shapeHashDist(a: Float32Array, b: Float32Array): number {
  let d = 0
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++
  return d
}

/** Extract base type from an asset name (strips trailing number suffix) */
function assetGroupKey(name: string | null): string {
  return (name ?? "Unknown").replace(/\s+\d+$/, "")
}

/**
 * Remove background and recolor logo pixels.
 *
 * 1. Estimate background color from the crop's border pixels.
 * 2. Compute each pixel's Euclidean RGB distance from that background.
 * 3. dist >= 20: solid foreground → full alpha 255, target color.
 *    dist <= 8:  background → fully transparent.
 *    8 < dist < 20: anti-aliased edge → proportional alpha.
 *
 * The thresholds (8 and 20) are fixed in RGB-distance space. A beige pixel
 * like (240, 225, 195) on a white (255,255,255) background has dist ≈ 65 —
 * well above the solid threshold. Even a very light logo pixel at
 * (250, 245, 230) has dist ≈ 27 — still solid. Only pixels within a narrow
 * band of the background color get partial alpha for edge smoothing.
 */
function recolorToVariant(
  src: HTMLCanvasElement,
  mode: "original" | "black" | "white",
): HTMLCanvasElement {
  const { width: w, height: h } = src
  const srcCtx = src.getContext("2d")!
  const d = srcCtx.getImageData(0, 0, w, h).data
  const dst = document.createElement("canvas")
  dst.width = w; dst.height = h
  const dstCtx = dst.getContext("2d")!
  const img = dstCtx.createImageData(w, h)
  const out = img.data

  // Estimate background from border pixels
  let bgR = 0, bgG = 0, bgB = 0, bgN = 0
  for (let x = 0; x < w; x++) {
    for (const y of [0, 1, h - 2, h - 1]) {
      if (y < 0 || y >= h) continue
      const i = (y * w + x) * 4
      if (d[i + 3] > 200) { bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; bgN++ }
    }
  }
  for (let y = 2; y < h - 2; y++) {
    for (const x of [0, 1, w - 2, w - 1]) {
      if (x < 0 || x >= w) continue
      const i = (y * w + x) * 4
      if (d[i + 3] > 200) { bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; bgN++ }
    }
  }
  const bR = bgN > 0 ? Math.round(bgR / bgN) : 255
  const bG = bgN > 0 ? Math.round(bgG / bgN) : 255
  const bB = bgN > 0 ? Math.round(bgB / bgN) : 255

  const BG_DIST   = 8
  const SOLID_DIST = 20

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], srcA = d[i + 3]
    if (srcA < 10) { out[i + 3] = 0; continue }

    const dr = r - bR, dg = g - bG, db = b - bB
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist <= BG_DIST) {
      out[i + 3] = 0
    } else if (dist >= SOLID_DIST) {
      if (mode === "black") {
        out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255
      } else if (mode === "white") {
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255
      } else {
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255
      }
    } else {
      const t = (dist - BG_DIST) / (SOLID_DIST - BG_DIST)
      const outA = Math.round(t * 255)
      if (outA < 4) { out[i + 3] = 0; continue }
      if (mode === "black") {
        out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = outA
      } else if (mode === "white") {
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = outA
      } else {
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = outA
      }
    }
  }

  dstCtx.putImageData(img, 0, 0)
  return dst
}

const navGroups: NavGroup[] = [
  {
    label: "Identity",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "brand",   label: "Brand",   icon: Sparkles },
      { id: "links",   label: "Links",   icon: Link2 },
      { id: "hero",    label: "Hero",    icon: Monitor },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "releases", label: "Releases", icon: Disc3 },
      { id: "shows",    label: "Shows",    icon: Calendar },
      { id: "sets",     label: "Sets",     icon: Headphones },
      { id: "media",    label: "Videos",   icon: Play },
      { id: "gallery",  label: "Gallery",  icon: ImageIcon },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "bookings",  label: "Bookings",     icon: Inbox },
      { id: "tours",     label: "Tour Planner", icon: Route },
      { id: "press-kit", label: "Press Kit",    icon: FileText },
    ],
  },
  {
    label: "Publish",
    items: [
      { id: "domain",  label: "Domain",  icon: Globe },
      { id: "footer",  label: "Footer",  icon: PanelBottom },
      { id: "publish", label: "Publish", icon: Send },
    ],
  },
]


type HeroPreset = {
  id: string
  label: string
  description: string
  heroIdentityMode: "text" | "logo" | "both"
  heroLogoPlacement: HeroLogoPlacement
  heroLogoLayout: HeroLogoLayout
  heroLogoAlignment: "left" | "center" | "right"
  heroLogoScale: number
  heroLogoOffsetX: number
  heroLogoOffsetY: number
  heroLogoStyle: HeroLogoStyle
}

const HERO_PRESETS: HeroPreset[] = [
  {
    id: "editorial",
    label: "Editorial",
    description: "Balanced premium center lockup",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 180,
    heroLogoOffsetX: 0,
    heroLogoOffsetY: 0,
    heroLogoStyle: "soft",
  },
  {
    id: "festival",
    label: "Festival",
    description: "Large mark, full-bleed impact",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 230,
    heroLogoOffsetX: 0,
    heroLogoOffsetY: -10,
    heroLogoStyle: "solid",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Quiet identity, restrained presence",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 120,
    heroLogoOffsetX: 0,
    heroLogoOffsetY: 10,
    heroLogoStyle: "soft",
  },
  {
    id: "poster",
    label: "Poster",
    description: "Left-weighted editorial layout",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "left",
    heroLogoScale: 170,
    heroLogoOffsetX: 0,
    heroLogoOffsetY: 0,
    heroLogoStyle: "soft",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Blends mark into photography",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 210,
    heroLogoOffsetX: -20,
    heroLogoOffsetY: 0,
    heroLogoStyle: "cinematic",
  },
]

type ReleaseFormState = {
  id: string
  isFeatured: boolean
  title: string
  label: string
  credits: string
  releaseDate: string
  type: string
  platformUrl: string
  artworkUrl: string
  spotifyUrl: string
  appleMusicUrl: string
  soundcloudUrl: string
  youtubeMusicUrl: string
  beatportUrl: string
  traxsourceUrl: string
  bandcampUrl: string
  otherUrl: string
  releaseType: string
  versionType: string
  customVersionType: string
  remixer: string
}

type GigFormState = {
  id: string
  eventName?: string
  venue: string
  clubVenue?: string
  date: string
  city: string
  country: string
  eventStatus?: "upcoming" | "sold_out" | "cancelled" | null
  ticketUrl?: string
  flyerUrl?: string
  instagramUrl?: string
  feeAmount?: number | null
  feeCurrency?: string | null
  paymentStatus?: "pending" | "partial" | "paid" | "cancelled" | null
  visibilityStatus: "announced" | "tba" | "tbc" | "cancelled"
}

type DjSetFormState = {
  id: string
  performanceType: PerformanceType
  performanceArtists: string[]
  customPerformanceType: string
  titleOverride: string
  venue: string
  event: string
  setDate: string
  city: string
  imageUrl: string
  platformUrl: string
  isPublished: boolean
}

type ImportedReleaseMetadata = {
  provider: "beatport" | "spotify" | "soundcloud"
  title: string | null
  artist: string | null
  label: string | null
  releaseDate: string | null
  type: string | null
  platformUrl: string
  artworkUrl: string | null
}

type ImportedVideoMetadata = {
  title: string | null
  thumbnailUrl: string | null
  platformUrl: string
}

type VideoFormState = {
  id: string
  title: string          // stored fallback title (from YouTube import); not shown to user
  videoArtists: string[]
  videoEvent: string
  videoCity: string
  videoCountry: string
  venue: string
  videoDate: string
  thumbnailUrl: string
  customThumbnailUrl: string | null
  platformUrl: string
  isPublished: boolean
}

// Fixed platform list — users manage URLs only; labels and icons are system-defined
const PLATFORM_CONFIG: {
  id: SocialPlatform
  label: string
  Icon: React.ComponentType<{ className?: string }>
  placeholder: string
}[] = [
  { id: "spotify",           label: "Spotify",          Icon: Radio,      placeholder: "https://open.spotify.com/artist/..." },
  { id: "beatport",          label: "Beatport",         Icon: Music2,     placeholder: "https://www.beatport.com/artist/..." },
  { id: "soundcloud",        label: "SoundCloud",       Icon: Play,       placeholder: "https://soundcloud.com/..." },
  { id: "instagram",         label: "Instagram",        Icon: Instagram,  placeholder: "https://instagram.com/..." },
  { id: "youtube",           label: "YouTube",          Icon: Youtube,    placeholder: "https://youtube.com/@..." },
  { id: "tiktok",            label: "TikTok",           Icon: Music,      placeholder: "https://tiktok.com/@..." },
  { id: "resident-advisor",  label: "Resident Advisor", Icon: Globe,      placeholder: "https://ra.co/dj/..." },
  { id: "bandsintown",       label: "Bandsintown",      Icon: MapPin,     placeholder: "https://www.bandsintown.com/a/..." },
  { id: "website",           label: "Website",          Icon: Globe,      placeholder: "https://..." },
]

// Build a platform → URL map from saved artist links; migrates "other" → "website"
function getLinkUrlsFromArtist(artist: Artist): Record<string, string> {
  const urls: Record<string, string> = {}
  artist.socialLinks.forEach((link) => {
    const url = link.url?.trim()
    if (!url) return
    const id = link.platform === "other" ? "website" : link.platform
    if (!urls[id]) urls[id] = url
  })
  return urls
}

function normalizeReleaseType(type: string): ReleaseType {
  if (type === "ep" || type === "EP") {
    return "EP"
  }

  return type === "album" ? "album" : "single"
}

const RELEASE_TYPE_OPTIONS = [
  { value: "single",      label: "Single" },
  { value: "ep",          label: "EP" },
  { value: "album",       label: "Album" },
  { value: "compilation", label: "Compilation" },
  { value: "va",          label: "VA" },
  { value: "other",       label: "Other" },
] as const

const VERSION_TYPE_OPTIONS = [
  { value: "original_mix",  label: "Original Mix" },
  { value: "extended_mix",  label: "Extended Mix" },
  { value: "radio_edit",    label: "Radio Edit" },
  { value: "remix",         label: "Remix" },
  { value: "club_mix",      label: "Club Mix" },
  { value: "dub_mix",       label: "Dub Mix" },
  { value: "instrumental",  label: "Instrumental" },
  { value: "vip_mix",       label: "VIP Mix" },
  { value: "edit",          label: "Edit" },
  { value: "mashup",        label: "Mashup" },
  { value: "bootleg",       label: "Bootleg" },
  { value: "rework",        label: "Rework" },
  { value: "acapella",      label: "Acapella" },
  { value: "tool",          label: "Tool" },
  { value: "other",         label: "Other" },
] as const

const VERSION_TYPE_VALUES = VERSION_TYPE_OPTIONS.map((o) => o.value)

function parseVersionType(stored?: string): { versionType: string; customVersionType: string } {
  if (!stored) return { versionType: "", customVersionType: "" }
  if ((VERSION_TYPE_VALUES as readonly string[]).includes(stored)) {
    return { versionType: stored, customVersionType: "" }
  }
  return { versionType: "other", customVersionType: stored }
}

// Returns snake_case version type key. Remix is handled by detectRemixFromTitle.
function inferVersionType(title: string): string | null {
  const patterns: [RegExp, string][] = [
    [/\bextended\s+mix\b/i, "extended_mix"],
    [/\boriginal\s+mix\b/i, "original_mix"],
    [/\bradio\s+edit\b/i,   "radio_edit"],
    [/\bclub\s+mix\b/i,     "club_mix"],
    [/\bdub\s+mix\b/i,      "dub_mix"],
    [/\bvip\s+mix\b/i,      "vip_mix"],
    [/\binstrumental\b/i,   "instrumental"],
    [/\bmashup\b/i,         "mashup"],
    [/\bbootleg\b/i,        "bootleg"],
    [/\brework\b/i,         "rework"],
    [/\bacapp?ella\b/i,     "acapella"],
    [/\bedit\b/i,           "edit"],
    [/\btool\b/i,           "tool"],
  ]
  for (const [pattern, value] of patterns) {
    if (pattern.test(title)) return value
  }
  return null
}

// Detects "(Artist Remix)", "[Artist Remix]", "- Artist Remix" patterns.
function detectRemixFromTitle(title: string): { versionType?: string; remixer?: string } {
  const bracketPattern = /[([]([\w\s:&.,'-]+?)\s+[Rr]emix[)\]]/
  const dashPattern = /-\s+([\w\s:&.,'-]+?)\s+[Rr]emix\s*$/
  for (const pattern of [bracketPattern, dashPattern]) {
    const match = title.match(pattern)
    if (match) return { versionType: "remix", remixer: match[1].trim() }
  }
  if (/\bremix\b/i.test(title)) return { versionType: "remix" }
  return {}
}

function toDateInputValue(value: string) {
  return value.slice(0, 10)
}


function getReleaseFormState(artist: Artist): ReleaseFormState[] {
  return artist.releases.map((release) => {
    const { versionType, customVersionType } = parseVersionType(release.versionType)
    return {
      id: release.id,
      isFeatured: release.isFeatured ?? false,
      title: release.title,
      label: release.label,
      credits: release.credits ?? "",
      releaseDate: toDateInputValue(release.releaseDate),
      type: release.type,
      platformUrl: release.platformUrl,
      artworkUrl: release.artworkUrl,
      spotifyUrl: release.spotifyUrl ?? "",
      appleMusicUrl: release.appleMusicUrl ?? "",
      soundcloudUrl: release.soundcloudUrl ?? "",
      youtubeMusicUrl: release.youtubeMusicUrl ?? "",
      beatportUrl: release.beatportUrl ?? "",
      traxsourceUrl: release.traxsourceUrl ?? "",
      bandcampUrl: release.bandcampUrl ?? "",
      otherUrl: release.otherUrl ?? "",
      releaseType: release.releaseType ?? "",
      versionType,
      customVersionType,
      remixer: release.remixer ?? "",
    }
  })
}

function createEmptyRelease(): ReleaseFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    isFeatured: false,
    title: "",
    label: "",
    credits: "",
    releaseDate: "",
    type: "",
    platformUrl: "",
    artworkUrl: "",
    spotifyUrl: "",
    appleMusicUrl: "",
    soundcloudUrl: "",
    youtubeMusicUrl: "",
    beatportUrl: "",
    traxsourceUrl: "",
    bandcampUrl: "",
    otherUrl: "",
    releaseType: "",
    versionType: "",
    customVersionType: "",
    remixer: "",
  }
}

function mergeImportedReleaseFields<T extends ReleaseFormState>(
  current: T,
  result: ImportedReleaseMetadata,
): T {
  const nextLabel =
    result.provider === "spotify"
      ? current.label
      : result.label?.trim() || current.label
  const nextCredits = result.artist?.trim() || current.credits
  const nextType = result.type != null ? normalizeReleaseType(result.type) : current.type

  return {
    ...current,
    title: result.title?.trim() || current.title,
    label: nextLabel,
    credits: nextCredits,
    releaseDate: result.releaseDate ?? current.releaseDate,
    type: nextType,
    platformUrl: result.platformUrl,
    artworkUrl: result.artworkUrl ?? current.artworkUrl,
  }
}

function mergeDjSetMetadata(current: DjSetFormState, result: ImportedReleaseMetadata): DjSetFormState {
  return {
    ...current,
    // Only suggest imported title as titleOverride if no override is set yet
    titleOverride: current.titleOverride || result.title?.trim() || current.titleOverride,
    imageUrl: result.artworkUrl?.trim() || current.imageUrl,
    platformUrl: result.platformUrl || current.platformUrl,
    // Only fill date if not already set; never overwrite artists/type/event/venue
    setDate: current.setDate || result.releaseDate || current.setDate,
  }
}

// Sorts gigs: upcoming ascending first, then past gigs descending (most recent past first),
// invalid/empty dates last. YYYY-MM-DD strings compare correctly as plain strings.
function sortGigsByDate(gigs: GigFormState[]): GigFormState[] {
  const today = new Date().toISOString().slice(0, 10)
  return [...gigs].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    const aPast = a.date < today
    const bPast = b.date < today
    if (aPast !== bPast) return aPast ? 1 : -1
    // Both past: most recent first (descending)
    if (aPast && bPast) return a.date > b.date ? -1 : a.date < b.date ? 1 : 0
    // Both upcoming: nearest first (ascending)
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  })
}

function getGigFormState(artist: Artist): GigFormState[] {
  return sortGigsByDate(
    artist.upcomingGigs.map((gig) => ({
      id: gig.id,
      eventName: gig.eventName ?? undefined,
      venue: gig.venue,
      clubVenue: gig.clubVenue ?? undefined,
      date: toDateInputValue(gig.date),
      city: gig.city,
      country: gig.country,
      eventStatus: (gig.eventStatus ?? null) as "upcoming" | "sold_out" | "cancelled" | null,
      ticketUrl: gig.ticketUrl,
      flyerUrl: gig.flyerUrl,
      instagramUrl: gig.instagramUrl,
      feeAmount: gig.feeAmount ?? null,
      feeCurrency: gig.feeCurrency ?? null,
      paymentStatus: gig.paymentStatus ?? null,
      visibilityStatus: (gig.visibilityStatus ?? "announced") as "announced" | "tba" | "tbc" | "cancelled",
    })),
  )
}

function getDjSetFormState(artist: Artist): DjSetFormState[] {
  return artist.djSets.map((set) => ({
    id: set.id,
    performanceType: set.performanceType,
    performanceArtists: set.performanceArtists,
    customPerformanceType: set.customPerformanceType ?? "",
    titleOverride: set.titleOverride ?? "",
    venue: set.venue ?? "",
    event: set.event ?? "",
    setDate: set.setDate ? toDateInputValue(set.setDate) : "",
    city: set.city ?? "",
    imageUrl: set.imageUrl ?? "",
    platformUrl: set.platformUrl,
    isPublished: set.isPublished,
  }))
}

function createEmptyDjSet(artistName: string): DjSetFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    performanceType: "dj_set",
    performanceArtists: [artistName],
    customPerformanceType: "",
    titleOverride: "",
    venue: "",
    event: "",
    setDate: "",
    city: "",
    imageUrl: "",
    platformUrl: "",
    isPublished: true,
  }
}

function getVideoFormState(artist: Artist): VideoFormState[] {
  return artist.videos.map((video) => ({
    id: video.id,
    title: video.title,
    videoArtists: video.videoArtists.length > 0 ? video.videoArtists : [artist.artistName],
    videoEvent: video.videoEvent ?? "",
    videoCity: video.videoCity ?? "",
    videoCountry: video.videoCountry ?? "",
    venue: video.venue ?? "",
    videoDate: video.videoDate ? toDateInputValue(video.videoDate) : "",
    thumbnailUrl: video.thumbnailUrl ?? "",
    customThumbnailUrl: video.customThumbnailUrl ?? null,
    platformUrl: video.platformUrl,
    isPublished: video.isPublished,
  }))
}

function createEmptyVideo(artistName: string): VideoFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    title: "",
    videoArtists: [artistName],
    videoEvent: "",
    videoCity: "",
    videoCountry: "",
    venue: "",
    videoDate: "",
    thumbnailUrl: "",
    customThumbnailUrl: null,
    platformUrl: "",
    isPublished: true,
  }
}

// Parses a JSON response safely — validates content-type before calling .json()
// to avoid "Unexpected token" errors when servers return HTML (e.g. Vercel 413 pages).
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 413
        ? "Image too large for upload. Please use a smaller file."
        : `Server error (${response.status}). Please try again.`,
    )
  }
  return response.json() as Promise<T>
}

// Resizes and re-encodes a File to WebP (JPEG fallback) at max 2400×2400, quality 0.84.
function compressHeroImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 2400
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas unavailable."))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob)
            return
          }
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob)
              else reject(new Error("Image processing failed."))
            },
            "image/jpeg",
            0.84,
          )
        },
        "image/webp",
        0.84,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Image processing failed."))
    }
    img.src = objectUrl
  })
}

function getArtistInitialsPreview(artistName: string): string {
  const parts = artistName.trim().split(/[\s:_-]+/).filter(Boolean)
  if (!parts.length) return "DJ"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Resizes and re-encodes a File to WebP (JPEG fallback) at max 3000×3000, quality 0.86.
// Runs entirely in the browser — no server round-trip for the image bytes.
function compressGalleryImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 3000
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas unavailable."))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob)
            return
          }
          // WebP not supported — fall back to JPEG.
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob)
              else reject(new Error("Unable to compress image."))
            },
            "image/jpeg",
            0.86,
          )
        },
        "image/webp",
        0.86,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Unable to load image for compression."))
    }
    img.src = objectUrl
  })
}

function mergeVideoMetadata(current: VideoFormState, result: ImportedVideoMetadata): VideoFormState {
  return {
    ...current,
    // Only fill the hidden fallback title (used when no structured fields produce a title)
    title: result.title?.trim() || current.title,
    thumbnailUrl: result.thumbnailUrl?.trim() || current.thumbnailUrl,
    platformUrl: result.platformUrl || current.platformUrl,
    // Never overwrite structured fields (artists, event, venue, city, country)
  }
}

type DashboardClientProps = {
  initialArtist: Artist
  statusMessage?: string
}

// ── Gig three-dot actions dropdown ─────────────────────────────────────────
// Defined at module level so React sees a stable component type across renders.
function GigActionsDropdown({
  onEdit,
  onDelete,
  onClose,
  align = "right",
}: {
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  align?: "right" | "left"
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [onClose])
  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-xl",
        "border border-gray-200 bg-white shadow-lg shadow-gray-200/60",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12px] font-medium text-gray-700 transition-colors duration-100 hover:bg-gray-50"
      >
        Edit
      </button>
      <div className="mx-3 h-px bg-gray-100" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12px] font-medium text-red-500/80 transition-colors duration-100 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    </div>
  )
}

export default function DashboardClient({ initialArtist, statusMessage }: DashboardClientProps) {
  const [artist, setArtist] = useState<Artist>(initialArtist)
  const initialLinkUrls = getLinkUrlsFromArtist(artist)
  const initialReleases = getReleaseFormState(artist)
  const initialUpcomingGigs = getGigFormState(artist)
  const [activeSection, setActiveSection] = useState("home")
  const [artistName, setArtistName] = useState(initialArtist.artistName)
  const [handle, setHandle] = useState(initialArtist.handle)
  const [genres, setGenres] = useState(initialArtist.genres.join(", "))
  const [location, setLocation] = useState(initialArtist.location)
  const [shortBio, setShortBio] = useState(initialArtist.shortBio)
  const [heroImageUrl, setHeroImageUrl] = useState(initialArtist.heroImageUrl)
  const [heroTagline, setHeroTagline] = useState(initialArtist.heroTagline ?? "")
  const [showHeaderBranding, setShowHeaderBranding] = useState(initialArtist.showHeaderBranding)
  const [browserTitle, setBrowserTitle] = useState(initialArtist.browserTitle ?? "")
  const [faviconUrl, setFaviconUrl] = useState(initialArtist.faviconUrl ?? "")
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)
  const [heroLogoUrl, setHeroLogoUrl] = useState(initialArtist.heroLogoUrl ?? "")
  const [heroIdentityMode, setHeroIdentityMode] = useState<"text" | "logo" | "both">(initialArtist.heroIdentityMode ?? "text")
  const [heroTextStyle, setHeroTextStyle] = useState<"default" | "condensed" | "cinematic" | "editorial">(initialArtist.heroTextStyle ?? "default")
  const [heroLogoScale, setHeroLogoScale] = useState(initialArtist.heroLogoScale ?? 100)
  const [heroLogoLayout, setHeroLogoLayout] = useState<HeroLogoLayout>(initialArtist.heroLogoLayout ?? "replace_text")
  const [heroLogoAlignment, setHeroLogoAlignment] = useState<"left" | "center" | "right">(initialArtist.heroLogoAlignment ?? "left")
  const [heroLogoOffsetX, setHeroLogoOffsetX] = useState(initialArtist.heroLogoOffsetX ?? 0)
  const [heroLogoOffsetY, setHeroLogoOffsetY] = useState(initialArtist.heroLogoOffsetY ?? 0)
  const [heroLogoStyle, setHeroLogoStyle] = useState<HeroLogoStyle>(initialArtist.heroLogoStyle ?? "solid")
  const [heroLogoReadability, setHeroLogoReadability] = useState<HeroLogoReadability>(initialArtist.heroLogoReadability ?? "subtle")
  const [heroContentSurface, setHeroContentSurface] = useState<HeroContentSurface>(initialArtist.heroContentSurface ?? "soft")
  const [heroLogoPlacement, setHeroLogoPlacement] = useState<HeroLogoPlacement>(initialArtist.heroLogoPlacement ?? "editorial")
  const [heroContentWidth, setHeroContentWidth] = useState<HeroContentWidth>(initialArtist.heroContentWidth ?? "standard")
  // Image composition — local draft only, not persisted (schema has no columns for these yet)
  const [heroImageX, setHeroImageX] = useState(50)
  const [heroImageY, setHeroImageY] = useState(50)
  const [heroImageZoom, setHeroImageZoom] = useState(100)
  const [accentTheme, setAccentTheme] = useState<ArtistAccentTheme>(initialArtist.accentTheme ?? "matrix")
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.4)
  const [openHeroPanel, setOpenHeroPanel] = useState<"content"|"branding"|"media"|"appearance"|null>("content")
  const [heroLogoFile, setHeroLogoFile] = useState<File | null>(null)
  const [isUploadingHeroLogo, setIsUploadingHeroLogo] = useState(false)
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>(initialLinkUrls)
  const [releases, setReleases] = useState(initialReleases)
  const [upcomingGigs, setUpcomingGigs] = useState(initialUpcomingGigs)

  const [bookingEmail, setBookingEmail] = useState(initialArtist.bookingInfo.email)
  const [bookingUrl, setBookingUrl] = useState(initialArtist.bookingInfo.bookingUrl ?? "")
  const [pressKitEnabled, setPressKitEnabled] = useState(initialArtist.pressKit.enabled)
  const [pressKitUrl, setPressKitUrl] = useState(initialArtist.pressKit.downloadUrl)
  const [pressKitPublicUrl, setPressKitPublicUrl] = useState(initialArtist.pressKit.publicUrl ?? "")
  const [pressKitAssets, setPressKitAssets] = useState<string[]>(initialArtist.pressKit.assetsIncluded)
  const [pressKitRootUrl, setPressKitRootUrl] = useState(initialArtist.pressKit.rootUrl ?? "")
  const [pressKitBioFolderUrl, setPressKitBioFolderUrl] = useState(initialArtist.pressKit.bioFolderUrl ?? "")
  const [pressKitLogosFolderUrl, setPressKitLogosFolderUrl] = useState(initialArtist.pressKit.logosFolderUrl ?? "")
  const [pressKitMediaFolderUrl, setPressKitMediaFolderUrl] = useState(initialArtist.pressKit.mediaFolderUrl ?? "")
  const [pressKitRiderFolderUrl, setPressKitRiderFolderUrl] = useState(initialArtist.pressKit.riderFolderUrl ?? "")
  const [pressKitPdfEnUrl, setPressKitPdfEnUrl] = useState(initialArtist.pressKit.pdfEnUrl ?? "")
  const [pressKitPdfEsUrl, setPressKitPdfEsUrl] = useState(initialArtist.pressKit.pdfEsUrl ?? "")
  const [pressKitPdfEnSize, setPressKitPdfEnSize] = useState(initialArtist.pressKit.pdfEnSize ?? "")
  const [pressKitPdfEsSize, setPressKitPdfEsSize] = useState(initialArtist.pressKit.pdfEsSize ?? "")
  const [pressKitUseGalleryPhotos, setPressKitUseGalleryPhotos] = useState(initialArtist.pressKit.useGalleryPhotos ?? true)
  const [pressKitAdvancedOpen, setPressKitAdvancedOpen] = useState(false)
  const [footerLogoUrl, setFooterLogoUrl] = useState(initialArtist.footerLogoUrl ?? "")
  const [footerLogoWidth, setFooterLogoWidth] = useState(initialArtist.footerLogoWidth ?? 220)
  const [footerLogoFile, setFooterLogoFile] = useState<File | null>(null)
  const [footerLogoMode, setFooterLogoMode] = useState<"auto" | "light" | "dark">(
    (initialArtist.footerLogoMode ?? "auto") as "auto" | "light" | "dark"
  )
  const [footerLogoHasBg, setFooterLogoHasBg] = useState(false)
  const [isUploadingFooterLogo, setIsUploadingFooterLogo] = useState(false)
  const [footerBookingEmail, setFooterBookingEmail] = useState(initialArtist.footerBookingEmail ?? "")
  const [footerContactEmail, setFooterContactEmail] = useState(initialArtist.footerContactEmail ?? "")
  const [footerDemosEmail, setFooterDemosEmail] = useState(initialArtist.footerDemosEmail ?? "")
  const [footerNewsletterEnabled, setFooterNewsletterEnabled] = useState(initialArtist.footerNewsletterEnabled ?? true)
  const [footerSocialsEnabled, setFooterSocialsEnabled] = useState(initialArtist.footerSocialsEnabled ?? true)
  const [footerCopyright, setFooterCopyright] = useState(initialArtist.footerCopyright ?? "")

  // ── Brand section state ────────────────────────────────────────────
  const [brandSourceFiles, setBrandSourceFiles] = useState<BrandSourceFile[]>([])
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const [brandLoadStatus, setBrandLoadStatus] = useState<"idle"|"loading"|"loaded"|"error">("idle")
  const [brandDragActive, setBrandDragActive] = useState(false)
  const [brandUploading, setBrandUploading] = useState(false)
  const [brandUploadQueue, setBrandUploadQueue] = useState<{ file: File; status: "pending"|"uploading"|"done"|"error"; error?: string }[]>([])
  const [brandSolidBgIds, setBrandSolidBgIds] = useState<Set<string>>(new Set())
  const [brandProcessingIds, setBrandProcessingIds] = useState<Set<string>>(new Set())
  const [brandProcessingLog, setBrandProcessingLog] = useState<Record<string, { steps: {label:string; ok:boolean}[]; error?:string; done:boolean }>>({})
  const [brandSelectedVariants, setBrandSelectedVariants] = useState<Record<string, string>>({})
  const [brandDrawerAsset, setBrandDrawerAsset] = useState<string | null>(null)
  const [brandCollapsed, setBrandCollapsed] = useState<Record<string, boolean>>({})
  type BrandAssignment = { id: string; assignmentType: string; brandAssetId: string; variant: string; variantUrl: string }
  const [brandAssignments, setBrandAssignments] = useState<BrandAssignment[]>([])
  const [pkExpandedIds, setPkExpandedIds] = useState<Set<string>>(new Set())
  const [newAssetInput, setNewAssetInput] = useState("")
  const [pastGigsExpanded, setPastGigsExpanded] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return initialUpcomingGigs.filter((g) => g.date && g.date < today).length <= 5
  })
  const initialDjSets = getDjSetFormState(artist)
  const [djSets, setDjSets] = useState(initialDjSets)
  const [advancedOpenIds, setAdvancedOpenIds] = useState<Set<string>>(() => {
    // Auto-open advanced section for sets that already have a titleOverride (backward compat)
    return new Set(initialDjSets.filter((s) => s.titleOverride !== "").map((s) => s.id))
  })
  const initialVideos = getVideoFormState(artist)
  const [videos, setVideos] = useState(initialVideos)
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null)
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | null>(null)
  const [releasePlatformLinksOpen, setReleasePlatformLinksOpen] = useState(false)
  const [releaseMenuOpenId, setReleaseMenuOpenId] = useState<string | null>(null)
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [setMenuOpenId, setSetMenuOpenId] = useState<string | null>(null)
  const [expandedGigId, setExpandedGigId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGig, setEditingGig] = useState<import("@/components/dashboard/gig-card").GigEntry | null>(null)
  const [deletingGig, setDeletingGig] = useState<import("@/components/dashboard/gig-card").GigEntry | null>(null)
  const [openGigActionsId, setOpenGigActionsId] = useState<string | null>(null)
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const [videoMenuOpenId, setVideoMenuOpenId] = useState<string | null>(null)
  const [linksVersion, setLinksVersion] = useState<"v1" | "v2">("v2")
  const [saveMessage, setSaveMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [importingSelectedReleaseIndex, setImportingSelectedReleaseIndex] = useState<number | null>(null)
  const [importingDjSetIndex, setImportingDjSetIndex] = useState<number | null>(null)
  const [importingVideoIndex, setImportingVideoIndex] = useState<number | null>(null)
  const [uploadingVideoThumbnailIndex, setUploadingVideoThumbnailIndex] = useState<number | null>(null)
  const [uploadingDjSetCoverIndex, setUploadingDjSetCoverIndex] = useState<number | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [heroUploadStatus, setHeroUploadStatus] = useState<"idle" | "compressing" | "uploading">("idle")
  const isUploadingHeroImage = heroUploadStatus !== "idle"
  const [galleryImages, setGalleryImages] = useState(initialArtist.galleryImages)
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null)
  const [galleryImageAltText, setGalleryImageAltText] = useState("")
  const [galleryFileError, setGalleryFileError] = useState("")
  const [galleryImageSmallWarning, setGalleryImageSmallWarning] = useState("")
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false)
  const [deletingGalleryImageId, setDeletingGalleryImageId] = useState<string | null>(null)
  const [isReorderingGallery, setIsReorderingGallery] = useState(false)
  const [galleryDragIndex, setGalleryDragIndex] = useState<number | null>(null)
  const [galleryDragOverIndex, setGalleryDragOverIndex] = useState<number | null>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const [savedRecently, setSavedRecently] = useState(false)
  const [customDomains, setCustomDomains] = useState(initialArtist.customDomains)
  const [domainInput, setDomainInput] = useState("")
  const [isAddingDomain, setIsAddingDomain] = useState(false)
  const [addDomainError, setAddDomainError] = useState("")
  const [isVerifyingDomainId, setIsVerifyingDomainId] = useState<string | null>(null)
  const [isCheckingConnectionId, setIsCheckingConnectionId] = useState<string | null>(null)
  const [isRemovingDomainId, setIsRemovingDomainId] = useState<string | null>(null)

  // ── Tour Planner ─────────────────────────────────────────────────────────
  type TourRecord = {
    id: string; name: string; slug: string
    startDate: string; endDate: string
    isPublished: boolean; createdAt: string
  }
  const [tours, setTours] = useState<TourRecord[]>([])
  const [toursLoaded, setToursLoaded] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const [tourFormOpen, setTourFormOpen] = useState(false)
  const [tourFormMode, setTourFormMode] = useState<"create" | "edit">("create")
  const [tourName, setTourName] = useState("")
  const [tourSlug, setTourSlug] = useState("")
  const [tourStartDate, setTourStartDate] = useState("")
  const [tourEndDate, setTourEndDate] = useState("")
  const [tourIsPublished, setTourIsPublished] = useState(true)
  const [tourSaving, setTourSaving] = useState(false)
  const [tourError, setTourError] = useState("")
  const [tourUrlCopied, setTourUrlCopied] = useState(false)
  const [tourDeleting, setTourDeleting] = useState(false)
  const [tourDeleteConfirm, setTourDeleteConfirm] = useState(false)

  type HomeBooking = {
    id: string; referenceId: string; fullName: string
    city: string; eventDate: string; status: string
  } | null | "loading"
  type HomeLead = { id: string; fullName: string; city: string; eventDate: string; status: string }
  const [homeBooking, setHomeBooking] = useState<HomeBooking>("loading")
  const [homeLeads, setHomeLeads] = useState<HomeLead[]>([])
  const [homeContentTab, setHomeContentTab] = useState("releases")
  const homeBookingFetchedRef = useRef(false)

  useLayoutEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    setPreviewScale(el.getBoundingClientRect().width / PREVIEW_NATURAL_W)
    const observer = new ResizeObserver(([entry]) => {
      setPreviewScale(entry.contentRect.width / PREVIEW_NATURAL_W)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Load brand data when the Brand section is opened for the first time.
  // setTimeout(0) defers the initial setState call out of the synchronous
  // effect body, satisfying the React Compiler's cascade-render check.
  useEffect(() => {
    if (activeSection !== "brand" || brandLoadStatus !== "idle") return
    const tid = setTimeout(() => {
      setBrandLoadStatus("loading")
      fetch(`/api/artists/brand-assets?artistId=${encodeURIComponent(artist.id)}`)
        .then((r) => r.json())
        .then((data: { sourceFiles?: unknown[]; assets?: unknown[] }) => {
          const sf = (data.sourceFiles ?? []) as Array<Record<string, unknown>>
          const a  = (data.assets    ?? []) as Array<Record<string, unknown>>
          setBrandSourceFiles(sf.map((f) => ({
            id:        f.id        as string,
            filename:  f.filename  as string,
            fileType:  f.file_type as string,
            fileExt:   f.file_ext  as string,
            fileUrl:   f.file_url  as string,
            fileSize:  f.file_size as number | null,
            status:    f.status    as BrandSourceFile["status"],
            createdAt: f.created_at as string,
          })))
          setBrandAssets(a.map((x) => ({
            id:           x.id             as string,
            sourceFileId: x.source_file_id as string | null,
            name:         x.name           as string | null,
            assetType:    x.asset_type     as BrandAsset["assetType"],
            status:       x.status         as string,
            previewUrl:   x.preview_url    as string,
            hasSolidBg:   x.has_solid_bg   as boolean,
            variant:      (x.variant       as string | undefined) ?? "original",
            sourcePage:   (x.source_page   as number | null | undefined) ?? null,
            createdAt:    x.created_at     as string,
          })))
          setBrandLoadStatus("loaded")
        })
        .catch(() => setBrandLoadStatus("error"))
      fetch(`/api/artists/brand-assignments?artistId=${encodeURIComponent(artist.id)}`)
        .then((r) => r.json())
        .then((data: { assignments?: Array<Record<string, unknown>> }) => {
          setBrandAssignments((data.assignments ?? []).map((a) => ({
            id:             a.id              as string,
            assignmentType: a.assignment_type as string,
            brandAssetId:   a.brand_asset_id  as string,
            variant:        a.variant         as string,
            variantUrl:     a.variant_url     as string,
          })))
        })
        .catch(() => {})
    }, 0)
    return () => clearTimeout(tid)
  }, [activeSection, brandLoadStatus, artist.id])

  // Set editor modal: Escape to close + body scroll lock
  useEffect(() => {
    if (!expandedSetId) {
      document.body.style.overflow = ""
      return
    }
    document.body.style.overflow = "hidden"
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedSetId(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [expandedSetId])

  // Video editor modal: Escape to close + body scroll lock
  useEffect(() => {
    if (!expandedVideoId) {
      document.body.style.overflow = ""
      return
    }
    document.body.style.overflow = "hidden"
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedVideoId(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [expandedVideoId])

  // Tour Planner: load tours once when section is first visited (also needed on home for Active Tour)
  useEffect(() => {
    if ((activeSection !== "tours" && activeSection !== "home") || toursLoaded) return
    void (async () => {
      try {
        const res = await fetch(`/api/artists/tours?artistId=${artist.id}`)
        if (res.ok) {
          const data = await res.json()
          setTours(data.tours ?? [])
        }
      } finally {
        setToursLoaded(true)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  // Home: fetch latest booking for the command surface (once per mount)
  useEffect(() => {
    if (activeSection !== "home" || homeBookingFetchedRef.current) return
    homeBookingFetchedRef.current = true
    void hqListBookingLeads(artist.id)
      .then((leads) => {
        setHomeLeads(leads.map((l) => ({ id: l.id, fullName: l.fullName, city: l.city, eventDate: l.eventDate, status: l.status })))
        const first = leads[0]
        setHomeBooking(
          first
            ? {
                id: first.id,
                referenceId: first.referenceId,
                fullName: first.fullName,
                city: first.city,
                eventDate: first.eventDate,
                status: first.status,
              }
            : null,
        )
      })
      .catch(() => setHomeBooking(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  const publicProfileUrl = `/${artist.handle}`
  const isProfileDirty =
    artistName !== artist.artistName ||
    handle !== artist.handle ||
    genres !== artist.genres.join(", ") ||
    location !== artist.location ||
    shortBio !== artist.shortBio ||
    heroImageUrl !== artist.heroImageUrl ||
    heroTagline !== (artist.heroTagline ?? "") ||
    showHeaderBranding !== artist.showHeaderBranding ||
    browserTitle !== (artist.browserTitle ?? "") ||
    faviconUrl !== (artist.faviconUrl ?? "") ||
    heroLogoUrl !== (artist.heroLogoUrl ?? "") ||
    heroIdentityMode !== (artist.heroIdentityMode ?? "text") ||
    heroTextStyle !== (artist.heroTextStyle ?? "default") ||
    heroLogoScale !== (artist.heroLogoScale ?? 100) ||
    heroLogoLayout !== (artist.heroLogoLayout ?? "replace_text") ||
    heroLogoAlignment !== (artist.heroLogoAlignment ?? "left") ||
    heroLogoOffsetX !== (artist.heroLogoOffsetX ?? 0) ||
    heroLogoOffsetY !== (artist.heroLogoOffsetY ?? 0) ||
    heroLogoStyle !== (artist.heroLogoStyle ?? "solid") ||
    heroLogoReadability !== (artist.heroLogoReadability ?? "subtle") ||
    heroContentSurface !== (artist.heroContentSurface ?? "soft") ||
    heroLogoPlacement !== (artist.heroLogoPlacement ?? "editorial") ||
    heroContentWidth !== (artist.heroContentWidth ?? "standard") ||
    accentTheme !== (artist.accentTheme ?? "matrix")
  const isLinksDirty = JSON.stringify(linkUrls) !== JSON.stringify(initialLinkUrls)
  const isReleasesDirty = JSON.stringify(releases) !== JSON.stringify(initialReleases)
  const isGigsDirty = JSON.stringify(upcomingGigs) !== JSON.stringify(initialUpcomingGigs)
  const isDjSetsDirty = JSON.stringify(djSets) !== JSON.stringify(initialDjSets)
  const isVideosDirty = JSON.stringify(videos) !== JSON.stringify(initialVideos)
  const isBookingDirty =
    bookingEmail !== artist.bookingInfo.email
  const isPressKitDirty =
    pressKitEnabled !== artist.pressKit.enabled ||
    pressKitUrl !== artist.pressKit.downloadUrl ||
    JSON.stringify(pressKitAssets) !== JSON.stringify(artist.pressKit.assetsIncluded) ||
    pressKitRootUrl !== (artist.pressKit.rootUrl ?? "") ||
    pressKitBioFolderUrl !== (artist.pressKit.bioFolderUrl ?? "") ||
    pressKitLogosFolderUrl !== (artist.pressKit.logosFolderUrl ?? "") ||
    pressKitMediaFolderUrl !== (artist.pressKit.mediaFolderUrl ?? "") ||
    pressKitRiderFolderUrl !== (artist.pressKit.riderFolderUrl ?? "") ||
    pressKitPdfEnUrl !== (artist.pressKit.pdfEnUrl ?? "") ||
    pressKitPdfEsUrl !== (artist.pressKit.pdfEsUrl ?? "") ||
    pressKitPdfEnSize !== (artist.pressKit.pdfEnSize ?? "") ||
    pressKitPdfEsSize !== (artist.pressKit.pdfEsSize ?? "") ||
    pressKitUseGalleryPhotos !== (artist.pressKit.useGalleryPhotos ?? true) ||
    pressKitPublicUrl !== (artist.pressKit.publicUrl ?? "")
  const isFooterDirty =
    footerLogoUrl !== (artist.footerLogoUrl ?? "") ||
    footerLogoMode !== (artist.footerLogoMode ?? "auto") ||
    footerLogoWidth !== (artist.footerLogoWidth ?? 180) ||
    footerBookingEmail !== (artist.footerBookingEmail ?? "") ||
    footerNewsletterEnabled !== (artist.footerNewsletterEnabled ?? true) ||
    footerSocialsEnabled !== (artist.footerSocialsEnabled ?? true) ||
    footerCopyright !== (artist.footerCopyright ?? "")

  const isSaveDirty = isProfileDirty || isLinksDirty || isReleasesDirty || isGigsDirty || isDjSetsDirty || isVideosDirty || isBookingDirty || isPressKitDirty || isFooterDirty

  async function persistArtistChanges(
    nextPublished: boolean,
    successMessage: string,
    urlOverrides?: { heroLogoUrl?: string; faviconUrl?: string; footerLogoUrl?: string },
  ) {
    const savedGenres = genres
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean)

    const response = await fetch("/api/artists", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        artistId: artist.id,
        isPublished: nextPublished,
        profile: {
          artistName,
          handle,
          genres: savedGenres,
          location,
          shortBio,
          heroImageUrl,
          heroTagline,
          showHeaderBranding,
          browserTitle,
          faviconUrl: urlOverrides?.faviconUrl ?? faviconUrl,
          heroLogoUrl: urlOverrides?.heroLogoUrl ?? heroLogoUrl,
          heroIdentityMode,
          heroTextStyle,
          heroLogoScale,
          heroLogoLayout,
          heroLogoAlignment,
          heroLogoOffsetX,
          heroLogoOffsetY,
          heroLogoStyle,
          heroLogoReadability,
          heroContentSurface,
          heroLogoPlacement,
          heroContentWidth,
          accentTheme,
        },
        socialLinks: PLATFORM_CONFIG
          .filter(({ id }) => linkUrls[id]?.trim())
          .map(({ id, label }) => ({
            platform: id,
            label,
            url: linkUrls[id].trim(),
          })),
        releases: releases.map((r) => ({
          isFeatured: r.isFeatured,
          title: r.title,
          label: r.label,
          credits: r.credits,
          releaseDate: r.releaseDate,
          type: r.type,
          platformUrl: r.platformUrl,
          artworkUrl: r.artworkUrl,
          spotifyUrl: r.spotifyUrl,
          appleMusicUrl: r.appleMusicUrl,
          soundcloudUrl: r.soundcloudUrl,
          youtubeMusicUrl: r.youtubeMusicUrl,
          beatportUrl: r.beatportUrl,
          traxsourceUrl: r.traxsourceUrl,
          bandcampUrl: r.bandcampUrl,
          otherUrl: r.otherUrl,
          releaseType: r.releaseType || undefined,
          versionType: r.versionType === "other"
            ? r.customVersionType.trim() || undefined
            : r.versionType || undefined,
          remixer: r.remixer.trim() || undefined,
        })),
        gigs: upcomingGigs,
        djSets: djSets.map((set) => ({
          performanceType: set.performanceType,
          performanceArtists: set.performanceArtists,
          customPerformanceType: set.customPerformanceType || undefined,
          titleOverride: set.titleOverride || undefined,
          venue: set.venue,
          event: set.event,
          setDate: set.setDate,
          city: set.city || undefined,
          imageUrl: set.imageUrl,
          platformUrl: set.platformUrl,
          isPublished: set.isPublished,
        })),
        videos: videos.map((v) => ({
          title: v.title,
          videoArtists: v.videoArtists,
          videoEvent: v.videoEvent || undefined,
          videoCity: v.videoCity || undefined,
          videoCountry: v.videoCountry || undefined,
          venue: v.venue || undefined,
          videoDate: v.videoDate || undefined,
          thumbnailUrl: v.thumbnailUrl || undefined,
          customThumbnailUrl: v.customThumbnailUrl ?? null,
          platformUrl: v.platformUrl,
          isPublished: v.isPublished,
        })),
        booking: {
          email: bookingEmail,
          bookingUrl: bookingUrl || null,
          pressKitEnabled,
          pressKitUrl: pressKitUrl || null,
          pressKitPublicUrl: pressKitPublicUrl.trim() || null,
          pressKitAssets,
          pressKitRootUrl: pressKitRootUrl || null,
          pressKitBioFolderUrl: pressKitBioFolderUrl || null,
          pressKitLogosFolderUrl: pressKitLogosFolderUrl || null,
          pressKitMediaFolderUrl: pressKitMediaFolderUrl || null,
          pressKitRiderFolderUrl: pressKitRiderFolderUrl || null,
          pressKitPdfEnUrl: pressKitPdfEnUrl || null,
          pressKitPdfEsUrl: pressKitPdfEsUrl || null,
          pressKitPdfEnSize: pressKitPdfEnSize || null,
          pressKitPdfEsSize: pressKitPdfEsSize || null,
          pressKitUseGalleryPhotos,
        },
        footer: {
          logoUrl: (urlOverrides?.footerLogoUrl ?? footerLogoUrl) || null,
          logoMode: footerLogoMode,
          logoWidth: footerLogoWidth,
          bookingEmail: footerBookingEmail || null,
          contactEmail: footerContactEmail || null,
          demosEmail: footerDemosEmail || null,
          newsletterEnabled: footerNewsletterEnabled,
          socialsEnabled: footerSocialsEnabled,
          copyright: footerCopyright || null,
        },
      }),
    })

    if (!response.ok) {
      const result = (await response.json()) as { error?: string }
      throw new Error(result.error ?? "Unable to save changes.")
    }

    const savedArtist: Artist = {
      ...artist,
      artistName: artistName.trim(),
      handle: handle.trim().toLowerCase(),
      genres: savedGenres,
      location: location.trim(),
      shortBio: shortBio.trim(),
      heroImageUrl: heroImageUrl.trim(),
      heroTagline: heroTagline.trim() || undefined,
      showHeaderBranding,
      browserTitle: browserTitle.trim() || undefined,
      faviconUrl: (urlOverrides?.faviconUrl ?? faviconUrl).trim() || undefined,
      heroLogoUrl: (urlOverrides?.heroLogoUrl ?? heroLogoUrl).trim() || null,
      heroIdentityMode,
      heroTextStyle,
      heroLogoScale,
      heroLogoLayout,
      heroLogoAlignment,
      heroLogoOffsetX,
      heroLogoOffsetY,
      heroLogoStyle,
      heroLogoReadability,
      heroContentSurface,
      heroLogoPlacement,
      heroContentWidth,
      accentTheme,
      isPublished: nextPublished,
      socialLinks: PLATFORM_CONFIG
        .filter(({ id }) => linkUrls[id]?.trim())
        .map(({ id, label }) => ({
          platform: id,
          label,
          url: linkUrls[id].trim(),
        })),
      releases: releases.map((release) => ({
        id: release.id,
        isFeatured: release.isFeatured,
        title: release.title.trim(),
        label: release.label.trim(),
        credits: release.credits.trim() || undefined,
        releaseDate: release.releaseDate,
        artworkUrl: release.artworkUrl.trim(),
        platformUrl: release.platformUrl.trim(),
        type: normalizeReleaseType(release.type),
        spotifyUrl: release.spotifyUrl?.trim() || undefined,
        appleMusicUrl: release.appleMusicUrl?.trim() || undefined,
        soundcloudUrl: release.soundcloudUrl?.trim() || undefined,
        youtubeMusicUrl: release.youtubeMusicUrl?.trim() || undefined,
        beatportUrl: release.beatportUrl?.trim() || undefined,
        traxsourceUrl: release.traxsourceUrl?.trim() || undefined,
        bandcampUrl: release.bandcampUrl?.trim() || undefined,
        otherUrl: release.otherUrl?.trim() || undefined,
        releaseType: release.releaseType || undefined,
        versionType: release.versionType === "other"
          ? release.customVersionType.trim() || undefined
          : release.versionType || undefined,
        remixer: release.remixer.trim() || undefined,
      })),
      upcomingGigs: upcomingGigs.map((gig) => ({
        id: gig.id,
        date: gig.date,
        eventName: gig.eventName?.trim() || undefined,
        venue: gig.venue.trim(),
        city: gig.city.trim(),
        country: gig.country.trim(),
        clubVenue: gig.clubVenue?.trim() || undefined,
        eventStatus: gig.eventStatus ?? undefined,
        ticketUrl: gig.ticketUrl?.trim() || undefined,
        flyerUrl: gig.flyerUrl?.trim() || undefined,
        instagramUrl: gig.instagramUrl?.trim() || undefined,
        feeAmount: gig.feeAmount ?? null,
        feeCurrency: gig.feeCurrency?.trim() || null,
        paymentStatus: gig.paymentStatus ?? null,
        visibilityStatus: gig.visibilityStatus,
      })),
      djSets: djSets.map((set, index): DjSet => {
        const generatedTitle = computeDjSetTitle(
          set.performanceType,
          set.performanceArtists,
          set.customPerformanceType || undefined,
          set.event || undefined,
          set.venue || undefined,
          artist.artistName,
        )
        return {
          id: set.id,
          title: set.titleOverride.trim() || generatedTitle,
          performanceType: set.performanceType,
          performanceArtists: set.performanceArtists,
          customPerformanceType: set.customPerformanceType.trim() || undefined,
          titleOverride: set.titleOverride.trim() || undefined,
          venue: set.venue.trim() || undefined,
          event: set.event.trim() || undefined,
          setDate: set.setDate || undefined,
          city: set.city.trim() || undefined,
          imageUrl: set.imageUrl.trim() || undefined,
          platformUrl: set.platformUrl.trim(),
          sortOrder: index + 1,
          isPublished: set.isPublished,
        }
      }),
      videos: videos.map((video, index): Video => {
        const filledArtists = video.videoArtists.filter(Boolean)
        const generated = computeVideoTitle(filledArtists, video.videoEvent || undefined, video.venue || undefined, artist.artistName)
        return {
          id: video.id,
          title: generated || video.title.trim() || video.platformUrl.trim(),
          videoArtists: filledArtists,
          videoEvent: video.videoEvent.trim() || undefined,
          videoCity: video.videoCity.trim() || undefined,
          videoCountry: video.videoCountry.trim() || undefined,
          venue: video.venue.trim() || undefined,
          videoDate: video.videoDate || undefined,
          thumbnailUrl: video.thumbnailUrl.trim() || undefined,
          customThumbnailUrl: video.customThumbnailUrl ?? null,
          platformUrl: video.platformUrl.trim(),
          sortOrder: index + 1,
          isPublished: video.isPublished,
        }
      }),
      bookingInfo: {
        email: bookingEmail.trim(),
        bookingUrl: bookingUrl.trim() || undefined,
      },
      pressKit: {
        enabled: pressKitEnabled,
        downloadUrl: pressKitUrl.trim(),
        assetsIncluded: pressKitAssets,
        rootUrl: pressKitRootUrl.trim() || undefined,
        bioFolderUrl: pressKitBioFolderUrl.trim() || undefined,
        logosFolderUrl: pressKitLogosFolderUrl.trim() || undefined,
        mediaFolderUrl: pressKitMediaFolderUrl.trim() || undefined,
        riderFolderUrl: pressKitRiderFolderUrl.trim() || undefined,
        pdfEnUrl: pressKitPdfEnUrl.trim() || undefined,
        pdfEsUrl: pressKitPdfEsUrl.trim() || undefined,
        pdfEnSize: pressKitPdfEnSize.trim() || undefined,
        pdfEsSize: pressKitPdfEsSize.trim() || undefined,
        useGalleryPhotos: pressKitUseGalleryPhotos,
      },
      footerLogoUrl: (urlOverrides?.footerLogoUrl ?? footerLogoUrl) || null,
      footerLogoMode: footerLogoMode,
      footerLogoWidth,
      footerBookingEmail: footerBookingEmail || null,
      footerContactEmail: footerContactEmail || null,
      footerDemosEmail: footerDemosEmail || null,
      footerNewsletterEnabled,
      footerSocialsEnabled,
      footerCopyright: footerCopyright || null,
      updatedAt: new Date().toISOString(),
    }

    setArtist(savedArtist)
    setArtistName(savedArtist.artistName)
    setHandle(savedArtist.handle)
    setGenres(savedArtist.genres.join(", "))
    setLocation(savedArtist.location)
    setShortBio(savedArtist.shortBio)
    setHeroImageUrl(savedArtist.heroImageUrl)
    setHeroTagline(savedArtist.heroTagline ?? "")
    setShowHeaderBranding(savedArtist.showHeaderBranding)
    setBrowserTitle(savedArtist.browserTitle ?? "")
    setFaviconUrl(savedArtist.faviconUrl ?? "")
    setHeroLogoUrl(savedArtist.heroLogoUrl ?? "")
    setHeroIdentityMode(savedArtist.heroIdentityMode ?? "text")
    setHeroTextStyle(savedArtist.heroTextStyle ?? "default")
    setHeroLogoScale(savedArtist.heroLogoScale ?? 100)
    setHeroLogoLayout(savedArtist.heroLogoLayout ?? "replace_text")
    setHeroLogoAlignment(savedArtist.heroLogoAlignment ?? "left")
    setHeroLogoOffsetX(savedArtist.heroLogoOffsetX ?? 0)
    setHeroLogoOffsetY(savedArtist.heroLogoOffsetY ?? 0)
    setHeroLogoStyle(savedArtist.heroLogoStyle ?? "solid")
    setHeroLogoReadability(savedArtist.heroLogoReadability ?? "subtle")
    setHeroContentSurface(savedArtist.heroContentSurface ?? "soft")
    setHeroLogoPlacement(savedArtist.heroLogoPlacement ?? "editorial")
    setHeroContentWidth(savedArtist.heroContentWidth ?? "standard")
    setAccentTheme(savedArtist.accentTheme ?? "matrix")
    setLinkUrls(getLinkUrlsFromArtist(savedArtist))
    setReleases(getReleaseFormState(savedArtist))
    setUpcomingGigs(getGigFormState(savedArtist))
    setDjSets(getDjSetFormState(savedArtist))
    setVideos(getVideoFormState(savedArtist))
    setBookingEmail(savedArtist.bookingInfo.email)
    setBookingUrl(savedArtist.bookingInfo.bookingUrl ?? "")
    setPressKitEnabled(savedArtist.pressKit.enabled)
    setPressKitUrl(savedArtist.pressKit.downloadUrl)
    setPressKitPublicUrl(savedArtist.pressKit.publicUrl ?? "")
    setPressKitAssets(savedArtist.pressKit.assetsIncluded)
    setPressKitRootUrl(savedArtist.pressKit.rootUrl ?? "")
    setPressKitBioFolderUrl(savedArtist.pressKit.bioFolderUrl ?? "")
    setPressKitLogosFolderUrl(savedArtist.pressKit.logosFolderUrl ?? "")
    setPressKitMediaFolderUrl(savedArtist.pressKit.mediaFolderUrl ?? "")
    setPressKitRiderFolderUrl(savedArtist.pressKit.riderFolderUrl ?? "")
    setPressKitPdfEnUrl(savedArtist.pressKit.pdfEnUrl ?? "")
    setPressKitPdfEsUrl(savedArtist.pressKit.pdfEsUrl ?? "")
    setPressKitPdfEnSize(savedArtist.pressKit.pdfEnSize ?? "")
    setPressKitPdfEsSize(savedArtist.pressKit.pdfEsSize ?? "")
    setPressKitUseGalleryPhotos(savedArtist.pressKit.useGalleryPhotos ?? true)
    setSaveMessage(successMessage)
  }

  async function handleSaveChanges() {
    setIsSaving(true)
    setSavedRecently(false)
    setSaveMessage("")

    try {
      await persistArtistChanges(artist.isPublished, "Changes saved.")
      setSavedRecently(true)
      setTimeout(() => setSavedRecently(false), 2500)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save changes."
      setSaveMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTogglePublish() {
    setIsPublishing(true)
    setSaveMessage("")
    const nextPublished = !artist.isPublished

    try {
      await persistArtistChanges(nextPublished, nextPublished ? "Profile published." : "Profile unpublished.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update publish state."
      setSaveMessage(message)
    } finally {
      setIsPublishing(false)
    }
  }

  async function handleImportReleaseMetadata(index: number) {
    const release = releases[index]

    if (!release?.platformUrl.trim()) {
      setSaveMessage("Paste a supported release URL first.")
      return
    }

    setImportingSelectedReleaseIndex(index)
    setSaveMessage("")

    try {
      const response = await fetch("/api/import/release-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: release.platformUrl,
        }),
      })

      const result = (await response.json()) as ImportedReleaseMetadata & { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to import release metadata. Please verify the release URL and try again.")
      }

      setReleases((current) =>
        current.map((item, itemIndex) => {
          if (itemIndex !== index) return item
          const merged = mergeImportedReleaseFields(item, result)

          const platformPatch: Partial<ReleaseFormState> = {}
          if (result.provider === "spotify" && !merged.spotifyUrl) {
            platformPatch.spotifyUrl = result.platformUrl
          } else if (result.provider === "beatport" && !merged.beatportUrl) {
            platformPatch.beatportUrl = result.platformUrl
          } else if (result.provider === "soundcloud" && !merged.soundcloudUrl) {
            platformPatch.soundcloudUrl = result.platformUrl
          }

          if (!merged.versionType && result.title) {
            const { versionType: detectedType, remixer: detectedRemixer } = detectRemixFromTitle(result.title)
            if (detectedType) {
              return {
                ...merged,
                ...platformPatch,
                versionType: detectedType,
                customVersionType: "",
                remixer: merged.remixer || detectedRemixer || "",
              }
            }
            const inferred = inferVersionType(result.title)
            if (inferred) return { ...merged, ...platformPatch, versionType: inferred, customVersionType: "" }
          }

          return { ...merged, ...platformPatch }
        }),
      )
      setSaveMessage("Release metadata imported. Review and save changes.")
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to import release metadata. Please verify the release URL and try again."
      setSaveMessage(message)
    } finally {
      setImportingSelectedReleaseIndex(null)
    }
  }

  function handleAddRelease() {
    const newRelease = createEmptyRelease()
    setReleases((current) => [...current, newRelease])
    setExpandedReleaseId(newRelease.id)
    setReleasePlatformLinksOpen(false)
  }

  function handleAddGig() {
    setShowAddModal(true)
  }

  function handleAddGigFromModal(gig: import("@/components/dashboard/gig-card").GigEntry) {
    const formState: GigFormState = {
      id: gig.id,
      eventName: gig.eventName,
      venue: gig.venue,
      clubVenue: gig.clubVenue,
      date: gig.date,
      city: gig.city,
      country: gig.country,
      eventStatus: gig.eventStatus,
      ticketUrl: gig.ticketUrl,
      flyerUrl: gig.flyerUrl,
      instagramUrl: gig.instagramUrl,
      feeAmount: gig.feeAmount ?? null,
      feeCurrency: gig.feeCurrency ?? null,
      paymentStatus: gig.paymentStatus ?? null,
      visibilityStatus: gig.visibilityStatus ?? "announced",
    }
    setUpcomingGigs((current) => sortGigsByDate([...current, formState]))
  }

  function handleEditGigFromModal(gig: import("@/components/dashboard/gig-card").GigEntry) {
    const formState: GigFormState = {
      id: gig.id,
      eventName: gig.eventName,
      venue: gig.venue,
      clubVenue: gig.clubVenue,
      date: gig.date,
      city: gig.city,
      country: gig.country,
      eventStatus: gig.eventStatus,
      ticketUrl: gig.ticketUrl,
      flyerUrl: gig.flyerUrl,
      instagramUrl: gig.instagramUrl,
      feeAmount: gig.feeAmount ?? null,
      feeCurrency: gig.feeCurrency ?? null,
      paymentStatus: gig.paymentStatus ?? null,
      visibilityStatus: gig.visibilityStatus ?? "announced",
    }
    setUpcomingGigs((current) =>
      sortGigsByDate(current.map((g) => g.id === formState.id ? formState : g)),
    )
  }

  function handleRemoveRelease(index: number) {
    setReleases((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }



  function handleSetFeatured(index: number) {
    setReleases((current) =>
      current.map((r, i) => ({ ...r, isFeatured: i === index })),
    )
  }

  async function handleImportDjSetMetadata(index: number) {
    const set = djSets[index]

    if (!set?.platformUrl.trim()) {
      setSaveMessage("Paste a SoundCloud URL first.")
      return
    }

    setImportingDjSetIndex(index)
    setSaveMessage("")

    try {
      const response = await fetch("/api/import/dj-set-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: set.platformUrl,
        }),
      })

      const result = (await response.json()) as ImportedReleaseMetadata & { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to import DJ set metadata. Please verify the URL and try again.")
      }

      setDjSets((current) =>
        current.map((item, i) => (i === index ? mergeDjSetMetadata(item, result) : item)),
      )
      setSaveMessage("DJ set metadata imported. Review and save changes.")
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to import DJ set metadata. Please verify the URL and try again."
      setSaveMessage(message)
    } finally {
      setImportingDjSetIndex(null)
    }
  }

  function handleAddDjSet() {
    setDjSets((current) => [...current, createEmptyDjSet(artist.artistName)])
  }

  function handleRemoveDjSet(index: number) {
    setDjSets((current) => current.filter((_, i) => i !== index))
  }



  async function handleImportVideoMetadata(index: number) {
    const video = videos[index]

    if (!video?.platformUrl.trim()) {
      setSaveMessage("Paste a YouTube URL first.")
      return
    }

    setImportingVideoIndex(index)
    setSaveMessage("")

    try {
      const response = await fetch("/api/import/video-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.platformUrl }),
      })

      const result = (await response.json()) as ImportedVideoMetadata & { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to import video metadata. Please verify the URL and try again.")
      }

      setVideos((current) =>
        current.map((item, i) => (i === index ? mergeVideoMetadata(item, result) : item)),
      )
      setSaveMessage("Video metadata imported. Review and save changes.")
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to import video metadata. Please verify the URL and try again."
      setSaveMessage(message)
    } finally {
      setImportingVideoIndex(null)
    }
  }

  async function handleUploadVideoThumbnail(index: number, file: File) {
    const video = videos[index]
    if (!video) return

    setUploadingVideoThumbnailIndex(index)
    setSaveMessage("")

    try {
      const compressedBlob = await compressGalleryImage(file)

      const params = new URLSearchParams({ artistId: artist.id, videoId: video.id })
      const signedUrlResponse = await fetch(`/api/artists/video-thumbnail?${params.toString()}`)
      const signedUrlResult = await parseJsonResponse<{ error?: string; signedUrl?: string; token?: string; filePath?: string }>(signedUrlResponse)

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }

      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, compressedBlob, { contentType: "image/webp" })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabaseClient.storage.from("artist-gallery").getPublicUrl(signedUrlResult.filePath)

      setVideos((current) =>
        current.map((item, i) => (i === index ? { ...item, customThumbnailUrl: publicUrl } : item)),
      )
      setSaveMessage("Custom thumbnail uploaded. Save to apply.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload thumbnail."
      setSaveMessage(message)
    } finally {
      setUploadingVideoThumbnailIndex(null)
    }
  }

  async function handleUploadDjSetCover(index: number, file: File) {
    const set = djSets[index]
    if (!set) return

    setUploadingDjSetCoverIndex(index)
    setSaveMessage("")

    try {
      const compressedBlob = await compressGalleryImage(file)

      const params = new URLSearchParams({ artistId: artist.id, setId: set.id })
      const signedUrlResponse = await fetch(`/api/artists/set-cover?${params.toString()}`)
      const signedUrlResult = await parseJsonResponse<{ error?: string; signedUrl?: string; token?: string; filePath?: string }>(signedUrlResponse)

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }

      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, compressedBlob, { contentType: "image/webp" })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabaseClient.storage.from("artist-gallery").getPublicUrl(signedUrlResult.filePath)

      setDjSets((current) =>
        current.map((item, i) => (i === index ? { ...item, imageUrl: publicUrl } : item)),
      )
      setSaveMessage("Cover uploaded. Save to apply.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload cover."
      setSaveMessage(message)
    } finally {
      setUploadingDjSetCoverIndex(null)
    }
  }

  function handleAddVideo() {
    setVideos((current) => [...current, createEmptyVideo(artist.artistName)])
  }

  function handleRemoveVideo(index: number) {
    setVideos((current) => current.filter((_, i) => i !== index))
  }

  function handleSetFeaturedVideo(currentIndex: number) {
    if (currentIndex === 0) return
    setVideos((cur) => {
      const next = [...cur]
      const [item] = next.splice(currentIndex, 1)
      next.unshift(item)
      return next
    })
  }

  async function handleUploadHeroImage() {
    if (!heroImageFile) {
      setSaveMessage("Please select an image to upload.")
      return
    }

    setHeroUploadStatus("compressing")
    setSaveMessage("")

    try {
      // Step 1: compress client-side — large DSLR images are resized and re-encoded before upload.
      const compressedBlob = await compressHeroImage(heroImageFile)

      // Step 2: get a signed upload URL (lightweight JSON — no file bytes through Vercel).
      setHeroUploadStatus("uploading")
      const signedUrlParams = new URLSearchParams({ artistId: artist.id })
      const signedUrlResponse = await fetch(`/api/artists/hero-image?${signedUrlParams.toString()}`)
      const signedUrlResult = await parseJsonResponse<{
        error?: string
        signedUrl?: string
        token?: string
        filePath?: string
      }>(signedUrlResponse)

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Could not upload hero image.")
      }

      // Step 3: upload compressed blob directly to Supabase Storage — bypasses Vercel function limits.
      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-heroes")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, compressedBlob, {
          contentType: compressedBlob.type || "image/webp",
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      // Step 4: register the uploaded path in the database (lightweight JSON).
      const registerResponse = await fetch("/api/artists/hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, filePath: signedUrlResult.filePath }),
      })
      const registerResult = await parseJsonResponse<{ error?: string; heroImageUrl?: string }>(
        registerResponse,
      )

      if (!registerResponse.ok || !registerResult.heroImageUrl) {
        throw new Error(registerResult.error ?? "Could not upload hero image.")
      }

      setHeroImageUrl(registerResult.heroImageUrl)
      setArtist((current) => ({
        ...current,
        heroImageUrl: registerResult.heroImageUrl ?? current.heroImageUrl,
        updatedAt: new Date().toISOString(),
      }))
      setHeroImageFile(null)
      setSaveMessage("Hero image uploaded.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed. Please try again."
      setSaveMessage(message)
    } finally {
      setHeroUploadStatus("idle")
    }
  }

  async function handleUploadGalleryImage() {
    if (!galleryImageFile) {
      setSaveMessage("Please select a gallery image to upload.")
      return
    }

    setIsUploadingGalleryImage(true)
    setSaveMessage("")

    try {
      // Step 1: compress client-side — no large payload ever leaves the browser via API route.
      const compressedBlob = await compressGalleryImage(galleryImageFile)

      // Step 2: get a signed upload URL from the server (lightweight JSON, no file).
      const signedUrlParams = new URLSearchParams({
        artistId: artist.id,
        fileName: galleryImageFile.name,
      })
      const signedUrlResponse = await fetch(`/api/artists/gallery-image?${signedUrlParams.toString()}`)
      const signedUrlResult = (await signedUrlResponse.json()) as {
        error?: string
        signedUrl?: string
        token?: string
        filePath?: string
      }

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }

      // Step 3: upload compressed blob directly to Supabase Storage — bypasses Vercel function limits.
      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, compressedBlob, {
          contentType: "image/webp",
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Step 4: register the uploaded file in the database (tiny JSON payload).
      const response = await fetch("/api/artists/gallery-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          filePath: signedUrlResult.filePath,
          altText: galleryImageAltText,
        }),
      })

      const result = (await response.json()) as { error?: string; galleryImage?: GalleryImage }

      if (!response.ok || !result.galleryImage) {
        throw new Error(result.error ?? "Unable to register gallery image.")
      }

      setGalleryImages((current) => [...current, result.galleryImage as GalleryImage])
      setArtist((current) => ({
        ...current,
        galleryImages: [...current.galleryImages, result.galleryImage as GalleryImage],
        updatedAt: new Date().toISOString(),
      }))
      setGalleryImageFile(null)
      setGalleryImageAltText("")
      setGalleryImageSmallWarning("")
      setSaveMessage("✓ Photo uploaded.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload gallery image."
      setSaveMessage(message)
    } finally {
      setIsUploadingGalleryImage(false)
    }
  }

  async function handleUploadFavicon() {
    if (!faviconFile) {
      setSaveMessage("Please select a favicon file to upload.")
      return
    }

    setIsUploadingFavicon(true)
    setSaveMessage("")

    try {
      const extMap: Record<string, string> = { "image/png": "png", "image/svg+xml": "svg", "image/webp": "webp" }
      const fileExt = extMap[faviconFile.type] ?? "png"

      const params = new URLSearchParams({ artistId: artist.id, type: "favicon", fileExt })
      const signedUrlResponse = await fetch(`/api/artists/branding?${params.toString()}`)
      const signedUrlResult = (await signedUrlResponse.json()) as {
        error?: string
        signedUrl?: string
        token?: string
        filePath?: string
      }

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }

      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, faviconFile, {
          contentType: faviconFile.type,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage
        .from("artist-gallery")
        .getPublicUrl(signedUrlResult.filePath)

      setFaviconUrl(urlData.publicUrl)
      setFaviconFile(null)
      setSaveMessage("Favicon uploaded. Save your profile to apply.")
    } catch (error) {
      const raw = error instanceof Error ? error.message : ""
      const message = /already exists|duplicate/i.test(raw) ? "Upload failed. Please try again." : raw || "Unable to upload favicon."
      setSaveMessage(message)
    } finally {
      setIsUploadingFavicon(false)
    }
  }

  async function handleUploadHeroLogo() {
    if (!heroLogoFile) {
      setSaveMessage("Please select a logo file to upload.")
      return
    }

    setIsUploadingHeroLogo(true)
    setSaveMessage("")

    try {
      const extMap: Record<string, string> = { "image/png": "png", "image/svg+xml": "svg", "image/webp": "webp" }
      const fileExt = extMap[heroLogoFile.type] ?? "png"

      const params = new URLSearchParams({ artistId: artist.id, type: "logo", fileExt })
      const signedUrlResponse = await fetch(`/api/artists/hero-branding?${params.toString()}`)
      const signedUrlResult = await parseJsonResponse<{ error?: string; signedUrl?: string; token?: string; filePath?: string }>(signedUrlResponse)

      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }

      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, heroLogoFile, {
          contentType: heroLogoFile.type,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage.from("artist-gallery").getPublicUrl(signedUrlResult.filePath)

      setHeroLogoUrl(urlData.publicUrl)
      setHeroLogoFile(null)
      setSaveMessage("Hero logo uploaded. Save to apply.")
    } catch (error) {
      const raw = error instanceof Error ? error.message : ""
      const message = /already exists|duplicate/i.test(raw) ? "Upload failed. Please try again." : raw || "Unable to upload hero logo."
      setSaveMessage(message)
    } finally {
      setIsUploadingHeroLogo(false)
    }
  }

  async function handleUploadFooterLogo() {
    if (!footerLogoFile) {
      setSaveMessage("Select a file to upload.")
      return
    }
    setIsUploadingFooterLogo(true)
    setSaveMessage("")
    try {
      const extMap: Record<string, string> = { "image/png": "png", "image/svg+xml": "svg", "image/webp": "webp" }
      const fileExt = extMap[footerLogoFile.type] ?? "png"
      const params = new URLSearchParams({ artistId: artist.id, fileExt })
      const signedUrlResponse = await fetch(`/api/artists/footer-branding?${params.toString()}`)
      const signedUrlResult = await parseJsonResponse<{ error?: string; signedUrl?: string; token?: string; filePath?: string }>(signedUrlResponse)
      if (!signedUrlResponse.ok || !signedUrlResult.signedUrl || !signedUrlResult.token || !signedUrlResult.filePath) {
        throw new Error(signedUrlResult.error ?? "Unable to get upload URL.")
      }
      const { supabase: supabaseClient } = await import("@/lib/supabase/client")
      const { error: uploadError } = await supabaseClient.storage
        .from("artist-gallery")
        .uploadToSignedUrl(signedUrlResult.filePath, signedUrlResult.token, footerLogoFile, { contentType: footerLogoFile.type })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabaseClient.storage.from("artist-gallery").getPublicUrl(signedUrlResult.filePath)
      setFooterLogoUrl(urlData.publicUrl)
      setFooterLogoFile(null)
      setSaveMessage("Footer logo uploaded. Save to apply.")
    } catch (error) {
      const raw = error instanceof Error ? error.message : ""
      setSaveMessage(raw || "Unable to upload footer logo.")
    } finally {
      setIsUploadingFooterLogo(false)
    }
  }

  async function handleDeleteGalleryImage(galleryImageId: string) {
    setDeletingGalleryImageId(galleryImageId)
    setSaveMessage("")

    try {
      const response = await fetch("/api/artists/gallery-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistId: artist.id,
          galleryImageId,
        }),
      })

      const result = (await response.json()) as { error?: string; success?: boolean }

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to delete gallery image.")
      }

      setGalleryImages((current) => current.filter((image) => image.id !== galleryImageId))
      setArtist((current) => ({
        ...current,
        galleryImages: current.galleryImages.filter((image) => image.id !== galleryImageId),
        updatedAt: new Date().toISOString(),
      }))
      setSaveMessage("Gallery image deleted.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete gallery image."
      setSaveMessage(message)
    } finally {
      setDeletingGalleryImageId(null)
    }
  }


  async function handleGalleryDrop(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || isReorderingGallery) return
    const reordered = [...galleryImages]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setGalleryDragIndex(null)
    setGalleryDragOverIndex(null)
    setIsReorderingGallery(true)
    setSaveMessage("")
    try {
      const response = await fetch("/api/artists/gallery-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, orderedImageIds: reordered.map((i) => i.id) }),
      })
      const result = (await response.json()) as { error?: string; galleryImages?: GalleryImage[] }
      if (!response.ok || !result.galleryImages) throw new Error(result.error ?? "Failed to reorder")
      setGalleryImages(result.galleryImages)
      setArtist((cur) => ({ ...cur, galleryImages: result.galleryImages ?? cur.galleryImages, updatedAt: new Date().toISOString() }))
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Unable to reorder gallery.")
    } finally {
      setIsReorderingGallery(false)
    }
  }

  async function handleSignOut() {
    const { supabase } = await import("@/lib/supabase/client")
    await supabase.auth.signOut()
    window.location.href = "/sign-in"
  }

  function renderHome() {
    const today = new Date().toISOString().slice(0, 10)
    const hasActiveDomain = customDomains.some((d) => d.status === "active")
    const activeDomain = customDomains.find((d) => d.status === "active")

    const futureShows = upcomingGigs
      .filter((g) => g.date >= today && g.visibilityStatus !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date))
    const nextShow = futureShows[0] ?? null

    const activeTour = toursLoaded
      ? (tours.find((t) => t.isPublished && t.startDate <= today && t.endDate >= today) ?? null)
      : null
    const nearestUpcomingTour =
      toursLoaded && !activeTour
        ? (tours
            .filter((t) => t.isPublished && t.startDate > today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null)
        : null
    const displayTour = activeTour ?? nearestUpcomingTour

    // Shows within the active/next tour date window
    const tourShows = displayTour
      ? futureShows
          .filter((g) => g.date >= displayTour.startDate && g.date <= displayTour.endDate)
          .slice(0, 6)
      : []

    // Days until next show
    let daysUntilShow: number | null = null
    if (nextShow?.date) {
      const diff = new Date(nextShow.date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()
      daysUntilShow = Math.ceil(diff / 86400000)
    }

    // Booking pipeline counts from homeLeads
    const bookingCounts = {
      new:       homeLeads.filter((l) => l.status === "new").length,
      contacted: homeLeads.filter((l) => l.status === "contacted").length,
      qualified: homeLeads.filter((l) => l.status === "qualified").length,
      confirmed: homeLeads.filter((l) => l.status === "confirmed").length,
    }
    const recentLeads = homeLeads.slice(0, 4)

    function fmtShort(dateStr: string): string {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
    }
    function fmtDateRange(s: string, e: string): string {
      const sd = new Date(s + "T00:00:00")
      const ed = new Date(e + "T00:00:00")
      return `${sd.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${ed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sd.getFullYear() !== ed.getFullYear() ? "numeric" : undefined })}`
    }
    function leadStatusColor(status: string): string {
      const m: Record<string, string> = {
        new: "oklch(0.75 0.18 160)",
        contacted: "#60a5fa",
        qualified: "#fbbf24",
        confirmed: "#34d399",
        declined: "rgba(255,255,255,0.22)",
      }
      return m[status] ?? "rgba(255,255,255,0.22)"
    }

    const publishChecks = [
      { label: "Profile published",   ok: artist.isPublished,            sub: artist.isPublished ? "Public profile is live" : "Profile is in draft" },
      { label: "Booking configured",  ok: !!artist.bookingInfo.email,    sub: artist.bookingInfo.email || "No booking email configured" },
      { label: "Press kit ready",     ok: artist.pressKit.enabled,       sub: artist.pressKit.enabled ? "Downloadable on site" : "Press kit not enabled" },
      { label: "Domain connected",    ok: hasActiveDomain,               sub: (hasActiveDomain && activeDomain) ? activeDomain.domain : "Using DJHQ default domain" },
    ]

    const quickActions = [
      { label: "Add Show",     Icon: Calendar,    sec: "shows"    },
      { label: "Create Tour",  Icon: Route,       sec: "tours"    },
      { label: "Add Set",      Icon: Headphones,  sec: "sets"     },
      { label: "Edit Profile", Icon: User,        sec: "profile"  },
      { label: "Add Video",    Icon: Play,        sec: "media"    },
      { label: "Add Release",  Icon: Disc3,       sec: "releases" },
    ]

    const panelCls = "overflow-hidden rounded-xl"
    const panelSty: React.CSSProperties = { backgroundColor: "#101010", border: "1px solid rgba(255,255,255,0.07)" }
    const dimLabelSty: React.CSSProperties = { color: "rgba(255,255,255,0.28)" }

    // Hero image source — prefer show flyer, fall back to artist hero
    const showBgSrc = nextShow?.flyerUrl || artist.heroImageUrl || null

    // Tour routing stops for visualization (max 7)
    const routeStops = tourShows.slice(0, 7)

    // Content total
    const contentTotal = releases.length + upcomingGigs.length + djSets.length + videos.length + galleryImages.length

    // Artist Pulse counts
    const liveReleases = releases.length
    const activeTourCount = activeTour ? 1 : nearestUpcomingTour ? 1 : 0
    const openBookings = homeLeads.filter((l) => l.status !== "declined").length

    // 2D route map: pre-compute positions for Tour Control SVG
    const mapVbW = 480
    const mapVbH = 150
    const mapYPositions: number[] = [78, 42, 112, 55, 100, 38, 88]
    const routePts = routeStops.map((stop, i) => ({
      x: routeStops.length > 1 ? 40 + (i / (routeStops.length - 1)) * (mapVbW - 80) : mapVbW / 2,
      y: mapYPositions[i % mapYPositions.length] ?? 80,
      city: (stop.city.split(/[\s,]/)[0] ?? stop.city).slice(0, 3).toUpperCase(),
      date: fmtShort(stop.date),
      isNext: stop.date >= today && (i === 0 || (routeStops[i - 1]?.date ?? "") < today),
      isPast: stop.date < today,
      id: stop.id,
    }))

    // Countdown to next show (days/hours/mins from end of show day)
    let showCountdown = { days: 0, hours: 0, mins: 0 }
    if (nextShow?.date && daysUntilShow !== null && daysUntilShow >= 0) {
      const endOfDayMs = new Date(nextShow.date + "T23:59:59").getTime()
      const nowMs = new Date().getTime()
      const diffMs = Math.max(0, endOfDayMs - nowMs)
      const totalMins = Math.floor(diffMs / 60000)
      showCountdown = {
        days: Math.floor(totalMins / 1440),
        hours: Math.floor((totalMins % 1440) / 60),
        mins: totalMins % 60,
      }
    }

    return (
      <div className="flex flex-col gap-3">

        {/* ═══ ARTIST COMMAND HEADER ════════════════════════════════════ */}
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ backgroundColor: "#080808", border: "1px solid rgba(255,255,255,0.08)", minHeight: 192 }}
        >
          {/* Hero image — full bleed, fades left for text readability */}
          {artist.heroImageUrl && (
            <>
              <Image
                src={artist.heroImageUrl}
                alt=""
                fill
                className="object-cover object-center"
                style={{ opacity: 0.20 }}
                sizes="100vw"
                priority
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(100deg, rgba(8,8,8,1) 30%, rgba(8,8,8,0.60) 65%, rgba(8,8,8,0.12) 100%)" }}
              />
            </>
          )}

          <div className="relative z-10">
            {/* Identity (left) + stats (right) */}
            <div className="flex items-start justify-between gap-6 px-6 pt-5 pb-4">
              <div className="min-w-0 flex-1">
                <p
                  className="mb-2 text-[7px] font-black uppercase tracking-[0.34em]"
                  style={{ color: "oklch(0.75 0.18 160)" }}
                >
                  Artist Command Center
                </p>
                <h1 className="text-[38px] font-black uppercase leading-[0.88] tracking-[-0.02em] text-white sm:text-[48px]">
                  {artist.artistName}
                </h1>
                <p className="mt-1.5 font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.32)" }}>
                  /{artist.handle}
                </p>
              </div>

              {/* 4 stat blocks */}
              <div className="hidden shrink-0 items-start gap-7 lg:flex">
                {([
                  {
                    Icon: Calendar,
                    value: futureShows.length,
                    label: "Upcoming\nShows",
                    sub: futureShows.length > 0 && futureShows[0] ? fmtShort(futureShows[0].date) : "None",
                    active: futureShows.length > 0,
                    sec: "shows" as const,
                  },
                  {
                    Icon: Route,
                    value: activeTourCount,
                    label: "Active\nTour",
                    sub: displayTour ? displayTour.name.slice(0, 14) : "No tour",
                    active: activeTourCount > 0,
                    sec: "tours" as const,
                  },
                  {
                    Icon: Inbox,
                    value: openBookings,
                    label: "Booking\nRequests",
                    sub: bookingCounts.new > 0 ? `${bookingCounts.new} new` : "None open",
                    active: openBookings > 0,
                    sec: "bookings" as const,
                  },
                  {
                    Icon: Disc3,
                    value: liveReleases,
                    label: "Live\nReleases",
                    sub: liveReleases > 0 ? "Published" : "None yet",
                    active: liveReleases > 0,
                    sec: "releases" as const,
                  },
                ] as const).map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={() => setActiveSection(stat.sec)}
                    className="flex flex-col items-center text-center transition-opacity hover:opacity-80"
                  >
                    <stat.Icon
                      className="mb-1.5 h-3.5 w-3.5"
                      style={{ color: stat.active ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.18)" }}
                    />
                    <span
                      className="text-[32px] font-black tabular-nums leading-none"
                      style={{ color: stat.active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.16)" }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className="mt-1 whitespace-pre text-center text-[6.5px] font-black uppercase leading-[1.4] tracking-[0.18em]"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      {stat.label}
                    </span>
                    <span
                      className="mt-0.5 text-[9px]"
                      style={{ color: stat.active ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.14)" }}
                    >
                      {stat.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status + action strip */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold"
                  style={{ color: artist.isPublished ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.28)" }}
                >
                  <span
                    className={artist.isPublished ? "animate-pulse" : ""}
                    style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", backgroundColor: artist.isPublished ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.16)" }}
                  />
                  {artist.isPublished ? "Published" : "Draft"}
                </span>
                {hasActiveDomain && activeDomain && (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-medium"
                      style={{ color: "oklch(0.75 0.18 160)", opacity: 0.70 }}
                    >
                      <span className="animate-pulse" style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", backgroundColor: "oklch(0.75 0.18 160)" }} />
                      Site Live
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                      {activeDomain.domain}
                    </span>
                  </>
                )}
                {!hasActiveDomain && (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      /{artist.handle}
                    </span>
                  </>
                )}
                {displayTour && (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold"
                      style={{ backgroundColor: "rgba(100,215,140,0.10)", color: "oklch(0.75 0.18 160)", border: "1px solid rgba(100,215,140,0.20)" }}
                    >
                      <span className="animate-pulse" style={{ display: "inline-block", width: 3, height: 3, borderRadius: "50%", backgroundColor: "oklch(0.75 0.18 160)" }} />
                      {activeTour ? "Active Tour" : "Upcoming Tour"}: {displayTour.name}
                    </span>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={publicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10.5px] font-semibold transition hover:opacity-80"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Site
                </a>
                {isSaveDirty && (
                  <button
                    type="button"
                    onClick={() => void handleSaveChanges()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10.5px] font-bold transition hover:opacity-90"
                    style={{ backgroundColor: "oklch(0.75 0.18 160)", color: "#050505" }}
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN ROW: Next Show | Tour Control | Booking Desk ═══════ */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[4fr_7fr_4fr]">

          {/* ── NEXT SHOW ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setActiveSection("shows")}
            className="group relative flex flex-col overflow-hidden rounded-xl text-left"
            style={{ backgroundColor: "#080808", border: "1px solid rgba(255,255,255,0.07)", minHeight: 340 }}
          >
            {showBgSrc ? (
              <>
                <Image
                  src={showBgSrc}
                  alt=""
                  fill
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ opacity: 0.55 }}
                  sizes="(max-width: 1024px) 100vw, 28vw"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(8,8,8,0.30) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.97) 88%)" }}
                />
              </>
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: "#0d0d0d" }}>
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: "radial-gradient(circle at 60% 40%, rgba(100,215,140,0.04) 0%, transparent 70%)" }}
                />
              </div>
            )}

            <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
              <div className="flex items-start justify-between">
                <span className="text-[7px] font-black uppercase tracking-[0.30em]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Next Show
                </span>
                {nextShow && daysUntilShow !== null && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-[0.08em]"
                    style={
                      daysUntilShow === 0
                        ? { backgroundColor: "oklch(0.75 0.18 160)", color: "#050505" }
                        : daysUntilShow <= 7
                        ? { backgroundColor: "rgba(100,215,140,0.16)", color: "oklch(0.75 0.18 160)", border: "1px solid rgba(100,215,140,0.28)" }
                        : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.09)" }
                    }
                  >
                    {daysUntilShow === 0 ? "Tonight" : `${daysUntilShow}d`}
                  </span>
                )}
              </div>

              {nextShow ? (
                <div className="flex flex-col justify-end">
                  <h2 className="mb-3 text-[26px] font-black leading-tight text-white">
                    {nextShow.eventName ?? nextShow.venue}
                  </h2>
                  <div className="mb-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
                      <span className="font-mono text-[10.5px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                        {fmtShort(nextShow.date)}
                      </span>
                    </div>
                    {nextShow.venue && nextShow.eventName && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
                        <span className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.60)" }}>{nextShow.venue}</span>
                      </div>
                    )}
                    {nextShow.city && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
                        <span className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                          {nextShow.city}{nextShow.country ? `, ${nextShow.country}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Countdown timer */}
                  {daysUntilShow !== null && daysUntilShow >= 0 && (
                    <div className="mb-4 flex gap-4">
                      {([
                        { value: showCountdown.days,  label: "DAYS" },
                        { value: showCountdown.hours, label: "HRS"  },
                        { value: showCountdown.mins,  label: "MINS" },
                      ] as const).map(({ value, label }) => (
                        <div key={label} className="flex flex-col">
                          <span className="text-[30px] font-black tabular-nums leading-none text-white">
                            {String(value).padStart(2, "0")}
                          </span>
                          <span className="mt-0.5 text-[6.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.32)" }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-lg px-4 py-2 text-[11px] font-bold transition group-hover:brightness-110"
                      style={{ backgroundColor: "oklch(0.75 0.18 160)", color: "#050505" }}
                    >
                      View Show →
                    </span>
                    {futureShows.length > 1 && (
                      <span className="text-[9.5px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                        +{futureShows.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <p className="text-[16px] font-semibold" style={{ color: "rgba(255,255,255,0.18)" }}>
                    No shows scheduled
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.10)" }}>
                    Add your first show to get started
                  </p>
                  <span className="mt-4 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.22)" }}>
                    + Add Show
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* ── TOUR CONTROL ──────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setActiveSection("tours")}
            className="group relative flex flex-col overflow-hidden rounded-xl text-left"
            style={{ backgroundColor: "#090a09", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Header bar */}
            <div
              className="flex shrink-0 items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black uppercase tracking-[0.30em]" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {activeTour ? "Tour Control" : nearestUpcomingTour ? "Next Tour" : "Tour Planner"}
                </span>
                {activeTour && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.14em]"
                    style={{ backgroundColor: "rgba(100,215,140,0.12)", color: "oklch(0.75 0.18 160)", border: "1px solid rgba(100,215,140,0.22)" }}
                  >
                    <span className="animate-pulse" style={{ display: "inline-block", width: 3, height: 3, borderRadius: "50%", backgroundColor: "oklch(0.75 0.18 160)" }} />
                    Live
                  </span>
                )}
              </div>
              {displayTour && (
                <span className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {fmtDateRange(displayTour.startDate, displayTour.endDate)} · {tourShows.length} shows
                </span>
              )}
            </div>

            {/* Map + stop list */}
            <div className="flex flex-1">
              {/* 2D SVG map */}
              <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: "#070908", minHeight: 295 }}>
                {/* Dot-grid texture */}
                <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <defs>
                    <pattern id="tc-map-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.7" fill="rgba(100,215,140,0.06)" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#tc-map-dots)" />
                </svg>

                {/* Route visualization */}
                {routePts.length > 0 ? (
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox={`0 0 ${mapVbW} ${mapVbH}`}
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                  >
                    {routePts.slice(0, -1).map((pt, i) => {
                      const next = routePts[i + 1]!
                      const cpx = (pt.x + next.x) / 2
                      const cpy = Math.min(pt.y, next.y) - 30
                      return (
                        <path
                          key={`rp-${pt.id}`}
                          d={`M ${pt.x} ${pt.y} Q ${cpx} ${cpy} ${next.x} ${next.y}`}
                          stroke={pt.isPast && next.isPast ? "rgba(255,255,255,0.06)" : "rgba(100,215,140,0.28)"}
                          strokeWidth="1.5"
                          strokeDasharray="8 5"
                          fill="none"
                        />
                      )
                    })}
                    {routePts.map((pt) => (
                      <g key={`rn-${pt.id}`}>
                        {pt.isNext && (
                          <circle cx={pt.x} cy={pt.y} r="16" fill="rgba(100,215,140,0.08)" />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill={pt.isNext ? "oklch(0.75 0.18 160)" : pt.isPast ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.50)"}
                          style={pt.isNext ? { filter: "drop-shadow(0 0 9px rgba(100,215,140,0.75))" } : {}}
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 12}
                          textAnchor="middle"
                          fontSize="7.5"
                          fontFamily="ui-monospace,monospace"
                          fontWeight="700"
                          letterSpacing="0.05em"
                          fill={pt.isNext ? "oklch(0.75 0.18 160)" : pt.isPast ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.58)"}
                        >
                          {pt.city}
                        </text>
                      </g>
                    ))}
                  </svg>
                ) : (
                  /* Phantom map — no tour data */
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox={`0 0 ${mapVbW} ${mapVbH}`}
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                  >
                    {([
                      [55, 78], [145, 44], [240, 108], [335, 54], [428, 98],
                    ] as [number, number][]).map(([px, py], i, arr) => {
                      const next = arr[i + 1]
                      return (
                        <g key={i}>
                          <circle cx={px} cy={py} r="4" fill="rgba(255,255,255,0.05)" />
                          {next && (
                            <path
                              d={`M ${px} ${py} Q ${(px + next[0]) / 2} ${Math.min(py, next[1]) - 22} ${next[0]} ${next[1]}`}
                              stroke="rgba(255,255,255,0.04)"
                              strokeWidth="1"
                              strokeDasharray="5 4"
                              fill="none"
                            />
                          )}
                          <rect x={px - 10} y={py - 19} width="20" height="6" rx="1.5" fill="rgba(255,255,255,0.04)" />
                        </g>
                      )
                    })}
                  </svg>
                )}

                {/* Zoom controls (decorative) */}
                <div className="absolute bottom-3 left-3 flex flex-col gap-1" style={{ opacity: 0.28 }}>
                  {["+", "−"].map((s) => (
                    <div key={s} className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                      {s}
                    </div>
                  ))}
                </div>

                {!toursLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>Loading…</span>
                  </div>
                )}
                {toursLoaded && !displayTour && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6">
                    <Route className="h-7 w-7" style={{ color: "rgba(255,255,255,0.10)" }} />
                    <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                      No active tour<br />Create one to plot your route
                    </p>
                  </div>
                )}
              </div>

              {/* Stop list — right column */}
              {displayTour && tourShows.length > 0 && (
                <div
                  className="flex w-[200px] shrink-0 flex-col overflow-y-auto"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="truncate text-[12px] font-black leading-tight text-white">{displayTour.name}</p>
                  </div>
                  <div className="flex-1 divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {tourShows.slice(0, 6).map((show, idx) => {
                      const isNextStop = show.date >= today && (idx === 0 || (tourShows[idx - 1]?.date ?? "") < today)
                      const dateParts = fmtShort(show.date).split(" ")
                      return (
                        <div
                          key={show.id}
                          className="flex items-center gap-2 px-3 py-2"
                          style={{
                            backgroundColor: isNextStop ? "rgba(100,215,140,0.05)" : "transparent",
                            borderLeft: `2px solid ${isNextStop ? "oklch(0.75 0.18 160)" : "transparent"}`,
                          }}
                        >
                          <div className="flex w-8 shrink-0 flex-col items-center">
                            <span className="font-mono text-[6.5px] font-bold uppercase" style={{ color: isNextStop ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.26)" }}>
                              {dateParts[0]}
                            </span>
                            <span className="font-mono text-[13px] font-black tabular-nums leading-tight" style={{ color: isNextStop ? "oklch(0.75 0.18 160)" : show.date < today ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.72)" }}>
                              {dateParts[1]}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10.5px] font-semibold" style={{ color: show.date < today ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.82)" }}>
                              {show.city}
                            </p>
                            <p className="truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                              {show.venue}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded px-1 py-0.5 text-[6px] font-black uppercase tracking-[0.06em]"
                            style={
                              show.visibilityStatus === "announced"
                                ? { backgroundColor: "rgba(52,211,153,0.10)", color: "#34d399" }
                                : { color: "rgba(255,255,255,0.18)" }
                            }
                          >
                            {show.visibilityStatus === "announced" ? "Conf" : "TBA"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>View Tour →</span>
                    <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>Planner</span>
                  </div>
                </div>
              )}
            </div>
          </button>

          {/* ── BOOKING DESK ──────────────────────────────────────────── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="text-[7px] font-black uppercase tracking-[0.30em]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Booking Desk
              </span>
              {homeLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection("bookings")}
                  className="text-[8.5px] font-semibold transition hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  Open →
                </button>
              )}
            </div>

            {homeBooking === "loading" ? (
              <div className="flex flex-1 flex-col gap-2 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-7 animate-pulse rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : homeLeads.length === 0 ? (
              /* Polished empty state */
              <div className="flex flex-1 flex-col items-center px-5 py-7 text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "rgba(100,215,140,0.08)",
                    border: "1px solid rgba(100,215,140,0.16)",
                    boxShadow: "0 0 28px rgba(100,215,140,0.07)",
                  }}
                >
                  <Mail className="h-7 w-7" style={{ color: "oklch(0.75 0.18 160)", opacity: 0.78 }} />
                </div>
                <p className="text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  No open inquiries yet
                </p>
                <p className="mt-1.5 max-w-[180px] text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Your booking channel is live. Inquiries from your site will appear here.
                </p>
                <div className="mt-5 flex w-full flex-col gap-2">
                  <a
                    href={publicProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold transition hover:opacity-75"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ExternalLink className="h-3 w-3" /> View Site
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveSection("bookings")}
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold transition hover:opacity-75"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Briefcase className="h-3 w-3" /> Booking Settings
                  </button>
                  {artist.bookingInfo.email && (
                    <button
                      type="button"
                      onClick={() => { void navigator.clipboard.writeText(artist.bookingInfo.email) }}
                      className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold transition hover:opacity-75"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <Copy className="h-3 w-3" /> Copy Booking Email
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Has leads — pipeline bar + recent list */
              <div className="flex flex-1 flex-col p-4">
                <div
                  className="mb-3 flex gap-0 overflow-hidden rounded-lg"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {([
                    { key: "new",       label: "New",  count: bookingCounts.new,       color: "oklch(0.75 0.18 160)" },
                    { key: "contacted", label: "Cntd", count: bookingCounts.contacted, color: "#60a5fa" },
                    { key: "qualified", label: "Qual", count: bookingCounts.qualified, color: "#fbbf24" },
                    { key: "confirmed", label: "Conf", count: bookingCounts.confirmed, color: "#34d399" },
                  ] as const).map((s, i) => (
                    <div
                      key={s.key}
                      className={`relative flex flex-1 flex-col items-center py-2${i > 0 ? " border-l" : ""}`}
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      {s.count > 0 && (
                        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: s.color, opacity: 0.65 }} />
                      )}
                      <span className="text-[14px] font-black tabular-nums leading-none" style={{ color: "rgba(255,255,255,0.88)" }}>
                        {s.count}
                      </span>
                      <span
                        className="mt-0.5 text-[6.5px] font-bold uppercase tracking-[0.10em]"
                        style={{ color: s.count > 0 ? s.color : "rgba(255,255,255,0.16)" }}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-0.5">
                  {recentLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setActiveSection("bookings")}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/[0.02]"
                    >
                      <span
                        style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", flexShrink: 0, backgroundColor: leadStatusColor(lead.status) }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                          {lead.fullName}
                        </span>
                        <span className="text-[8.5px]" style={{ color: "rgba(255,255,255,0.26)" }}>
                          {[lead.city, lead.eventDate].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("bookings")}
                  className="mt-2 text-left text-[8.5px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  {homeLeads.length} total requests →
                </button>
              </div>
            )}
          </div>

        </div>{/* end MAIN ROW */}

        {/* ═══ BOTTOM ROW: Content Studio | Publish Status | Actions ═══ */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[5fr_3fr_2fr]">

          {/* ── CONTENT STUDIO — horizontal editorial shelf ──────────── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-[7px] font-black uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Content Studio
              </span>
              <div className="flex items-center gap-1">
                {([
                  { label: "Releases", count: releases.length,      key: "releases", dot: "oklch(0.75 0.18 160)" },
                  { label: "Shows",    count: upcomingGigs.length,  key: "shows",    dot: "rgba(96,165,250,0.8)" },
                  { label: "Sets",     count: djSets.length,        key: "sets",     dot: "rgba(192,132,252,0.8)" },
                  { label: "Videos",   count: videos.length,        key: "media",    dot: "rgba(251,146,60,0.8)"  },
                  { label: "Photos",   count: galleryImages.length, key: "gallery",  dot: "rgba(248,113,113,0.7)" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setHomeContentTab(tab.key)}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 transition-colors"
                    style={
                      homeContentTab === tab.key
                        ? { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.82)" }
                        : { color: "rgba(255,255,255,0.26)" }
                    }
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tab.dot, opacity: homeContentTab === tab.key ? 1 : 0.40 }} />
                    <span className="text-[8.5px] font-semibold">{tab.label}</span>
                    <span className="tabular-nums text-[7.5px]" style={{ opacity: 0.50 }}>{tab.count}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveSection(homeContentTab)}
                  className="ml-1 text-[8.5px] font-semibold transition hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  Open →
                </button>
              </div>
            </div>

            {/* Horizontal card shelf */}
            <div className="flex-1 overflow-hidden px-3 py-3">
              {homeContentTab === "releases" && (
                releases.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {releases.slice(0, 10).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setActiveSection("releases")}
                        className="group shrink-0 w-[90px] text-left transition-opacity hover:opacity-80"
                      >
                        {r.artworkUrl ? (
                          <div className="relative h-[90px] w-[90px] overflow-hidden rounded-lg">
                            <Image src={r.artworkUrl} alt={r.title} fill className="object-cover" sizes="90px" />
                          </div>
                        ) : (
                          <div className="flex h-[90px] w-[90px] items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                            <Disc3 className="h-7 w-7" style={{ color: "rgba(255,255,255,0.12)" }} />
                          </div>
                        )}
                        <p className="mt-1.5 truncate text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.78)" }}>{r.title}</p>
                        <p className="truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.32)" }}>{r.type} · {r.releaseDate?.slice(0, 4) ?? "—"}</p>
                        {r.isFeatured && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: "oklch(0.75 0.18 160)" }} />
                            <span className="text-[7.5px]" style={{ color: "oklch(0.75 0.18 160)" }}>Featured</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>No releases yet</p>
                  </div>
                )
              )}
              {homeContentTab === "shows" && (
                upcomingGigs.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {upcomingGigs.slice(0, 10).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveSection("shows")}
                        className="group shrink-0 w-[90px] text-left transition-opacity hover:opacity-80"
                      >
                        {g.flyerUrl ? (
                          <div className="relative h-[90px] w-[90px] overflow-hidden rounded-lg">
                            <Image src={g.flyerUrl} alt={g.eventName ?? g.venue} fill className="object-cover" sizes="90px" />
                          </div>
                        ) : (
                          <div className="flex h-[90px] w-[90px] flex-col items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(96,165,250,0.06)" }}>
                            <Calendar className="h-6 w-6" style={{ color: "rgba(96,165,250,0.40)" }} />
                            <span className="mt-1 font-mono text-[7px] font-bold" style={{ color: "rgba(96,165,250,0.55)" }}>{fmtShort(g.date)}</span>
                          </div>
                        )}
                        <p className="mt-1.5 truncate text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.78)" }}>{g.eventName ?? g.venue}</p>
                        <p className="truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.32)" }}>{g.city}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>No shows yet</p>
                  </div>
                )
              )}
              {homeContentTab === "sets" && (
                djSets.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {djSets.slice(0, 10).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSection("sets")}
                        className="group shrink-0 w-[90px] text-left transition-opacity hover:opacity-80"
                      >
                        {s.imageUrl ? (
                          <div className="relative h-[90px] w-[90px] overflow-hidden rounded-lg">
                            <Image src={s.imageUrl} alt={s.titleOverride || s.event || "Set"} fill className="object-cover opacity-80" sizes="90px" />
                          </div>
                        ) : (
                          <div className="flex h-[90px] w-[90px] items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(192,132,252,0.07)" }}>
                            <Headphones className="h-7 w-7" style={{ color: "rgba(192,132,252,0.40)" }} />
                          </div>
                        )}
                        <p className="mt-1.5 truncate text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.78)" }}>
                          {s.titleOverride || s.event || s.venue || "DJ Set"}
                        </p>
                        <p className="truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.32)" }}>
                          {[s.setDate?.slice(0, 4), s.city].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>No sets yet</p>
                  </div>
                )
              )}
              {homeContentTab === "media" && (
                videos.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {videos.slice(0, 10).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setActiveSection("media")}
                        className="group shrink-0 w-[112px] text-left transition-opacity hover:opacity-80"
                      >
                        {(v.customThumbnailUrl || v.thumbnailUrl) ? (
                          <div className="relative h-[63px] w-[112px] overflow-hidden rounded-lg">
                            <Image
                              src={v.customThumbnailUrl ?? v.thumbnailUrl ?? ""}
                              alt={v.videoEvent || "Video"}
                              fill
                              className="object-cover"
                              style={{ opacity: 0.80 }}
                              sizes="112px"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
                                <Play className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-[63px] w-[112px] items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(251,146,60,0.06)" }}>
                            <Play className="h-6 w-6" style={{ color: "rgba(251,146,60,0.35)" }} />
                          </div>
                        )}
                        <p className="mt-1.5 truncate text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.78)" }}>
                          {v.videoEvent || v.venue || v.videoCity || v.title || "Video"}
                        </p>
                        <p className="truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.32)" }}>
                          {[v.videoDate?.slice(0, 4), v.videoCity].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>No videos yet</p>
                  </div>
                )
              )}
              {homeContentTab === "gallery" && (
                galleryImages.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {galleryImages.slice(0, 12).map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveSection("gallery")}
                        className="group relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-lg transition-opacity hover:opacity-80"
                      >
                        <Image
                          src={img.imageUrl}
                          alt={img.altText}
                          fill
                          className="object-cover"
                          style={{ opacity: 0.75 }}
                          sizes="90px"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>No photos yet</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── PUBLISH STATUS — signal board ─────────────────────────── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-[7px] font-black uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Publish Status
              </span>
              {publishChecks.every((c) => c.ok) && (
                <span className="inline-flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.12em]" style={{ color: "oklch(0.75 0.18 160)" }}>
                  <span className="animate-pulse" style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", backgroundColor: "oklch(0.75 0.18 160)" }} />
                  All good
                </span>
              )}
            </div>
            <div className="flex-1 divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {publishChecks.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{
                    borderLeft: `2px solid ${item.ok ? "oklch(0.75 0.18 160)" : "rgba(255,255,255,0.05)"}`,
                    backgroundColor: item.ok ? "rgba(100,215,140,0.02)" : "transparent",
                  }}
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.ok ? "rgba(100,215,140,0.14)" : "rgba(255,255,255,0.05)" }}
                  >
                    {item.ok ? (
                      <Check className="h-2.5 w-2.5" style={{ color: "oklch(0.75 0.18 160)" }} />
                    ) : (
                      <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.14)" }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-semibold leading-tight" style={{ color: item.ok ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.28)" }}>
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[8.5px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── COMMAND ACTIONS — icon grid launcher ───────────────────── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-[7px] font-black uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Quick Actions
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "Add Show",     Icon: Calendar,    sec: "shows"    },
                  { label: "Add Set",      Icon: Headphones,  sec: "sets"     },
                  { label: "Add Video",    Icon: Play,        sec: "media"    },
                  { label: "Add Release",  Icon: Disc3,       sec: "releases" },
                  { label: "Create Tour",  Icon: Route,       sec: "tours"    },
                  { label: "Edit Profile", Icon: User,        sec: "profile"  },
                ] as const).map(({ label, Icon, sec }) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    className="flex flex-col items-center gap-1 rounded-lg py-2.5 transition hover:bg-white/[0.04]"
                    style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "rgba(255,255,255,0.40)" }} />
                    <span className="text-center text-[7.5px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
                  </button>
                ))}
              </div>
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[9.5px] font-semibold transition hover:opacity-75"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <ExternalLink className="h-3 w-3" /> View Site
              </a>
            </div>
          </div>

        </div>{/* end BOTTOM ROW */}

      </div>
    )
  }

  function renderProfile() {
    const isPro = artist.plan === "pro"

    return (
      <div className="space-y-6">
        <HqPageHeader title="Profile" description="Your public artist identity." />

        {/* Artist */}
        <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artist</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="artistName" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artist Name</label>
              <Input id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="handle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Handle</label>
              <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Public Identity */}
        <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Public Identity</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="genres" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Genre Tags</label>
              <Input id="genres" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="House, Tech House, Melodic" />
              <p className="text-[10px] text-muted-foreground/38">Comma-separated. Displayed as chips in the hero and used throughout your profile.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Location</label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shortBio" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Short Bio</label>
              <Textarea id="shortBio" value={shortBio} onChange={(e) => setShortBio(e.target.value)} />
            </div>
          </div>
        </div>

        {/* DJHQ Branding */}
        <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">DJHQ Branding</p>
              <p className="text-xs text-muted-foreground/45">
                {artist.plan === "pro"
                  ? "Show or hide the DJHQ wordmark in your public profile header."
                  : "Upgrade to Pro to hide the DJHQ wordmark from your public profile."}
              </p>
            </div>
            {artist.plan === "pro" ? (
              <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
                {(["show", "hide"] as const).map((opt) => {
                  const isActive = opt === "show" ? showHeaderBranding : !showHeaderBranding
                  return (
                    <button key={opt} type="button" onClick={() => setShowHeaderBranding(opt === "show")}
                      className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                        isActive ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50")}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className="shrink-0 rounded-md border border-border bg-secondary px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">Pro only</span>
            )}
          </div>
        </div>

        {/* Browser Identity */}
        <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Browser Identity</p>
              <p className="mt-0.5 text-xs text-muted-foreground/45">Control how your profile appears in browser tabs, bookmarks, and shared links.</p>
            </div>
            {artist.plan !== "pro" && (
              <span className="shrink-0 rounded-md border border-border bg-secondary px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">Pro only</span>
            )}
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="browserTitle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Browser Title</label>
                <span className={cn("text-[10px] tabular-nums transition-colors duration-150", browserTitle.length > 70 ? "text-amber-400/60" : "text-muted-foreground/30")}>{browserTitle.length}/80</span>
              </div>
              <Input id="browserTitle" value={browserTitle} maxLength={80} placeholder={artist.plan === "pro" ? artist.artistName : `${artist.artistName} — DJHQ`} disabled={artist.plan !== "pro"} onChange={(e) => setBrowserTitle(e.target.value)} className={artist.plan !== "pro" ? "opacity-40 cursor-not-allowed" : ""} />
              <div className="overflow-hidden rounded-lg border border-border bg-[#1a1a1a]">
                <div className="flex h-9 items-end gap-0 px-2 pt-2">
                  <div className="flex h-8 min-w-0 max-w-[240px] shrink items-center gap-2 rounded-t-lg border border-b-0 border-border bg-[#242424] px-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-[#0a0a0a]">
                      {faviconUrl && artist.plan === "pro" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={faviconUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[7px] font-bold leading-none text-white/80">{artist.plan === "pro" ? getArtistInitialsPreview(artistName || artist.artistName) : "DJ"}</span>
                      )}
                    </div>
                    <span className="truncate text-[10px] text-[#c8c8c8]">{artist.plan === "pro" ? (browserTitle.trim() || artistName || artist.artistName) : `${artistName || artist.artistName} — DJHQ`}</span>
                  </div>
                  <div className="ml-1 flex h-7 w-6 items-center justify-center text-[#555]"><span className="text-sm leading-none">+</span></div>
                </div>
                <div className="flex h-7 items-center gap-2 border-t border-border bg-[#141414] px-3">
                  <div className="flex shrink-0 gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                  </div>
                  <div className="flex h-4 flex-1 items-center rounded-sm bg-[#2a2a2a] px-2">
                    <span className="truncate text-[9px] text-[#555]">{artist.handle}.djhq.com</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/38">{artist.plan === "pro" ? "Shown in browser tabs, bookmarks, and shared links. Leave blank to use your artist name." : "Upgrade to Pro to set a custom browser title without the DJHQ suffix."}</p>
            </div>
            {artist.plan === "pro" && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Custom Favicon</p>
                {faviconUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-[#0a0a0a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faviconUrl} alt="Current favicon" className="h-8 w-8 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-foreground/55">{faviconUrl.split("/").pop()}</p>
                      <button type="button" onClick={() => setFaviconUrl("")} className="mt-0.5 text-[10px] text-destructive/50 transition-colors hover:text-destructive/80">Remove</button>
                    </div>
                  </div>
                ) : null}
                <Input id="faviconFile" type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => setFaviconFile(e.target.files?.[0] ?? null)} />
                <Button type="button" onClick={handleUploadFavicon} disabled={!faviconFile || isUploadingFavicon || isSaving || isPublishing} className="bg-secondary text-foreground hover:bg-secondary/80">
                  {isUploadingFavicon ? "Uploading..." : "Upload favicon"}
                </Button>
                <p className="text-[10px] text-muted-foreground/38">PNG, SVG, or WEBP. 512×512 recommended. Leave blank to use artist initials.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderLinks() {
    if (linksVersion === "v2") return renderLinksV2()
    const connected   = PLATFORM_CONFIG.filter(({ id }) => linkUrls[id]?.trim())
    const available   = PLATFORM_CONFIG.filter(({ id }) => !linkUrls[id]?.trim())
    const connectedN  = connected.length
    const totalN      = PLATFORM_CONFIG.length

    function PlatformRow({
      id, label, Icon, placeholder, isConnected,
    }: { id: string; label: string; Icon: React.ComponentType<{ className?: string }>; placeholder: string; isConnected: boolean }) {
      const isExpanded = expandedLinkId === id
      const url = linkUrls[id] ?? ""

      return (
        <div key={id} className="border-b border-border last:border-0">
          {/* Collapsed row */}
          <button
            type="button"
            onClick={() => setExpandedLinkId(isExpanded ? null : id)}
            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-secondary"
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${isConnected ? "text-accent/55" : "text-muted-foreground/28"}`} />
            <span className={`flex-1 text-sm font-medium ${isConnected ? "text-foreground/82" : "text-muted-foreground/48"}`}>
              {label}
            </span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent/70">
                <Check className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground/35 transition-colors group-hover:text-accent/60">
                + Connect
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>

          {/* Expanded editor */}
          {isExpanded && (
            <div className="border-t border-border bg-secondary px-4 pb-4 pt-3">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
                URL
              </label>
              <Input
                autoFocus
                value={url}
                onChange={(e) => setLinkUrls((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder={placeholder}
                className="h-9 border-border bg-secondary text-sm placeholder:text-muted-foreground/22 focus:border-accent/30"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setExpandedLinkId(null)}
                  className="h-7 bg-accent/90 px-3 text-[11px] text-accent-foreground hover:bg-accent"
                >
                  Done
                </Button>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => {
                      setLinkUrls((prev) => ({ ...prev, [id]: "" }))
                      setExpandedLinkId(null)
                    }}
                    className="text-[11px] text-muted-foreground/40 transition-colors hover:text-destructive/70"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <HqPageHeader title="Links" description="Only connected platforms appear on your public profile." />

        {/* Summary card */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground/75">Connected Platforms</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/40">
              {connectedN} of {totalN} platforms active on your profile
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-foreground/85">{connectedN}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/35">/ {totalN}</p>
          </div>
        </div>

        {/* Connected platforms */}
        {connected.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/35">
              Connected
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-card/40">
              {connected.map((p) => (
                <PlatformRow key={p.id} {...p} isConnected={true} />
              ))}
            </div>
          </div>
        )}

        {/* Available platforms */}
        {available.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/35">
              Available
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-card/30">
              {available.map((p) => (
                <PlatformRow key={p.id} {...p} isConnected={false} />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setLinksVersion("v2"); setExpandedLinkId(null) }}
          className="text-[10px] text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
        >
          Try visual layout →
        </button>
      </div>
    )
  }

  function renderLinksV2() {
    const connected = PLATFORM_CONFIG.filter(({ id }) => linkUrls[id]?.trim())
    const available = PLATFORM_CONFIG.filter(({ id }) => !linkUrls[id]?.trim())
    const connectedN = connected.length
    const totalN     = PLATFORM_CONFIG.length

    const expandedPlatform = expandedLinkId
      ? PLATFORM_CONFIG.find((p) => p.id === expandedLinkId)
      : null
    const expandedUrl      = expandedLinkId ? (linkUrls[expandedLinkId] ?? "") : ""
    const expandedActive   = expandedUrl.trim().length > 0

    return (
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Links</h2>
            <p className="mt-0.5 text-sm text-muted-foreground/55">
              {connectedN} of {totalN} platforms connected
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/35">
              Only connected platforms appear on your public profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setLinksVersion("v1"); setExpandedLinkId(null) }}
            className="shrink-0 text-[10px] text-muted-foreground/28 transition-colors hover:text-muted-foreground/55"
          >
            List view
          </button>
        </div>

        {/* Connected chips */}
        {connected.length > 0 && (
          <div>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/35">
              Connected
            </p>
            <div className="flex flex-wrap gap-2">
              {connected.map(({ id, label, Icon }) => {
                const isOpen = expandedLinkId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExpandedLinkId(isOpen ? null : id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isOpen
                        ? "border-accent/40 bg-accent/[0.12] text-foreground"
                        : "border-accent/20 bg-accent/[0.06] text-foreground/78 hover:border-accent/35 hover:bg-accent/[0.10]"
                    }`}
                    style={{ minWidth: "140px" }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent/55" />
                    <span className="flex-1 text-left">{label}</span>
                    <Check className="h-3 w-3 shrink-0 text-accent/65" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Available chips */}
        {available.length > 0 && (
          <div>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/35">
              Available
            </p>
            <div className="flex flex-wrap gap-2">
              {available.map(({ id, label, Icon }) => {
                const isOpen = expandedLinkId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExpandedLinkId(isOpen ? null : id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isOpen
                        ? "border-border bg-secondary text-foreground/70"
                        : "border-dashed border-border bg-secondary text-muted-foreground/42 hover:border-border hover:bg-secondary hover:text-foreground/60"
                    }`}
                    style={{ minWidth: "140px" }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                    <span className="flex-1 text-left">{label}</span>
                    <Plus className="h-3 w-3 shrink-0 text-muted-foreground/35" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Inline editor — appears below chips when any is selected */}
        {expandedPlatform && (
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <expandedPlatform.Icon className="h-4 w-4 text-accent/55" />
              <p className="text-sm font-semibold text-foreground/80">{expandedPlatform.label}</p>
              {expandedActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent/65">
                  <Check className="h-2.5 w-2.5" />
                  Connected
                </span>
              )}
            </div>
            <Input
              autoFocus
              value={expandedUrl}
              onChange={(e) =>
                setLinkUrls((prev) => ({ ...prev, [expandedLinkId!]: e.target.value }))
              }
              placeholder={expandedPlatform.placeholder}
              className="h-9 border-border bg-secondary text-sm placeholder:text-muted-foreground/22 focus:border-accent/30"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => setExpandedLinkId(null)}
                className="h-7 bg-accent/90 px-3 text-[11px] text-accent-foreground hover:bg-accent"
              >
                Done
              </Button>
              {expandedActive && (
                <button
                  type="button"
                  onClick={() => {
                    setLinkUrls((prev) => ({ ...prev, [expandedLinkId!]: "" }))
                    setExpandedLinkId(null)
                  }}
                  className="text-[11px] text-muted-foreground/38 transition-colors hover:text-destructive/65"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    )
  }

  function renderReleases() {
    const busy = isSaving || isPublishing || importingSelectedReleaseIndex !== null
    const featuredCount = releases.filter((r) => r.isFeatured).length
    const expandedIdx = expandedReleaseId
      ? releases.findIndex((r) => r.id === expandedReleaseId)
      : -1
    const expandedRelease = expandedIdx >= 0 ? releases[expandedIdx] : null

    // Display order: newest first by release date; does not affect state array indices
    const sortedForDisplay = [...releases].sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0
      if (!a.releaseDate) return 1
      if (!b.releaseDate) return -1
      return b.releaseDate.localeCompare(a.releaseDate)
    })

    function updateRelease(index: number, patch: Partial<ReleaseFormState>) {
      setReleases((cur) => cur.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    }

    const PLATFORM_LINK_FIELDS = [
      { key: "spotifyUrl",      label: "Spotify" },
      { key: "appleMusicUrl",   label: "Apple Music" },
      { key: "soundcloudUrl",   label: "SoundCloud" },
      { key: "youtubeMusicUrl", label: "YouTube Music" },
      { key: "beatportUrl",     label: "Beatport" },
      { key: "traxsourceUrl",   label: "Traxsource" },
      { key: "bandcampUrl",     label: "Bandcamp" },
      { key: "otherUrl",        label: "Other" },
    ] as const

    return (
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Releases</h2>
            <p className="mt-0.5 text-sm text-muted-foreground/55">
              Manage your singles, EPs, remixes and artist catalog.
            </p>
            {releases.length > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground/32">
                {releases.length} release{releases.length !== 1 ? "s" : ""}
                {featuredCount > 0 ? ` · ${featuredCount} featured` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddRelease}
            disabled={busy}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Release
          </button>
        </div>

        {/* Empty state */}
        {releases.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <Music className="mx-auto mb-3 h-6 w-6 text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground/55">No releases yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.6] text-muted-foreground/32">
              Add your singles, EPs, remixes and collaborations to build your artist catalog.
            </p>
            <button
              type="button"
              onClick={handleAddRelease}
              disabled={busy}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Release
            </button>
          </div>
        )}

        {/* Release catalog grid */}
        {releases.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedForDisplay.map((release) => {
              const index     = releases.findIndex((r) => r.id === release.id)
              const isEditing = release.id === expandedReleaseId
              const isMenuOpen = releaseMenuOpenId === release.id

              // "Sep 2025" formatted date — no timezone shift
              const releaseDisplay = (() => {
                if (!release.releaseDate) return null
                const [y, m] = release.releaseDate.split("-")
                if (!y) return null
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                return m ? `${months[parseInt(m, 10) - 1] ?? m} ${y}` : y
              })()

              // Show collaborators only — hide solo-artist credits
              const hasCollaborators = !!release.credits?.trim() &&
                release.credits.trim().toLowerCase() !== artist.artistName.trim().toLowerCase()

              // Platform distribution indicators (up to 3 shown)
              const activePlatforms: string[] = []
              if (release.spotifyUrl?.trim())      activePlatforms.push("Spotify")
              if (release.beatportUrl?.trim())      activePlatforms.push("Beatport")
              if (release.soundcloudUrl?.trim())    activePlatforms.push("SoundCloud")
              if (release.appleMusicUrl?.trim())    activePlatforms.push("Apple Music")
              if (release.traxsourceUrl?.trim())    activePlatforms.push("Traxsource")
              if (release.bandcampUrl?.trim())      activePlatforms.push("Bandcamp")
              if (release.otherUrl?.trim())         activePlatforms.push("Other")

              const typeLabel = RELEASE_TYPE_OPTIONS.find((o) => o.value === release.releaseType)?.label ?? null

              return (
                <div
                  key={release.id}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-card/35 transition-all duration-150",
                    isEditing
                      ? "border-accent/30 ring-1 ring-accent/15"
                      : release.isFeatured
                        ? "border-accent/18"
                        : "border-border hover:border-border",
                  )}
                >
                  {/* Artwork */}
                  <div className="relative aspect-square w-full overflow-hidden bg-secondary/40">
                    {release.artworkUrl?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={release.artworkUrl}
                        alt={release.title || "Release artwork"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-7 w-7 text-muted-foreground/15" />
                      </div>
                    )}
                    {/* Featured: small filled star only — no text badge */}
                    {release.isFeatured && (
                      <div className="absolute left-1.5 top-1.5">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.7))]" />
                      </div>
                    )}
                    {/* Type badge */}
                    {typeLabel && (
                      <div className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white/65 backdrop-blur-sm">
                        {typeLabel}
                      </div>
                    )}
                  </div>

                  {/* Metadata — tighter, DJ-prioritized */}
                  <div className="px-3 pb-2 pt-2">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground/88">
                      {release.title || <span className="text-muted-foreground/28">Untitled</span>}
                    </p>
                    {hasCollaborators && (
                      <p className="mt-px truncate text-[11px] text-muted-foreground/45">
                        {release.credits}
                      </p>
                    )}
                    <div className="mt-1 space-y-0.5">
                      {/* Date · Label */}
                      {(releaseDisplay || release.label) && (
                        <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground/38">
                          {releaseDisplay && <span className="shrink-0">{releaseDisplay}</span>}
                          {releaseDisplay && release.label && <span className="text-muted-foreground/20">·</span>}
                          {release.label && <span className="truncate">{release.label}</span>}
                        </p>
                      )}
                      {/* Platform indicators */}
                      {activePlatforms.length > 0 && (
                        <p className="truncate text-[9px] text-muted-foreground/25">
                          {activePlatforms.slice(0, 3).join(" · ")}
                          {activePlatforms.length > 3 && (
                            <span className="text-muted-foreground/18"> +{activePlatforms.length - 3}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center border-t border-border px-2 py-1">
                    {/* Feature star */}
                    <button
                      type="button"
                      onClick={() => handleSetFeatured(index)}
                      disabled={busy}
                      title={release.isFeatured ? "Featured" : "Set as featured"}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                        release.isFeatured ? "text-accent" : "text-muted-foreground/30 hover:text-accent",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", release.isFeatured && "fill-current")} />
                    </button>
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setExpandedReleaseId(null)
                        } else {
                          setExpandedReleaseId(release.id)
                          setReleasePlatformLinksOpen(false)
                        }
                        setReleaseMenuOpenId(null)
                      }}
                      className={cn(
                        "ml-0.5 flex h-7 items-center rounded-md px-2 text-[11px] font-medium transition-colors duration-150",
                        isEditing ? "bg-accent/10 text-accent" : "text-muted-foreground/42 hover:text-foreground",
                      )}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                    {/* Listen — only when a platform URL is set */}
                    {release.platformUrl?.trim() && (
                      <a
                        href={release.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-0.5 flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-muted-foreground/42 transition-colors duration-150 hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Listen
                      </a>
                    )}
                    {/* ⋯ overflow menu */}
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() => setReleaseMenuOpenId(isMenuOpen ? null : release.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/28 transition-colors duration-150 hover:text-foreground/60"
                        title="More options"
                      >
                        <span className="text-[15px] leading-none tracking-[-0.15em]">···</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline destructive actions — shown when ⋯ is open */}
                  {isMenuOpen && (
                    <div className="flex items-center justify-between border-t border-border bg-destructive/[0.03] px-3 py-2">
                      <span className="text-[11px] text-muted-foreground/45">Delete this release?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReleaseMenuOpenId(null)}
                          className="rounded px-2 py-0.5 text-[11px] text-muted-foreground/40 hover:text-foreground/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            handleRemoveRelease(index)
                            setReleaseMenuOpenId(null)
                            if (isEditing) setExpandedReleaseId(null)
                          }}
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-destructive/65 hover:text-destructive disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Inline edit panel */}
        {expandedRelease && expandedIdx >= 0 && (
          <div className="rounded-xl border border-accent/25 bg-card/40 p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {expandedRelease.artworkUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={expandedRelease.artworkUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/[0.08]"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                    <Music className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground/85">
                    {expandedRelease.title || "Untitled Release"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/40">Editing release</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedReleaseId(null)}
                className="text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/60"
              >
                Close ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Title</label>
                <Input value={expandedRelease.title} onChange={(e) => updateRelease(expandedIdx, { title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Label</label>
                <Input value={expandedRelease.label} onChange={(e) => updateRelease(expandedIdx, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Artists</label>
                <Input value={expandedRelease.credits} placeholder="e.g. Artist 1, Artist 2" onChange={(e) => updateRelease(expandedIdx, { credits: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Release Date</label>
                <DatePicker
                  value={expandedRelease.releaseDate}
                  onChange={(v) => updateRelease(expandedIdx, { releaseDate: v })}
                  allowClear
                  triggerClassName="h-9 w-full rounded-lg border border-border bg-secondary px-3"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Release Type</label>
                <select
                  value={expandedRelease.releaseType}
                  onChange={(e) => updateRelease(expandedIdx, { releaseType: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— None —</option>
                  {RELEASE_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Version / Mix Type</label>
                <select
                  value={expandedRelease.versionType}
                  onChange={(e) => updateRelease(expandedIdx, { versionType: e.target.value, customVersionType: "" })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— None —</option>
                  {VERSION_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {expandedRelease.versionType === "other" && (
                  <Input placeholder="Custom version / mix type" value={expandedRelease.customVersionType} onChange={(e) => updateRelease(expandedIdx, { customVersionType: e.target.value })} />
                )}
              </div>
              {expandedRelease.versionType === "remix" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Remixer</label>
                  <Input placeholder="Artist name" value={expandedRelease.remixer} onChange={(e) => updateRelease(expandedIdx, { remixer: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Artwork URL</label>
                <Input value={expandedRelease.artworkUrl} placeholder="https://..." onChange={(e) => updateRelease(expandedIdx, { artworkUrl: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Primary URL</label>
                <div className="flex gap-2">
                  <Input
                    value={expandedRelease.platformUrl}
                    placeholder="https://..."
                    onChange={(e) => updateRelease(expandedIdx, { platformUrl: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImportReleaseMetadata(expandedIdx)}
                    disabled={importingSelectedReleaseIndex === expandedIdx || busy}
                    className="shrink-0 border-border bg-background/70 text-xs"
                  >
                    {importingSelectedReleaseIndex === expandedIdx ? "Fetching…" : "Import metadata"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/30">Fallback link when no platform-specific URLs are set.</p>
              </div>
              <div className="border-t border-border pt-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setReleasePlatformLinksOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">Platform Links</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/30">
                    {releasePlatformLinksOpen ? "Hide" : "Show"}
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", releasePlatformLinksOpen && "rotate-180")} />
                  </span>
                </button>
                {!releasePlatformLinksOpen && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/28">Only configured platforms appear in the Listen panel.</p>
                )}
                {releasePlatformLinksOpen && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PLATFORM_LINK_FIELDS.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] font-medium uppercase tracking-[0.10em] text-muted-foreground/40">{label}</label>
                        <Input
                          value={expandedRelease[key]}
                          placeholder="https://..."
                          onChange={(e) => updateRelease(expandedIdx, { [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }
  function handleDeleteGig(id: string) {
    // Optimistically remove from UI; fire-and-forget the soft-delete API call.
    setUpcomingGigs((current) => current.filter((g) => g.id !== id))
    fetch(`/api/gigs/${id}`, { method: "PATCH" }).catch((err) => {
      console.error("[handleDeleteGig] API error:", err)
    })
  }


  function renderGigs() {
    const today       = new Date().toISOString().slice(0, 10)
    const currentYear = new Date().getFullYear().toString()
    const upcoming    = upcomingGigs.filter((g) => g.date && g.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    const past        = upcomingGigs.filter((g) => !g.date || g.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))

    // ── Career stats ──────────────────────────────────────────────────────────
    const totalShows     = upcomingGigs.length
    const thisYearShows  = upcomingGigs.filter((g) => g.date?.startsWith(currentYear)).length
    const uniqueCities   = new Set(upcomingGigs.map((g) => g.city).filter(Boolean)).size
    const uniqueCountries= new Set(upcomingGigs.map((g) => g.country).filter(Boolean)).size

    // ── Past shows grouped by year ────────────────────────────────────────────
    const pastByYear = new Map<string, typeof past>()
    for (const g of past) {
      const y = g.date ? g.date.slice(0, 4) : "—"
      if (!pastByYear.has(y)) pastByYear.set(y, [])
      pastByYear.get(y)!.push(g)
    }
    const pastYears = [...pastByYear.keys()].sort((a, b) => b.localeCompare(a))

    // ── Helpers ───────────────────────────────────────────────────────────────
    function formatDateShort(date: string): { day: string; mon: string; year: string } | null {
      if (!date) return null
      const d = new Date(`${date}T00:00:00Z`)
      if (isNaN(d.getTime())) return null
      return {
        day : String(d.getUTCDate()).padStart(2, "0"),
        mon : d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
        year: String(d.getUTCFullYear()),
      }
    }


    // Payment status badge colours (restrained capsule tones)
    const PAY_CLASS: Record<string, string> = {
      pending:   "bg-amber-500/[0.10] text-amber-400/65",
      partial:   "bg-sky-500/[0.10] text-sky-400/65",
      paid:      "bg-emerald-500/[0.10] text-emerald-400/70",
      cancelled: "bg-red-500/[0.10] text-red-400/55",
    }

    function handleGigChange(updated: GigFormState) {
      setUpcomingGigs((current) =>
        sortGigsByDate(current.map((g) => (g.id === updated.id ? updated : g))),
      )
    }

    return (
      <>
      <ShowModal
        open={showAddModal || !!editingGig}
        onOpenChange={(isOpen) => {
          if (!isOpen) { setShowAddModal(false); setEditingGig(null) }
        }}
        initialGig={editingGig ?? undefined}
        onSave={editingGig ? handleEditGigFromModal : handleAddGigFromModal}
        existingEventNames={[...new Set(upcomingGigs.map((g) => g.eventName).filter((n): n is string => !!n))]}
      />

      {/* ── Delete confirmation dialog ───────────────────────────────── */}
      {deletingGig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.18)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingGig(null) }}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-300/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-5">
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-gray-900">
                Delete Show?
              </p>
              <p className="mt-2 text-[13px] leading-[1.55] text-gray-500">
                This removes the show from your public profile and HQ list, but keeps the record in your account history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeletingGig(null)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-600 transition-colors duration-150 hover:border-gray-300 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteGig(deletingGig.id)
                  setDeletingGig(null)
                }}
                className="h-9 whitespace-nowrap rounded-lg bg-red-500 px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-red-600"
              >
                Delete Show
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">

        {/* Header */}
        <HqPageHeader
          title="Shows"
          description="Manage your artist schedule and career history."
          action={
            <button
              type="button"
              onClick={handleAddGig}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all duration-150 hover:border-border hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Show
            </button>
          }
        />

        {/* ── Career stats ────────────────────────────────────────────────── */}
        {totalShows > 0 && (
          <div className="flex flex-wrap items-center gap-5 border-b border-border pb-5">
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums text-foreground/80">{totalShows}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/35">Shows</p>
            </div>
            {thisYearShows > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-foreground/80">{thisYearShows}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/35">This Year</p>
              </div>
            )}
            {uniqueCities > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-foreground/80">{uniqueCities}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/35">Cities</p>
              </div>
            )}
            {uniqueCountries > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-foreground/80">{uniqueCountries}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/35">Countries</p>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {upcomingGigs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground/55">No shows yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.6] text-muted-foreground/32">
              Start building your artist history by adding your first show.
            </p>
            <button
              type="button"
              onClick={handleAddGig}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-border hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Show
            </button>
          </div>
        )}

        {/* ── UPCOMING SHOWS — boarding-pass cards ────────────────────────── */}
        {upcoming.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
                Upcoming
              </span>
              <span className="h-px flex-1 bg-secondary" />
              <span className="text-[10px] tabular-nums text-muted-foreground/28">{upcoming.length}</span>
            </div>

            <div className="space-y-2">
              {upcoming.map((gig) => {
                const dp           = formatDateShort(gig.date)
                const location     = [gig.city, gig.country].filter(Boolean).join(", ")
                const subline      = [gig.clubVenue, location].filter(Boolean).join(" · ")
                const isOpen       = expandedGigId === gig.id
                const hasEventName = !!gig.eventName?.trim() &&
                  gig.eventName.trim().toLowerCase() !== gig.venue.trim().toLowerCase()

                return (
                  <div key={gig.id} className="relative">
                    {/* Premium horizontal card — clicking the card body opens Edit modal.
                        overflow-hidden clips the date block bg; the actions menu is a sibling
                        outside this element so its dropdown is never clipped. */}
                    <div
                      onClick={() => setEditingGig(gig)}
                      className={cn(
                        "group flex cursor-pointer overflow-hidden rounded-xl border transition-all duration-150 pr-9",
                        isOpen
                          ? "border-accent/28 ring-1 ring-accent/12"
                          : "border-border hover:-translate-y-px hover:border-border hover:[box-shadow:0_4px_16px_rgba(0,0,0,0.30)]",
                      )}
                    >
                      {/* Date block */}
                      {dp ? (
                        <div className="flex w-[68px] shrink-0 flex-col items-center justify-center bg-secondary px-3 py-4 text-center">
                          <span className="text-[1.7rem] font-black leading-none tabular-nums text-foreground/80">
                            {dp.day}
                          </span>
                          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-accent/55">
                            {dp.mon}
                          </span>
                          <span className="mt-0.5 text-[8px] text-muted-foreground/28">{dp.year}</span>
                        </div>
                      ) : (
                        <div className="flex w-[68px] shrink-0 items-center justify-center bg-secondary text-muted-foreground/20">
                          <span className="text-sm font-bold">—</span>
                        </div>
                      )}

                      {/* Thin separator */}
                      <div className="w-px shrink-0 bg-secondary" />

                      {/* Event content */}
                      <div className="min-w-0 flex-1 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-foreground/88">
                          {hasEventName ? gig.eventName : (gig.venue || <span className="text-muted-foreground/30">Untitled</span>)}
                        </p>
                        {hasEventName && (
                          <p className="mt-0.5 truncate text-xs font-medium text-foreground/50">{gig.venue}</p>
                        )}
                        {subline && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground/42">{subline}</p>
                        )}
                        {/* Payment status */}
                        {gig.paymentStatus && (
                          <span className={cn(
                            "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            PAY_CLASS[gig.paymentStatus] ?? "bg-secondary text-muted-foreground/40",
                          )}>
                            {gig.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Three-dot actions menu — sibling of the card, not inside overflow-hidden */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setOpenGigActionsId(openGigActionsId === gig.id ? null : gig.id) }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/35 transition-colors duration-150 hover:bg-secondary hover:text-foreground/60"
                          aria-label="Show actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {openGigActionsId === gig.id && (
                          <GigActionsDropdown
                            onEdit={() => { setEditingGig(gig); setOpenGigActionsId(null) }}
                            onDelete={() => { setDeletingGig(gig); setOpenGigActionsId(null) }}
                            onClose={() => setOpenGigActionsId(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── PAST SHOWS — year-grouped career timeline ────────────────────── */}
        {past.length > 0 && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setPastGigsExpanded((v) => !v)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/32">
                Past Shows
              </span>
              <span className="tabular-nums text-[10px] text-muted-foreground/22">{past.length}</span>
              <span className="h-px flex-1 bg-secondary" />
              <ChevronDown className={cn(
                "h-3 w-3 text-muted-foreground/22 transition-transform duration-200",
                pastGigsExpanded && "rotate-180",
              )} />
            </button>

            <AnimatePresence initial={false}>
              {pastGigsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="space-y-5">
                    {pastYears.map((year) => {
                      const yearGigs = pastByYear.get(year)!
                      return (
                        <div key={year}>
                          {/* Year header — intentional, readable */}
                          <div className="mb-2.5 flex items-center gap-2.5">
                            <span className="h-px w-3 shrink-0 bg-secondary" />
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/42">
                              {year}
                            </span>
                            <span className="text-[10px] text-muted-foreground/22">
                              · {yearGigs.length} show{yearGigs.length !== 1 ? "s" : ""}
                            </span>
                            <span className="h-px flex-1 bg-secondary" />
                          </div>

                          {/* Past show archived cards — same structure as Upcoming, reduced emphasis */}
                          <div className="space-y-1.5">
                            {yearGigs.map((gig) => {
                              const isOpen       = expandedGigId === gig.id
                              const location     = [gig.city, gig.country].filter(Boolean).join(", ")
                              const subline      = [gig.clubVenue, location].filter(Boolean).join(" · ")
                              const dp           = formatDateShort(gig.date)
                              const hasEventName = !!gig.eventName?.trim() &&
                                gig.eventName.trim().toLowerCase() !== gig.venue.trim().toLowerCase()

                              return (
                                <div key={gig.id} className="relative">
                                  {/* Past show card — overflow-hidden clips border-radius only.
                                      Actions menu is a sibling so its dropdown is never clipped. */}
                                  <div
                                    onClick={() => setEditingGig(gig)}
                                    className={cn(
                                      "flex cursor-pointer overflow-hidden rounded-xl border transition-all duration-150 pr-9",
                                      isOpen
                                        ? "border-border"
                                        : "border-border hover:-translate-y-px hover:border-border hover:[box-shadow:0_2px_12px_rgba(0,0,0,0.22)]",
                                    )}
                                  >
                                    {/* Date block — muted, no tint */}
                                    {dp ? (
                                      <div className="flex w-[60px] shrink-0 flex-col items-center justify-center px-2 py-3 text-center">
                                        <span className="text-[1.25rem] font-black leading-none tabular-nums text-foreground/38">
                                          {dp.day}
                                        </span>
                                        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/25">
                                          {dp.mon}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex w-[60px] shrink-0 items-center justify-center text-muted-foreground/18">
                                        <span className="text-sm font-bold">—</span>
                                      </div>
                                    )}

                                    {/* Thin separator */}
                                    <div className="w-px shrink-0 bg-secondary" />

                                    {/* Event content */}
                                    <div className="min-w-0 flex-1 px-3 py-2.5">
                                      <p className="truncate text-xs font-medium text-foreground/52">
                                        {hasEventName ? gig.eventName : (gig.venue || <span className="text-muted-foreground/20">—</span>)}
                                      </p>
                                      {hasEventName && (
                                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/38">{gig.venue}</p>
                                      )}
                                      {subline && (
                                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/26">{subline}</p>
                                      )}
                                      {/* Status — very muted for past shows */}
                                      {gig.paymentStatus && (
                                        <span className="mt-1 inline-flex rounded-full bg-secondary px-1.5 py-px text-[8px] font-medium uppercase tracking-wider text-muted-foreground/30">
                                          {gig.paymentStatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Three-dot actions menu — sibling of card, outside overflow-hidden */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setOpenGigActionsId(openGigActionsId === gig.id ? null : gig.id) }}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/20 transition-colors duration-150 hover:bg-secondary hover:text-foreground/45"
                                        aria-label="Show actions"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </button>
                                      {openGigActionsId === gig.id && (
                                        <GigActionsDropdown
                                          onEdit={() => { setEditingGig(gig); setOpenGigActionsId(null) }}
                                          onDelete={() => { setDeletingGig(gig); setOpenGigActionsId(null) }}
                                          onClose={() => setOpenGigActionsId(null)}
                                          align="right"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
      </>
    )
  }
  function renderDjSets() {
    const busy = isSaving || isPublishing || importingDjSetIndex !== null || uploadingDjSetCoverIndex !== null

    function formatDjSetDate(value: string): string {
      if (!value) return ""
      const d = new Date(value + "T00:00:00")
      if (isNaN(d.getTime())) return ""
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    function toggleAdvanced(id: string) {
      setAdvancedOpenIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function updateSet(index: number, patch: Partial<DjSetFormState>) {
      setDjSets((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    }

    function handleTypeChange(index: number, type: PerformanceType) {
      setDjSets((current) =>
        current.map((item, i) => {
          if (i !== index) return item
          let artists = [...item.performanceArtists]
          if (type === "b2b" && artists.length < 2) artists = [...artists, ...Array(2 - artists.length).fill("")]
          if (type === "b3b" && artists.length < 3) artists = [...artists, ...Array(3 - artists.length).fill("")]
          return { ...item, performanceType: type, performanceArtists: artists }
        }),
      )
    }

    function handleSetFeaturedDjSet(currentIndex: number) {
      if (currentIndex === 0) return
      setDjSets((cur) => {
        const next = [...cur]
        const [item] = next.splice(currentIndex, 1)
        next.unshift(item)
        return next
      })
    }

    const performanceTypes: PerformanceType[] = ["dj_set", "live_set", "vinyl_set", "b2b", "b3b", "other"]
    const featuredCount = djSets.length > 0 ? 1 : 0

    // Display: featured set (index 0) first, then rest sorted by setDate DESC
    const sortedSetsForDisplay = (() => {
      if (djSets.length === 0) return []
      const [featured, ...rest] = djSets
      const sorted = [...rest].sort((a, b) => {
        if (!a.setDate && !b.setDate) return 0
        if (!a.setDate) return 1
        if (!b.setDate) return -1
        return b.setDate.localeCompare(a.setDate)
      })
      return [featured, ...sorted]
    })()

    const expandedSet = expandedSetId
      ? djSets.find((s) => s.id === expandedSetId) ?? null
      : null
    const expandedSetIdx = expandedSet ? djSets.findIndex((s) => s.id === expandedSetId) : -1

    return (
      <div className="space-y-6">

        <HqPageHeader
          title="Sets"
          description={`DJ sets, live recordings and performances.${djSets.length > 0 ? `  ${djSets.length} set${djSets.length !== 1 ? "s" : ""}${featuredCount > 0 ? " · 1 featured" : ""}.` : ""}`}
          action={
            <button
              type="button"
              onClick={handleAddDjSet}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Set
            </button>
          }
        />

        {/* Empty state */}
        {djSets.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <Headphones className="mx-auto mb-3 h-6 w-6 text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground/55">No sets yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.6] text-muted-foreground/32">
              Add your first DJ set, live recording or performance.
            </p>
            <button
              type="button"
              onClick={handleAddDjSet}
              disabled={busy}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Set
            </button>
          </div>
        )}

        {/* Set catalog grid */}
        {djSets.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedSetsForDisplay.map((set) => {
              const index       = djSets.findIndex((s) => s.id === set.id)
              const isFeatured  = index === 0
              const isEditing   = set.id === expandedSetId
              const isMenuOpen  = setMenuOpenId === set.id

              const typeLabel = PERFORMANCE_TYPE_LABELS[set.performanceType]
              const dateDisplay = formatDjSetDate(set.setDate ?? "")
              const artistsLine = set.performanceArtists.filter(Boolean).join(", ")

              // Event name is the primary label; fall back to title override → venue → type
              const primaryLabel = set.event?.trim()
                || set.titleOverride?.trim()
                || set.venue?.trim()
                || typeLabel

              return (
                <div
                  key={set.id}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-card/35 transition-all duration-150",
                    isEditing
                      ? "border-accent/30 ring-1 ring-accent/15"
                      : isFeatured
                        ? "border-accent/18"
                        : "border-border hover:border-border",
                  )}
                >
                  {/* Cover image — landscape ratio for density */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/40">
                    {set.imageUrl?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={set.imageUrl}
                        alt={primaryLabel || "Set cover"}
                        className="h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Headphones className="h-6 w-6 text-muted-foreground/12" />
                      </div>
                    )}
                    {/* Featured pill — more visible than a bare star */}
                    {isFeatured && (
                      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                        <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-accent">Featured</span>
                      </div>
                    )}
                    {/* Type badge */}
                    <div className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white/65 backdrop-blur-sm">
                      {typeLabel}
                    </div>
                  </div>

                  {/* Metadata — event first, venue·city second, date third, artist last */}
                  <div className="px-3 pb-2 pt-2">
                    {/* Primary: event name */}
                    <p className="truncate text-sm font-semibold leading-tight text-foreground/88">
                      {primaryLabel || <span className="text-muted-foreground/28">Untitled</span>}
                    </p>
                    {/* Secondary: venue · city */}
                    {(set.venue || set.city) && (
                      <p className="mt-px flex items-center gap-1 truncate text-[11px] text-muted-foreground/45">
                        {set.venue && <span className="truncate">{set.venue}</span>}
                        {set.venue && set.city && <span className="shrink-0 text-muted-foreground/22">•</span>}
                        {set.city && <span className="shrink-0">{set.city}</span>}
                      </p>
                    )}
                    {/* Meta: date + artists */}
                    <div className="mt-1 flex items-center gap-2">
                      {dateDisplay && (
                        <span className="shrink-0 text-[10px] text-muted-foreground/28">{dateDisplay}</span>
                      )}
                      {artistsLine && dateDisplay && (
                        <span className="text-muted-foreground/18">·</span>
                      )}
                      {artistsLine && (
                        <span className="truncate text-[10px] text-muted-foreground/30">{artistsLine}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — Star, Edit, ⋯ (no View) */}
                  <div className="flex items-center border-t border-border px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleSetFeaturedDjSet(index)}
                      disabled={busy || isFeatured}
                      title={isFeatured ? "Featured" : "Set as featured"}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                        isFeatured ? "text-accent" : "text-muted-foreground/30 hover:text-accent",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", isFeatured && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedSetId(isEditing ? null : set.id)
                        setSetMenuOpenId(null)
                      }}
                      className={cn(
                        "ml-0.5 flex h-7 items-center rounded-md px-2 text-[11px] font-medium transition-colors duration-150",
                        isEditing ? "bg-accent/10 text-accent" : "text-muted-foreground/42 hover:text-foreground",
                      )}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() => setSetMenuOpenId(isMenuOpen ? null : set.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/28 transition-colors duration-150 hover:text-foreground/60"
                        title="More options"
                      >
                        <span className="text-[15px] leading-none tracking-[-0.15em]">···</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {isMenuOpen && (
                    <div className="flex items-center justify-between border-t border-border bg-destructive/[0.03] px-3 py-2">
                      <span className="text-[11px] text-muted-foreground/45">Delete this set?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSetMenuOpenId(null)}
                          className="rounded px-2 py-0.5 text-[11px] text-muted-foreground/40 hover:text-foreground/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            handleRemoveDjSet(index)
                            setSetMenuOpenId(null)
                            if (isEditing) setExpandedSetId(null)
                          }}
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-destructive/65 hover:text-destructive disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Set editor modal */}
        {expandedSet && expandedSetIdx >= 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setExpandedSetId(null)}
            />
            {/* Modal */}
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 flex h-full max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              {/* ── Header ────────────────────────────────────────────── */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {expandedSet.imageUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={expandedSet.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-border" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Headphones className="h-5 w-5 text-muted-foreground/25" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-snug text-foreground/90">
                      {(expandedSet.titleOverride.trim() || computeDjSetTitle(
                        expandedSet.performanceType,
                        expandedSet.performanceArtists,
                        expandedSet.customPerformanceType || undefined,
                        expandedSet.event || undefined,
                        expandedSet.venue || undefined,
                        artist.artistName,
                      )) || "Untitled Set"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/40">Editing set</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedSetId(null)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Scrollable body ────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
                <div className="space-y-8">

                  {/* ── Cover & Source ─────────────────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Cover & Source</p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                      {/* Cover preview */}
                      <div className="relative shrink-0">
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary sm:h-[148px] sm:w-[148px]">
                          {expandedSet.imageUrl?.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={expandedSet.imageUrl}
                              alt="Set cover"
                              className="h-full w-full object-cover object-top"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
                              <Headphones className="h-7 w-7 text-muted-foreground/15" />
                              <p className="text-center text-[10px] leading-tight text-muted-foreground/30">No cover selected</p>
                            </div>
                          )}
                          {uploadingDjSetCoverIndex === expandedSetIdx && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                              <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cover controls */}
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        {artist.plan === "pro" ? (
                          <label className={cn(
                            "flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-secondary/80 hover:text-foreground",
                            (uploadingDjSetCoverIndex !== null || busy) && "pointer-events-none opacity-50",
                          )}>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) void handleUploadDjSetCover(expandedSetIdx, file)
                                e.target.value = ""
                              }}
                              disabled={uploadingDjSetCoverIndex !== null || busy}
                            />
                            {uploadingDjSetCoverIndex === expandedSetIdx ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</>
                            ) : (
                              <><Upload className="h-3.5 w-3.5" />{expandedSet.imageUrl?.trim() ? "Replace Cover" : "Upload Cover"}</>
                            )}
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/35">Upload cover</span>
                            <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-accent/50">PRO</span>
                          </div>
                        )}

                        {expandedSet.imageUrl?.trim() && (
                          <button
                            type="button"
                            onClick={() => updateSet(expandedSetIdx, { imageUrl: "" })}
                            className="flex w-fit items-center gap-1.5 text-[11px] text-muted-foreground/30 transition-colors hover:text-destructive/60"
                          >
                            <X className="h-3 w-3" />
                            Remove cover
                          </button>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Cover Image URL</label>
                          <Input
                            value={expandedSet.imageUrl ?? ""}
                            placeholder="https://…"
                            onChange={(e) => updateSet(expandedSetIdx, { imageUrl: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Platform URL + Import */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Platform URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={expandedSet.platformUrl}
                          placeholder="https://soundcloud.com/…"
                          onChange={(e) => updateSet(expandedSetIdx, { platformUrl: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleImportDjSetMetadata(expandedSetIdx)}
                          disabled={importingDjSetIndex === expandedSetIdx || busy}
                          className="shrink-0 border-border bg-background/70 text-xs"
                        >
                          {importingDjSetIndex === expandedSetIdx ? "Fetching…" : "Import"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/30">Import fetches cover image, title and metadata from the URL.</p>
                    </div>
                  </div>

                  {/* ── Set Details ─────────────────────────────────────── */}
                  <div className="space-y-4 border-t border-border pt-7">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Set Details</p>

                    {/* Type */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Type</p>
                      <div className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
                        {performanceTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTypeChange(expandedSetIdx, type)}
                            disabled={busy}
                            className={cn(
                              "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                              expandedSet.performanceType === type
                                ? "bg-secondary text-foreground/75"
                                : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            )}
                          >
                            {PERFORMANCE_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom type */}
                    {expandedSet.performanceType === "other" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Custom Type</label>
                        <Input
                          value={expandedSet.customPerformanceType}
                          placeholder="Radio show, podcast, guest mix…"
                          onChange={(e) => updateSet(expandedSetIdx, { customPerformanceType: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Artists */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Artists</p>
                      <div className="space-y-2">
                        {expandedSet.performanceArtists.map((name, ai) => (
                          <div key={ai} className="flex gap-2">
                            <Input
                              value={name}
                              placeholder="Artist name"
                              onChange={(e) => {
                                const next = [...expandedSet.performanceArtists]
                                next[ai] = e.target.value
                                updateSet(expandedSetIdx, { performanceArtists: next })
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = expandedSet.performanceArtists.filter((_, j) => j !== ai)
                                updateSet(expandedSetIdx, { performanceArtists: next.length > 0 ? next : [""] })
                              }}
                              disabled={expandedSet.performanceArtists.length <= 1 || busy}
                              className="h-9 w-9 shrink-0 p-0 text-muted-foreground/40 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateSet(expandedSetIdx, { performanceArtists: [...expandedSet.performanceArtists, ""] })}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs text-accent/60 transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                          Add artist
                        </button>
                      </div>
                    </div>

                    {/* Date · Venue · City · Event */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Date</label>
                        <DatePicker
                          value={expandedSet.setDate ?? ""}
                          onChange={(v) => updateSet(expandedSetIdx, { setDate: v })}
                          allowClear
                          triggerClassName="h-9 w-full rounded-lg border border-border bg-secondary px-3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Venue</label>
                        <VenueAutocomplete
                          value={expandedSet.venue}
                          onChange={(v) => updateSet(expandedSetIdx, { venue: v })}
                          onSelect={(entry) => updateSet(expandedSetIdx, { venue: entry.name })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">City</label>
                        <Input
                          value={expandedSet.city}
                          placeholder="Santiago, Berlin…"
                          onChange={(e) => updateSet(expandedSetIdx, { city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Event</label>
                        <Input
                          value={expandedSet.event}
                          placeholder="MISA, Boiler Room…"
                          onChange={(e) => updateSet(expandedSetIdx, { event: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Visibility ──────────────────────────────────────── */}
                  <div className="border-t border-border pt-7">
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Visibility</p>
                    <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
                      <label className="relative inline-flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={expandedSet.isPublished}
                          onChange={(e) => updateSet(expandedSetIdx, { isPublished: e.target.checked })}
                          className="sr-only"
                        />
                        <span className={cn(
                          "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150",
                          expandedSet.isPublished ? "bg-accent/70" : "bg-border",
                        )}>
                          <span className={cn(
                            "h-3 w-3 rounded-full bg-white/90 shadow-sm transition-transform duration-150",
                            expandedSet.isPublished ? "translate-x-3" : "translate-x-0",
                          )} />
                        </span>
                        <div>
                          <p className="text-[12px] font-medium text-foreground/80">Show on public profile</p>
                          <p className="text-[10px] text-muted-foreground/40">Controls whether this set appears on your public artist page.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* ── Advanced ────────────────────────────────────────── */}
                  <div className="border-t border-border pt-5">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced(expandedSet.id)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30 transition-colors hover:text-muted-foreground/55"
                    >
                      <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpenIds.has(expandedSet.id) && "rotate-180")} />
                      Advanced
                    </button>
                    {advancedOpenIds.has(expandedSet.id) && (
                      <div className="mt-4 space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                          Title Override
                        </label>
                        <Input
                          value={expandedSet.titleOverride}
                          placeholder="Leave blank to use generated title"
                          onChange={(e) => updateSet(expandedSetIdx, { titleOverride: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground/28">Replaces the generated title on your public profile.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* ── Footer ────────────────────────────────────────────── */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4">
                <p className="text-[11px] text-muted-foreground/35">
                  {isSaveDirty ? "Unsaved changes — use Save Changes to persist." : "No pending changes."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedSetId(null)}
                    className="rounded-lg border border-border bg-secondary px-4 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-secondary/80 hover:text-foreground"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExpandedSetId(null); void handleSaveChanges() }}
                    disabled={busy || !isSaveDirty}
                    className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40"
                  >
                    {isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }
  function renderVideos() {
    const busy = isSaving || isPublishing || importingVideoIndex !== null || uploadingVideoThumbnailIndex !== null

    function updateVideo(index: number, patch: Partial<VideoFormState>) {
      setVideos((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    }

    // Date formatted as "Jul 15, 2025"
    function formatVideoDate(value: string): string {
      if (!value) return ""
      const d = new Date(value + "T00:00:00")
      if (isNaN(d.getTime())) return ""
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    const featuredCount = videos.length > 0 ? 1 : 0

    // Display order: featured (index 0) first, then rest by date DESC
    const sortedVideosForDisplay = (() => {
      if (videos.length === 0) return []
      const [featured, ...rest] = videos
      const sorted = [...rest].sort((a, b) => {
        if (!a.videoDate && !b.videoDate) return 0
        if (!a.videoDate) return 1
        if (!b.videoDate) return -1
        return b.videoDate.localeCompare(a.videoDate)
      })
      return [featured, ...sorted]
    })()

    const expandedVideo = expandedVideoId
      ? videos.find((v) => v.id === expandedVideoId) ?? null
      : null
    const expandedVideoIdx = expandedVideo ? videos.findIndex((v) => v.id === expandedVideoId) : -1

    return (
      <div className="space-y-6">

        <HqPageHeader
          title="Videos"
          description={`Performance videos, live clips and recorded DJ moments.${videos.length > 0 ? `  ${videos.length} video${videos.length !== 1 ? "s" : ""}${featuredCount > 0 ? " · 1 featured" : ""}.` : ""}`}
          action={
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Video
            </button>
          }
        />

        {/* Empty state */}
        {videos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <Play className="mx-auto mb-3 h-6 w-6 text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground/55">No videos yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.6] text-muted-foreground/32">
              Add YouTube performances, aftermovies and live clips to showcase your artist profile.
            </p>
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={busy}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Video
            </button>
          </div>
        )}

        {/* Video catalog grid */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedVideosForDisplay.map((video) => {
              const index      = videos.findIndex((v) => v.id === video.id)
              const isFeatured = index === 0
              const isEditing  = video.id === expandedVideoId
              const isMenuOpen = videoMenuOpenId === video.id

              const thumbSrc = video.customThumbnailUrl || video.thumbnailUrl || null
              const filledArtists = video.videoArtists.filter(Boolean)
              const artistsLine = filledArtists.join(", ")
              const dateDisplay = formatVideoDate(video.videoDate ?? "")

              // Event name is the primary label
              const primaryLabel = video.videoEvent?.trim()
                || video.title?.trim()
                || video.venue?.trim()
                || "Performance"

              return (
                <div
                  key={video.id}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-card/35 transition-all duration-150",
                    isEditing
                      ? "border-accent/30 ring-1 ring-accent/15"
                      : isFeatured
                        ? "border-accent/18"
                        : "border-border hover:border-border",
                    !video.isPublished && "opacity-60",
                  )}
                >
                  {/* 16:9 thumbnail with play overlay */}
                  <div className="relative aspect-video w-full overflow-hidden bg-secondary/40">
                    {thumbSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbSrc}
                        alt={primaryLabel}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground/15" />
                      </div>
                    )}
                    {/* Hover play overlay — YouTube/Vimeo style */}
                    {video.platformUrl?.trim() && (
                      <a
                        href={video.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Watch ${primaryLabel}`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/28 group-hover:opacity-100"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary backdrop-blur-[2px] transition-transform duration-150 group-hover:scale-105">
                          <Play className="h-4 w-4 translate-x-px fill-white text-foreground" />
                        </div>
                      </a>
                    )}
                    {/* Featured pill */}
                    {isFeatured && (
                      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 ring-1 ring-accent/25 backdrop-blur-sm">
                        <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-accent/90">Featured</span>
                      </div>
                    )}
                    {/* Hidden badge */}
                    {!video.isPublished && (
                      <div className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white/45 backdrop-blur-sm">
                        Hidden
                      </div>
                    )}
                  </div>

                  {/* Metadata — Event → Venue+City → Date → Artists */}
                  <div className="px-3 pb-2 pt-2">
                    {/* 1. Event (primary) */}
                    <p className="truncate text-sm font-medium leading-tight text-foreground/90">
                      {primaryLabel}
                    </p>
                    {/* 2. Venue · City */}
                    {(video.venue || video.videoCity) && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground/42">
                        {video.venue && <span className="truncate">{video.venue}</span>}
                        {video.venue && video.videoCity && <span className="shrink-0 text-muted-foreground/20">·</span>}
                        {video.videoCity && <span className="shrink-0">{video.videoCity}</span>}
                      </p>
                    )}
                    {/* 3. Date */}
                    {dateDisplay && (
                      <p className="mt-0.5 text-xs text-muted-foreground/30">{dateDisplay}</p>
                    )}
                    {/* 4. Artists */}
                    {artistsLine && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/28">{artistsLine}</p>
                    )}
                  </div>

                  {/* Actions — Watch first, Edit second */}
                  <div className="flex items-center border-t border-border px-2 py-1">
                    {/* Feature star */}
                    <button
                      type="button"
                      onClick={() => handleSetFeaturedVideo(index)}
                      disabled={busy || isFeatured}
                      title={isFeatured ? "Featured" : "Set as featured"}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                        isFeatured ? "text-accent" : "text-muted-foreground/30 hover:text-accent",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", isFeatured && "fill-current")} />
                    </button>
                    {/* Watch — primary content action */}
                    {video.platformUrl?.trim() && (
                      <a
                        href={video.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-0.5 flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-foreground/60 transition-colors duration-150 hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Watch
                      </a>
                    )}
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedVideoId(isEditing ? null : video.id)
                        setVideoMenuOpenId(null)
                      }}
                      className={cn(
                        "ml-0.5 flex h-7 items-center rounded-md px-2 text-[11px] font-medium transition-colors duration-150",
                        isEditing ? "bg-accent/10 text-accent" : "text-muted-foreground/38 hover:text-foreground",
                      )}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                    {/* ⋯ overflow */}
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() => setVideoMenuOpenId(isMenuOpen ? null : video.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/28 transition-colors duration-150 hover:text-foreground/60"
                        title="More options"
                      >
                        <span className="text-[15px] leading-none tracking-[-0.15em]">···</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {isMenuOpen && (
                    <div className="flex items-center justify-between border-t border-border bg-destructive/[0.03] px-3 py-2">
                      <span className="text-[11px] text-muted-foreground/45">Delete this video?</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setVideoMenuOpenId(null)} className="rounded px-2 py-0.5 text-[11px] text-muted-foreground/40 hover:text-foreground/60">
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            handleRemoveVideo(index)
                            setVideoMenuOpenId(null)
                            if (isEditing) setExpandedVideoId(null)
                          }}
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-destructive/65 hover:text-destructive disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Video editor modal */}
        {expandedVideo && expandedVideoIdx >= 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setExpandedVideoId(null)}
            />
            {/* Modal */}
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 flex h-full max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              {/* ── Header ────────────────────────────────────────────── */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {(expandedVideo.customThumbnailUrl || expandedVideo.thumbnailUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(expandedVideo.customThumbnailUrl || expandedVideo.thumbnailUrl)!}
                      alt=""
                      className="h-11 w-[78px] shrink-0 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-11 w-[78px] shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Play className="h-5 w-5 text-muted-foreground/25" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-snug text-foreground/90">
                      {expandedVideo.videoEvent?.trim() || expandedVideo.title?.trim() || "Untitled Video"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/40">Editing video</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedVideoId(null)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Scrollable body ────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
                <div className="space-y-8">

                  {/* ── Cover & Source ─────────────────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Cover & Source</p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                      {/* Cover preview — 16:9 to match video format */}
                      <div className="relative shrink-0">
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-secondary sm:h-[148px] sm:w-[263px]">
                          {(expandedVideo.customThumbnailUrl || expandedVideo.thumbnailUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={(expandedVideo.customThumbnailUrl || expandedVideo.thumbnailUrl)!}
                              alt="Video cover"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
                              <Play className="h-7 w-7 text-muted-foreground/15" />
                              <p className="text-center text-[10px] leading-tight text-muted-foreground/30">No cover selected</p>
                            </div>
                          )}
                          {uploadingVideoThumbnailIndex === expandedVideoIdx && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                              <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cover controls */}
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        {artist.plan === "pro" ? (
                          <label className={cn(
                            "flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-secondary/80 hover:text-foreground",
                            (uploadingVideoThumbnailIndex !== null || busy) && "pointer-events-none opacity-50",
                          )}>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) void handleUploadVideoThumbnail(expandedVideoIdx, file)
                                e.target.value = ""
                              }}
                              disabled={uploadingVideoThumbnailIndex !== null || busy}
                            />
                            {uploadingVideoThumbnailIndex === expandedVideoIdx ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</>
                            ) : (
                              <><Upload className="h-3.5 w-3.5" />{expandedVideo.customThumbnailUrl ? "Replace Cover" : "Upload Cover"}</>
                            )}
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/35">Upload cover</span>
                            <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-accent/50">PRO</span>
                          </div>
                        )}

                        {expandedVideo.customThumbnailUrl && artist.plan === "pro" && (
                          <button
                            type="button"
                            onClick={() => setVideos((cur) => cur.map((v, i) => i === expandedVideoIdx ? { ...v, customThumbnailUrl: null } : v))}
                            className="flex w-fit items-center gap-1.5 text-[11px] text-muted-foreground/30 transition-colors hover:text-destructive/60"
                          >
                            <X className="h-3 w-3" />
                            Remove cover
                          </button>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Thumbnail URL</label>
                          <Input
                            value={expandedVideo.thumbnailUrl}
                            placeholder="https://i.ytimg.com/vi/…"
                            onChange={(e) => updateVideo(expandedVideoIdx, { thumbnailUrl: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Video URL + Import */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Video URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={expandedVideo.platformUrl}
                          placeholder="youtube.com/watch?v=…"
                          onChange={(e) => updateVideo(expandedVideoIdx, { platformUrl: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleImportVideoMetadata(expandedVideoIdx)}
                          disabled={importingVideoIndex === expandedVideoIdx || busy}
                          className="shrink-0 border-border bg-background/70 text-xs"
                        >
                          {importingVideoIndex === expandedVideoIdx ? "Fetching…" : "Import"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/30">Paste a YouTube link — thumbnail and metadata are filled automatically.</p>
                    </div>
                  </div>

                  {/* ── Video Details ───────────────────────────────────── */}
                  <div className="space-y-4 border-t border-border pt-7">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Video Details</p>

                    {/* Artists */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Artists</p>
                      <div className="space-y-2">
                        {expandedVideo.videoArtists.map((name, ai) => (
                          <div key={ai} className="flex gap-2">
                            <Input
                              value={name}
                              placeholder="Artist name"
                              onChange={(e) => {
                                const next = [...expandedVideo.videoArtists]
                                next[ai] = e.target.value
                                updateVideo(expandedVideoIdx, { videoArtists: next })
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = expandedVideo.videoArtists.filter((_, j) => j !== ai)
                                updateVideo(expandedVideoIdx, { videoArtists: next.length > 0 ? next : [""] })
                              }}
                              disabled={expandedVideo.videoArtists.length <= 1 || busy}
                              className="h-9 w-9 shrink-0 p-0 text-muted-foreground/40 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateVideo(expandedVideoIdx, { videoArtists: [...expandedVideo.videoArtists, ""] })}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs text-accent/60 transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                          Add artist
                        </button>
                      </div>
                    </div>

                    {/* Event · Venue · Date · City */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Event</label>
                        <Input value={expandedVideo.videoEvent} placeholder="Boiler Room, ICE…" onChange={(e) => updateVideo(expandedVideoIdx, { videoEvent: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Venue</label>
                        <Input value={expandedVideo.venue} placeholder="Club, stage…" onChange={(e) => updateVideo(expandedVideoIdx, { venue: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Date</label>
                        <DatePicker value={expandedVideo.videoDate ?? ""} onChange={(v) => updateVideo(expandedVideoIdx, { videoDate: v })} allowClear triggerClassName="h-9 w-full rounded-lg border border-border bg-secondary px-3" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">City</label>
                        <Input value={expandedVideo.videoCity} placeholder="Santiago, Berlin…" onChange={(e) => updateVideo(expandedVideoIdx, { videoCity: e.target.value })} />
                      </div>
                    </div>

                    {/* Country */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Country</label>
                        <Input value={expandedVideo.videoCountry} placeholder="CL, DE…" onChange={(e) => updateVideo(expandedVideoIdx, { videoCountry: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* ── Visibility ──────────────────────────────────────── */}
                  <div className="border-t border-border pt-7">
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">Visibility</p>
                    <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
                      <label className="relative inline-flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={expandedVideo.isPublished}
                          onChange={(e) => updateVideo(expandedVideoIdx, { isPublished: e.target.checked })}
                          className="sr-only"
                        />
                        <span className={cn(
                          "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150",
                          expandedVideo.isPublished ? "bg-accent/70" : "bg-border",
                        )}>
                          <span className={cn(
                            "h-3 w-3 rounded-full bg-white/90 shadow-sm transition-transform duration-150",
                            expandedVideo.isPublished ? "translate-x-3" : "translate-x-0",
                          )} />
                        </span>
                        <div>
                          <p className="text-[12px] font-medium text-foreground/80">Show on public profile</p>
                          <p className="text-[10px] text-muted-foreground/40">Controls whether this video appears on your public artist page.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Footer ────────────────────────────────────────────── */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4">
                <p className="text-[11px] text-muted-foreground/35">
                  {isSaveDirty ? "Unsaved changes — use Save Changes to persist." : "No pending changes."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedVideoId(null)}
                    className="rounded-lg border border-border bg-secondary px-4 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-secondary/80 hover:text-foreground"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExpandedVideoId(null); void handleSaveChanges() }}
                    disabled={busy || !isSaveDirty}
                    className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40"
                  >
                    {isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }
  function renderGallery() {
    const busy = isReorderingGallery || !!deletingGalleryImageId || isUploadingGalleryImage || isSaving || isPublishing

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0] ?? null
      if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setGalleryFileError("Only JPEG, PNG and WEBP images are accepted.")
        setGalleryImageSmallWarning("")
        setGalleryImageFile(null)
        event.target.value = ""
        return
      }
      setGalleryFileError("")
      setGalleryImageSmallWarning("")
      setGalleryImageFile(file)
      if (file) {
        const objectUrl = URL.createObjectURL(file)
        const img = new globalThis.Image()
        img.onload = () => {
          URL.revokeObjectURL(objectUrl)
          if (img.naturalWidth < 2400) setGalleryImageSmallWarning("Image may appear soft. Recommended: 2400px+ wide.")
        }
        img.onerror = () => URL.revokeObjectURL(objectUrl)
        img.src = objectUrl
      }
    }

    const photoCount = galleryImages.length

    return (
      <div className="space-y-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Gallery
              {photoCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground/40">
                  · {photoCount} {photoCount === 1 ? "photo" : "photos"}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground/52">
              Manage photos used across your DJHQ profile, press kit and artist pages.
            </p>
            {photoCount > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground/30">
                Drag photos to reorder. The first photos appear first on your public profile.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryFileInputRef.current?.click()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Photos
          </button>
        </div>

        {/* Photo grid */}
        {photoCount > 0 && (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {galleryImages.map((image, index) => {
              const isDraggingThis = galleryDragIndex === index
              const isDragTarget   = galleryDragOverIndex === index && galleryDragIndex !== index

              return (
                <div
                  key={image.id}
                  draggable={!busy}
                  onDragStart={() => { setGalleryDragIndex(index); setGalleryDragOverIndex(null) }}
                  onDragOver={(e) => { e.preventDefault(); setGalleryDragOverIndex(index) }}
                  onDragLeave={() => setGalleryDragOverIndex(null)}
                  onDrop={(e) => { e.preventDefault(); if (galleryDragIndex !== null) handleGalleryDrop(galleryDragIndex, index) }}
                  onDragEnd={() => { setGalleryDragIndex(null); setGalleryDragOverIndex(null) }}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border select-none transition-all duration-150 active:cursor-grabbing ${
                    isDraggingThis ? "scale-95 opacity-40 border-border" :
                    isDragTarget   ? "scale-[1.04] border-accent/40 ring-1 ring-accent/25" :
                                     "border-border"
                  }`}
                >
                  <Image
                    src={image.imageUrl}
                    alt={image.altText}
                    fill
                    sizes="(min-width: 1024px) 112px, (min-width: 768px) 140px, (min-width: 640px) 170px, 33vw"
                    className="pointer-events-none object-cover"
                  />

                  {/* Hover overlay: Preview + Delete */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100">
                    <a
                      href={image.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-white/12 px-2.5 text-[10px] font-medium text-white/85 hover:bg-white/22 hover:text-foreground"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      View
                    </a>
                    <button
                      type="button"
                      disabled={deletingGalleryImageId === image.id || busy}
                      onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(image.id) }}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-white/10 px-2.5 text-[10px] font-medium text-white/70 hover:bg-destructive/35 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {photoCount === 0 && !galleryImageFile && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground/55">No photos uploaded yet.</p>
            <p className="mt-1.5 max-w-xs mx-auto text-[12px] leading-[1.6] text-muted-foreground/35">
              Add artist photos, live shots and press images for your profile and press kit.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryFileInputRef.current?.click()}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-border hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload Photos
            </button>
            <p className="mt-4 text-[10px] text-muted-foreground/25">
              Recommended: 6–12 high-quality photos.
            </p>
          </div>
        )}

        {/* Upload confirmation */}
        {galleryImageFile && (
          <div className="rounded-xl border border-border bg-card/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="truncate text-sm font-medium text-foreground/80">{galleryImageFile.name}</p>
              <button
                type="button"
                onClick={() => { setGalleryImageFile(null); setGalleryImageAltText(""); setGalleryImageSmallWarning(""); setGalleryFileError("") }}
                className="ml-3 shrink-0 text-[11px] text-muted-foreground/40 hover:text-foreground/60"
              >
                Cancel
              </button>
            </div>
            {galleryImageSmallWarning && (
              <p className="mb-2 text-[11px] text-amber-400/75">{galleryImageSmallWarning}</p>
            )}
            <div className="mb-3 space-y-1.5">
              <label htmlFor="galleryImageAltText" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                Alt Text <span className="normal-case text-muted-foreground/30">(optional)</span>
              </label>
              <Input
                id="galleryImageAltText"
                value={galleryImageAltText}
                onChange={(e) => setGalleryImageAltText(e.target.value)}
                placeholder="e.g. Live set at Club Room, press portrait"
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              onClick={handleUploadGalleryImage}
              disabled={busy}
              className="h-8 bg-accent/90 px-4 text-[11px] text-accent-foreground hover:bg-accent"
            >
              {isUploadingGalleryImage ? "Uploading…" : "Upload"}
            </Button>
          </div>
        )}

        {galleryFileError && (
          <p className="text-xs text-destructive/80">{galleryFileError}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={galleryFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {photoCount > 0 && (
          <p className="text-[10px] text-muted-foreground/22">
            JPG, PNG, WEBP · up to 20 MB · Recommended: 6–12 high-quality photos.
          </p>
        )}

      </div>
    )
  }

  function handleAddAsset() {
    const trimmed = newAssetInput.trim()
    if (!trimmed) return
    setPressKitAssets((current) =>
      current.includes(trimmed) ? current : [...current, trimmed],
    )
    setNewAssetInput("")
  }

  function handleRemoveAsset(index: number) {
    setPressKitAssets((current) => current.filter((_, i) => i !== index))
  }

  function renderTourPlanner() {
    // ── Helpers ──────────────────────────────────────────────────────────────
    function slugify(name: string): string {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "")
        .trim()
        .slice(0, 50)
    }

    function formatRange(start: string, end: string): string {
      if (!start || !end) return ""
      const s = new Date(start + "T00:00:00")
      const e = new Date(end + "T00:00:00")
      const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
      const sf = s.toLocaleDateString("en-US", opts)
      const ef = e.toLocaleDateString("en-US", { ...opts, year: "numeric" })
      return s.getFullYear() === e.getFullYear() ? `${sf} – ${ef}` : `${s.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${ef}`
    }

    async function handleCreateTour() {
      if (!tourName.trim() || !tourSlug.trim() || !tourStartDate || !tourEndDate) {
        setTourError("All fields are required.")
        return
      }
      setTourSaving(true)
      setTourError("")
      try {
        const res = await fetch("/api/artists/tours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId: artist.id, name: tourName, slug: tourSlug, startDate: tourStartDate, endDate: tourEndDate, isPublished: tourIsPublished }),
        })
        const data = await res.json()
        if (!res.ok) { setTourError(data.error ?? "Failed to create tour."); return }
        setTours((prev) => [...prev, data.tour])
        setSelectedTourId(data.tour.id)
        setTourFormOpen(false)
        setTourDeleteConfirm(false)
      } catch { setTourError("Failed to create tour.") }
      finally { setTourSaving(false) }
    }

    async function handleUpdateTour() {
      if (!selectedTourId) return
      if (!tourName.trim() || !tourSlug.trim() || !tourStartDate || !tourEndDate) {
        setTourError("All fields are required.")
        return
      }
      setTourSaving(true)
      setTourError("")
      try {
        const res = await fetch("/api/artists/tours", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tourId: selectedTourId, artistId: artist.id, name: tourName, slug: tourSlug, startDate: tourStartDate, endDate: tourEndDate, isPublished: tourIsPublished }),
        })
        const data = await res.json()
        if (!res.ok) { setTourError(data.error ?? "Failed to update tour."); return }
        setTours((prev) => prev.map((t) => t.id === selectedTourId ? data.tour : t))
        setTourFormOpen(false)
        setTourDeleteConfirm(false)
      } catch { setTourError("Failed to update tour.") }
      finally { setTourSaving(false) }
    }

    async function handleDeleteTour() {
      if (!selectedTourId) return
      setTourDeleting(true)
      try {
        await fetch(`/api/artists/tours?tourId=${selectedTourId}&artistId=${artist.id}`, { method: "DELETE" })
        setTours((prev) => prev.filter((t) => t.id !== selectedTourId))
        setSelectedTourId(null)
        setTourDeleteConfirm(false)
        setTourFormOpen(false)
      } catch { /* ignore */ }
      finally { setTourDeleting(false) }
    }

    function openCreateForm() {
      setTourFormMode("create")
      setTourName(""); setTourSlug(""); setTourStartDate(""); setTourEndDate("")
      setTourIsPublished(true); setTourError("")
      setTourFormOpen(true); setTourDeleteConfirm(false)
    }

    function openEditForm(tour: { id: string; name: string; slug: string; startDate: string; endDate: string; isPublished: boolean }) {
      setTourFormMode("edit")
      setTourName(tour.name); setTourSlug(tour.slug)
      setTourStartDate(tour.startDate); setTourEndDate(tour.endDate)
      setTourIsPublished(tour.isPublished); setTourError("")
      setTourFormOpen(true); setTourDeleteConfirm(false)
    }

    // ── Derived ──────────────────────────────────────────────────────────────
    const selectedTour = selectedTourId ? tours.find((t) => t.id === selectedTourId) ?? null : null

    const gigsInTour: TourCalendarGig[] = selectedTour
      ? upcomingGigs
          .filter((g) => g.date && g.visibilityStatus !== "cancelled" && g.date >= selectedTour.startDate && g.date <= selectedTour.endDate)
          .map((g) => ({ id: g.id, date: g.date, eventName: g.eventName, venue: g.venue, city: g.city || undefined }))
      : []

    const publicTourUrl = selectedTour
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/${artist.handle}/tours/${selectedTour.slug}`
      : ""

    const isPublicTourUrlPath = selectedTour ? `/${artist.handle}/tours/${selectedTour.slug}` : ""

    // ── View: Edit/Create form ────────────────────────────────────────────────
    if (tourFormOpen) {
      const isEdit = tourFormMode === "edit"
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setTourFormOpen(false); setTourDeleteConfirm(false) }} className="text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/60">
              ← Back
            </button>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{isEdit ? "Edit Tour" : "Create Tour"}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground/55">
              {isEdit ? "Update tour name, dates or slug." : "Give your tour a name and set the date range."}
            </p>
          </div>

          <div className="max-w-[560px] space-y-5 rounded-xl border border-border bg-card/40 p-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Tour Name</label>
              <input
                type="text"
                value={tourName}
                placeholder="Euro Tour 2026"
                onChange={(e) => {
                  setTourName(e.target.value)
                  if (tourFormMode === "create") setTourSlug(slugify(e.target.value))
                }}
                className="h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">URL Slug</label>
              <input
                type="text"
                value={tourSlug}
                placeholder="eurotour2026"
                onChange={(e) => setTourSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50))}
                className="h-9 w-full rounded-lg border border-border bg-secondary px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              {tourSlug && (
                <p className="text-[10px] text-muted-foreground/38">
                  Public URL: <span className="font-mono text-muted-foreground/55">/{artist.handle}/tours/{tourSlug}</span>
                </p>
              )}
            </div>

            {/* Date range */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Start Date</label>
                <DatePicker value={tourStartDate} onChange={setTourStartDate} allowClear triggerClassName="h-9 w-full rounded-lg border border-border bg-secondary px-3" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">End Date</label>
                <DatePicker value={tourEndDate} onChange={setTourEndDate} allowClear triggerClassName="h-9 w-full rounded-lg border border-border bg-secondary px-3" />
              </div>
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <label className="relative inline-flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={tourIsPublished} onChange={(e) => setTourIsPublished(e.target.checked)} className="sr-only" />
                <span className={cn("flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", tourIsPublished ? "bg-accent/70" : "bg-border")}>
                  <span className={cn("h-3 w-3 rounded-full bg-white/90 shadow-sm transition-transform", tourIsPublished ? "translate-x-3" : "translate-x-0")} />
                </span>
                <span className="text-[12px] text-foreground/70">Published (public page active)</span>
              </label>
            </div>

            {tourError && <p className="text-[11px] text-destructive/70">{tourError}</p>}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              {isEdit && (
                <div>
                  {!tourDeleteConfirm ? (
                    <button type="button" onClick={() => setTourDeleteConfirm(true)} className="text-[11px] text-muted-foreground/35 transition-colors hover:text-destructive/60">
                      Delete tour
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground/50">Delete permanently?</span>
                      <button type="button" onClick={() => setTourDeleteConfirm(false)} className="text-[11px] text-muted-foreground/40 hover:text-foreground/60">Cancel</button>
                      <button type="button" disabled={tourDeleting} onClick={() => void handleDeleteTour()} className="text-[11px] font-medium text-destructive/70 hover:text-destructive disabled:opacity-40">
                        {tourDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className={cn("flex items-center gap-2", !isEdit && "ml-auto")}>
                <button type="button" onClick={() => { setTourFormOpen(false); setTourDeleteConfirm(false) }} className="rounded-lg border border-border bg-secondary px-4 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-secondary/80">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={tourSaving || !tourName.trim() || !tourSlug.trim() || !tourStartDate || !tourEndDate}
                  onClick={() => isEdit ? void handleUpdateTour() : void handleCreateTour()}
                  className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40"
                >
                  {tourSaving ? "Saving…" : isEdit ? "Save Changes" : "Create Tour"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── View: Tour detail ────────────────────────────────────────────────────
    if (selectedTour) {
      return (
        <div className="space-y-6">
          {/* Breadcrumb + edit */}
          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={() => { setSelectedTourId(null); setTourDeleteConfirm(false) }} className="text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/60">
              ← All tours
            </button>
            <button type="button" onClick={() => openEditForm(selectedTour)} className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-foreground/65 transition-colors hover:bg-secondary/60 hover:text-foreground">
              Edit settings
            </button>
          </div>

          {/* Tour header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{selectedTour.name}</h2>
              {!selectedTour.isPublished && (
                <span className="rounded-full border border-border bg-secondary px-2 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                  Draft
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground/55">{formatRange(selectedTour.startDate, selectedTour.endDate)}</p>
          </div>

          {/* Public URL card */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Public URL</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-3 py-2 text-[12px] font-mono text-foreground/70">
                {isPublicTourUrlPath}
              </code>
              <a
                href={isPublicTourUrlPath}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-border bg-secondary/30 p-2 text-muted-foreground/40 transition-colors hover:text-foreground"
                title="Open public page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(publicTourUrl)
                  setTourUrlCopied(true)
                  setTimeout(() => setTourUrlCopied(false), 2000)
                }}
                className="shrink-0 rounded-lg border border-border bg-secondary/30 p-2 transition-colors hover:text-foreground"
                title="Copy URL"
              >
                {tourUrlCopied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </button>
            </div>
            {!selectedTour.isPublished && (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400/60">
                <AlertTriangle className="h-3 w-3" />
                This tour is unpublished — the public page returns 404 until published.
              </p>
            )}
          </div>

          {/* Show count */}
          <div className="flex items-center gap-3">
            <p className="text-[12px] text-muted-foreground/55">
              <span className="font-semibold text-foreground/80">{gigsInTour.length}</span>{" "}
              show{gigsInTour.length !== 1 ? "s" : ""} scheduled in this tour range
            </p>
          </div>

          {/* Calendar preview */}
          <div>
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30">
              Tour Schedule
            </p>
            <TourCalendar
              startDate={selectedTour.startDate}
              endDate={selectedTour.endDate}
              gigs={gigsInTour}
              variant="hq"
            />
          </div>
        </div>
      )
    }

    // ── View: Tour list (default) ─────────────────────────────────────────────
    return (
      <div className="space-y-6">
        {/* Header */}
        <HqPageHeader
          title="Tour Planner"
          description="Plan and publish date-range pages around your tours."
          action={
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground/70 transition-all hover:border-border hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Tour
            </button>
          }
        />

        {/* Empty state */}
        {!toursLoaded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {toursLoaded && tours.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary px-6 py-10 text-center">
            <Route className="mx-auto mb-3 h-6 w-6 text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground/55">No tours yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.6] text-muted-foreground/32">
              Create a tour plan to organize shows across a date range and generate a public tour page.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-4 text-[11px] font-medium text-foreground/65 transition-all hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Tour
            </button>
          </div>
        )}

        {/* Tour list */}
        {toursLoaded && tours.length > 0 && (
          <div className="space-y-2">
            {tours.map((tour) => {
              const tourGigCount = upcomingGigs.filter(
                (g) => g.date && g.visibilityStatus !== "cancelled" && g.date >= tour.startDate && g.date <= tour.endDate,
              ).length
              const startParsed = tour.startDate ? new Date(tour.startDate + "T00:00:00") : null
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => { setSelectedTourId(tour.id); setTourDeleteConfirm(false) }}
                  className="group flex w-full overflow-hidden rounded-xl border border-border text-left transition-all hover:-translate-y-px hover:[box-shadow:0_4px_16px_rgba(0,0,0,0.07)]"
                >
                  {/* Start date block — mirrors show boarding pass */}
                  <div className="flex w-[68px] shrink-0 flex-col items-center justify-center self-stretch bg-secondary px-2 py-4 text-center">
                    {startParsed ? (
                      <>
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent/55">
                          {startParsed.toLocaleString("en-US", { month: "short" }).toUpperCase()}
                        </span>
                        <span className="text-[1.7rem] font-black leading-none tabular-nums text-foreground/80">
                          {String(startParsed.getDate()).padStart(2, "0")}
                        </span>
                        <span className="mt-0.5 text-[8px] text-muted-foreground/28">
                          {startParsed.getFullYear()}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground/20">—</span>
                    )}
                  </div>
                  <div className="w-px shrink-0 bg-secondary" />
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-bold text-foreground/85">{tour.name}</p>
                      {tour.isPublished ? (
                        <span className="shrink-0 rounded-full bg-accent/[0.08] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.12em] text-accent/60">
                          Live
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-secondary px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/38">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/42">{formatRange(tour.startDate, tour.endDate)}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/28">
                      {tourGigCount} show{tourGigCount !== 1 ? "s" : ""} in range
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center pr-4">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/22 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderBookings() {
    const emailEmpty   = !bookingEmail.trim()
    const emailInvalid = Boolean(bookingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail.trim()))

    return (
      <div className="space-y-6">
        {/* Section header */}
        <HqPageHeader title="Bookings" description="Incoming booking requests from your public profile." />

        {/* Booking email config */}
        <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground/80">Delivery Email</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/40">
                Booking requests will be sent to this address.
                Sent from{" "}
                <span className="font-mono text-muted-foreground/50">DJHQ Booking &lt;booking@djhq.app&gt;</span>{" "}
                with the requester as reply-to. Saved with the global Save button.
              </p>
            </div>
            <div className="w-full max-w-[320px] shrink-0 space-y-1.5">
              <Input
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="booking@artist.com"
              />
              {emailEmpty && (
                <p className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Not configured — requests cannot be delivered.
                </p>
              )}
              {emailInvalid && (
                <p className="text-[10px] text-amber-400/70">Enter a valid email address.</p>
              )}
            </div>
          </div>
        </div>

        {/* Leads */}
        <BookingsSection artistId={artist.id} />
      </div>
    )
  }

  function renderPressKit() {
    const pressKitUrlInvalid = Boolean(pressKitEnabled && pressKitUrl && !pressKitUrl.startsWith("http"))
    const activeDomain = customDomains.find((d) => d.status === "active")
    const pressKitDefaultUrl = activeDomain
      ? `https://${activeDomain.domain}/presskit`
      : `${APP_DISPLAY_HOST}/${artist.handle}/presskit`
    const pressKitResolvedUrl = pressKitPublicUrl.trim() || pressKitDefaultUrl

    const toggleCard = (id: string) =>
      setPkExpandedIds((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) } return n })
    const isOpen = (id: string) => pkExpandedIds.has(id)

    const folderIconMap: Record<string, React.ReactNode> = {
      drive:  <FolderOpen className="h-5 w-5 text-accent/65" />,
      bio:    <FileText   className="h-5 w-5 text-accent/65" />,
      logos:  <Layers     className="h-5 w-5 text-accent/65" />,
      photos: <Camera     className="h-5 w-5 text-accent/65" />,
      rider:  <Wrench     className="h-5 w-5 text-accent/65" />,
    }

    // Readiness summary
    const readinessItems = [
      { label: "Press Kit enabled",   ok: pressKitEnabled },
      { label: "English PDF",         ok: Boolean(pressKitPdfEnUrl.trim()) },
      { label: "Spanish PDF",         ok: Boolean(pressKitPdfEsUrl.trim()) },
      { label: "Full Drive Package",  ok: Boolean(pressKitRootUrl.trim()) },
      { label: "Press Photos Folder", ok: Boolean(pressKitMediaFolderUrl.trim()) },
      { label: "Logos & Artwork",     ok: Boolean(pressKitLogosFolderUrl.trim()) },
      { label: "Technical Rider",     ok: Boolean(pressKitRiderFolderUrl.trim()) },
    ]
    const configuredCount = readinessItems.filter((i) => i.ok).length

    return (
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <HqPageHeader title="Press Kit" description="Manage your public EPK, downloads and press assets." />

        {/* ── 1. Public EPK ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  pressKitEnabled
                    ? "bg-accent/10 text-accent/80"
                    : "bg-secondary text-muted-foreground/40",
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", pressKitEnabled ? "bg-accent" : "bg-muted-foreground/30")} />
                  {pressKitEnabled ? "Live" : "Hidden"}
                </span>
                <a
                  href={pressKitResolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono text-[11px] text-muted-foreground/42 hover:text-accent/70"
                >
                  {pressKitResolvedUrl}
                </a>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(pressKitResolvedUrl)}
                className="rounded px-2 py-1 text-[10px] font-medium text-muted-foreground/35 transition-colors hover:text-foreground/60"
              >
                Copy
              </button>
              <a href={pressKitResolvedUrl} target="_blank" rel="noopener noreferrer"
                className="rounded px-2 py-1 text-[10px] font-medium text-accent/55 transition-colors hover:text-accent/85">
                View →
              </a>
              <button type="button" onClick={() => toggleCard("epk-settings")}
                className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors", isOpen("epk-settings") ? "bg-accent/10 text-accent/80" : "text-muted-foreground/35 hover:text-foreground/60")}>
                {isOpen("epk-settings") ? "Close" : "Edit"}
              </button>
            </div>
          </div>

          {/* EPK settings (collapsed by default) */}
          {isOpen("epk-settings") && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              {/* Status toggle */}
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] text-muted-foreground/50">Visibility</p>
                <div role="group" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
                  <button type="button" onClick={() => setPressKitEnabled(true)} aria-pressed={pressKitEnabled}
                    className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                      pressKitEnabled ? "bg-accent/[0.15] text-accent/80" : "text-muted-foreground/25 hover:text-muted-foreground/45")}>
                    Live
                  </button>
                  <button type="button" onClick={() => setPressKitEnabled(false)} aria-pressed={!pressKitEnabled}
                    className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                      !pressKitEnabled ? "bg-secondary text-foreground/60" : "text-muted-foreground/25 hover:text-muted-foreground/45")}>
                    Hidden
                  </button>
                </div>
              </div>
              {/* Button URL override */}
              <div className="space-y-1.5">
                <label htmlFor="pressKitPublicUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
                  Press Kit Button URL
                </label>
                <Input id="pressKitPublicUrl" value={pressKitPublicUrl} onChange={(e) => setPressKitPublicUrl(e.target.value)} placeholder={pressKitDefaultUrl} />
                <p className="text-[10px] text-muted-foreground/28">Leave blank to use the default EPK URL.</p>
              </div>
            </div>
          )}
        </div>

        {/* Readiness */}
        <div className="rounded-xl border border-border bg-secondary px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/38">Press Kit Readiness</p>
            <span className="text-[11px] tabular-nums text-muted-foreground/38">{configuredCount} / {readinessItems.length}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full transition-all duration-700", configuredCount === readinessItems.length ? "bg-accent/60" : "bg-accent/35")}
              style={{ width: `${Math.round((configuredCount / readinessItems.length) * 100)}%` }} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {readinessItems.map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-1.5">
                {ok ? <Check className="h-3 w-3 shrink-0 text-accent/55" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />}
                <span className={cn("text-[10px]", ok ? "text-foreground/50" : "text-muted-foreground/28")}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dim when disabled */}
        <div className={cn("space-y-5 transition-opacity duration-200", !pressKitEnabled && "pointer-events-none opacity-35")}>

          {/* ── 2. Downloads ───────────────────────────────────────────── */}
          <div>
            <p className="mb-3 px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/38">Downloads</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* ENG card */}
              <div className={cn("overflow-hidden rounded-[20px] border transition-all duration-150",
                pressKitPdfEnUrl.trim() ? "border-border bg-secondary" : "border-dashed border-border bg-secondary")}>
                <div className="flex items-center gap-3 p-4">
                  {/* UK flag */}
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#012169] ring-1 ring-white/[0.10]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" className="h-full w-full">
                      <rect width="60" height="36" fill="#012169"/><line x1="0" y1="0" x2="60" y2="36" stroke="#fff" strokeWidth="8"/><line x1="60" y1="0" x2="0" y2="36" stroke="#fff" strokeWidth="8"/>
                      <line x1="0" y1="0" x2="60" y2="36" stroke="#C8102E" strokeWidth="4.5"/><line x1="60" y1="0" x2="0" y2="36" stroke="#C8102E" strokeWidth="4.5"/>
                      <line x1="30" y1="0" x2="30" y2="36" stroke="#fff" strokeWidth="12"/><line x1="0" y1="18" x2="60" y2="18" stroke="#fff" strokeWidth="12"/>
                      <line x1="30" y1="0" x2="30" y2="36" stroke="#C8102E" strokeWidth="7"/><line x1="0" y1="18" x2="60" y2="18" stroke="#C8102E" strokeWidth="7"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground/88">Press Kit ENG</p>
                    <p className={cn("text-[10px]", pressKitPdfEnUrl.trim() ? "text-accent/65" : "text-muted-foreground/30")}>
                      {pressKitPdfEnUrl.trim() ? `PDF${pressKitPdfEnSize.trim() ? ` · ${pressKitPdfEnSize}` : ""}` : "Not configured"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {pressKitPdfEnUrl.trim() && (
                      <a href={pressKitPdfEnUrl} target="_blank" rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.06] text-accent/70 hover:bg-accent/[0.12]"
                        title="Open">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button type="button" onClick={() => toggleCard("en")}
                      className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors", isOpen("en") ? "bg-accent/10 text-accent/80" : "text-muted-foreground/35 hover:text-foreground/60")}>
                      {isOpen("en") ? "Done" : "Edit"}
                    </button>
                  </div>
                </div>
                {isOpen("en") && (
                  <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
                    <Input value={pressKitPdfEnUrl} onChange={(e) => setPressKitPdfEnUrl(e.target.value)} placeholder="https://…/epk-en.pdf" className="h-8 text-xs" disabled={!pressKitEnabled} />
                    <Input value={pressKitPdfEnSize} onChange={(e) => setPressKitPdfEnSize(e.target.value)} placeholder="File size, e.g. 4.2 MB" className="h-8 text-xs" disabled={!pressKitEnabled} />
                  </div>
                )}
              </div>

              {/* ESP card */}
              <div className={cn("overflow-hidden rounded-[20px] border transition-all duration-150",
                pressKitPdfEsUrl.trim() ? "border-border bg-secondary" : "border-dashed border-border bg-secondary")}>
                <div className="flex items-center gap-3 p-4">
                  {/* Spain flag */}
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a] ring-1 ring-white/[0.10]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className="h-full w-full">
                      <rect width="3" height="2" fill="#c60b1e"/><rect width="3" height="1" y="0.5" fill="#ffc400"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground/88">Press Kit ESP</p>
                    <p className={cn("text-[10px]", pressKitPdfEsUrl.trim() ? "text-accent/65" : "text-muted-foreground/30")}>
                      {pressKitPdfEsUrl.trim() ? `PDF${pressKitPdfEsSize.trim() ? ` · ${pressKitPdfEsSize}` : ""}` : "Not configured"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {pressKitPdfEsUrl.trim() && (
                      <a href={pressKitPdfEsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.06] text-accent/70 hover:bg-accent/[0.12]"
                        title="Open">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button type="button" onClick={() => toggleCard("es")}
                      className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors", isOpen("es") ? "bg-accent/10 text-accent/80" : "text-muted-foreground/35 hover:text-foreground/60")}>
                      {isOpen("es") ? "Done" : "Edit"}
                    </button>
                  </div>
                </div>
                {isOpen("es") && (
                  <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
                    <Input value={pressKitPdfEsUrl} onChange={(e) => setPressKitPdfEsUrl(e.target.value)} placeholder="https://…/epk-es.pdf" className="h-8 text-xs" disabled={!pressKitEnabled} />
                    <Input value={pressKitPdfEsSize} onChange={(e) => setPressKitPdfEsSize(e.target.value)} placeholder="File size, e.g. 3.8 MB" className="h-8 text-xs" disabled={!pressKitEnabled} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Asset Folders ───────────────────────────────────────── */}
          <div>
            <p className="mb-3 px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/38">Asset Folders</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { id: "drive",  label: "Full Drive Package", desc: "Complete press kit",      value: pressKitRootUrl,        setter: setPressKitRootUrl,        badge: "Complete" },
                { id: "bio",    label: "Bio & Text",          desc: "Artist biography",       value: pressKitBioFolderUrl,   setter: setPressKitBioFolderUrl,   badge: null },
                { id: "logos",  label: "Logos & Artwork",     desc: "Brand assets",           value: pressKitLogosFolderUrl, setter: setPressKitLogosFolderUrl, badge: null },
                { id: "photos", label: "Press Photos",        desc: "High-res press images",  value: pressKitMediaFolderUrl, setter: setPressKitMediaFolderUrl, badge: null },
                { id: "rider",  label: "Technical Rider",     desc: "Stage requirements",     value: pressKitRiderFolderUrl, setter: setPressKitRiderFolderUrl, badge: null },
              ].map(({ id, label, desc, value, setter, badge }) => (
                <div key={id} className={cn("overflow-hidden rounded-[20px] border transition-all duration-150",
                  value.trim() ? "border-border bg-secondary" : "border-dashed border-border bg-secondary")}>
                  <div className="p-4">
                    {/* Icon row */}
                    <div className="flex items-start justify-between">
                      {folderIconMap[id]}
                      {badge && (
                        <span className="rounded-full border border-border bg-secondary px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.14em] text-white/25">
                          {badge}
                        </span>
                      )}
                    </div>
                    {/* Label + desc */}
                    <p className="mt-3 text-sm font-bold text-foreground/85">{label}</p>
                    <p className="mt-0.5 text-xs text-white/30">{desc}</p>
                    {/* Status + actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium", value.trim() ? "text-accent/60" : "text-muted-foreground/28")}>
                        {value.trim() ? "Configured" : "Missing"}
                      </span>
                      {value.trim() && (
                        <a href={value} target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/55 hover:text-accent/85">
                          Open <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {/* Edit toggle */}
                    <button type="button" onClick={() => toggleCard(id)}
                      className={cn("mt-2 text-[10px] font-medium transition-colors", isOpen(id) ? "text-accent/70" : "text-muted-foreground/28 hover:text-foreground/50")}>
                      {isOpen(id) ? "Close ↑" : "Edit URL ↓"}
                    </button>
                  </div>
                  {isOpen(id) && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <Input value={value} onChange={(e) => setter(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/…"
                        className="h-8 text-xs" disabled={!pressKitEnabled} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. Press Photos Preview ────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Press Photos Preview</p>
                <p className="mt-0.5 text-xs text-muted-foreground/40">
                  Controls the preview grid on your public EPK. High-resolution photos remain available from the Press Photos folder.
                </p>
              </div>
              <div role="group" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
                <button type="button" onClick={() => setPressKitUseGalleryPhotos(true)} aria-pressed={pressKitUseGalleryPhotos} disabled={!pressKitEnabled}
                  className={cn("rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                    pressKitUseGalleryPhotos ? "bg-accent/[0.15] text-accent/80" : "text-muted-foreground/25 hover:text-muted-foreground/45")}>
                  Show
                </button>
                <button type="button" onClick={() => setPressKitUseGalleryPhotos(false)} aria-pressed={!pressKitUseGalleryPhotos} disabled={!pressKitEnabled}
                  className={cn("rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                    !pressKitUseGalleryPhotos ? "bg-secondary text-foreground/60" : "text-muted-foreground/25 hover:text-muted-foreground/45")}>
                  Hide
                </button>
              </div>
            </div>
          </div>

          {/* ── 5. Advanced Settings ───────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-border bg-card/40 transition-colors duration-150 hover:border-border">
            <button type="button" onClick={() => setPressKitAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4">
              <div>
                <span className="text-sm font-semibold text-foreground/65">Advanced Settings</span>
                <span className="ml-2 text-[10px] text-muted-foreground/28">Legacy URL · Assets list</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground/35 transition-transform duration-200", pressKitAdvancedOpen && "rotate-180")} />
            </button>
            {pressKitAdvancedOpen && (
              <div className="space-y-5 border-t border-border px-5 pb-5 pt-4">
                {/* Legacy URL */}
                <div className="space-y-1.5">
                  <label htmlFor="pressKitUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">Legacy Download URL</label>
                  <Input id="pressKitUrl" value={pressKitUrl} onChange={(e) => setPressKitUrl(e.target.value)} placeholder="https://artist.com/epk" disabled={!pressKitEnabled} />
                  {pressKitUrlInvalid && <p className="text-[10px] text-amber-400/60">Should start with https://</p>}
                  <p className="text-[10px] text-muted-foreground/28">Older direct-download link. Not required when PDF URLs above are configured.</p>
                </div>
                {/* Assets tags */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">Assets Included</p>
                  {pressKitAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pressKitAssets.map((asset, i) => (
                        <span key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/60">
                          {asset}
                          <button type="button" onClick={() => handleRemoveAsset(i)} aria-label={`Remove ${asset}`}
                            className="leading-none text-muted-foreground/30 hover:text-foreground/60">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="text" value={newAssetInput} onChange={(e) => setNewAssetInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAsset() } }}
                      placeholder="Add asset… e.g. Press photos" disabled={!pressKitEnabled} aria-label="New asset name"
                      className={cn("h-9 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/30 outline-none transition-colors duration-150 focus:border-border focus:bg-secondary disabled:cursor-not-allowed")}
                    />
                    <button type="button" onClick={handleAddAsset} disabled={!pressKitEnabled || !newAssetInput.trim()} aria-label="Add asset"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground/40 hover:border-border hover:text-foreground/60 disabled:cursor-not-allowed disabled:opacity-25">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }
  function renderPublish() {
    return (
      <div className="space-y-6">
        <HqPageHeader title="Publish" description="Control whether your profile is visible to the public." />
        <div className="space-y-5 rounded-xl border border-border bg-card/40 p-5 transition-colors duration-150 hover:border-border sm:p-6">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                artist.isPublished
                  ? "border-accent/20 bg-accent/10 text-accent"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${artist.isPublished ? "bg-accent" : "bg-muted-foreground/40"}`}
              />
              {artist.isPublished ? "Published" : "Draft"}
            </span>
            <span className="font-mono text-sm text-muted-foreground/60">{publicProfileUrl}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Control whether your profile is visible at {publicProfileUrl}.
          </p>
          <Button
            type="button"
            disabled={isPublishing || isSaving}
            onClick={handleTogglePublish}
            className={
              artist.isPublished
                ? "bg-secondary text-foreground hover:bg-secondary/80"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }
          >
            {isPublishing ? "Updating..." : artist.isPublished ? "Unpublish profile" : "Publish profile"}
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Profile visibility updates immediately after publishing changes.
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Only the profile owner can publish or unpublish this artist.
            </div>
          </div>
        </div>
      </div>
    )
  }

  async function handleAddDomain() {
    setAddDomainError("")
    setIsAddingDomain(true)

    try {
      const response = await fetch("/api/custom-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, domain: domainInput }),
      })

      const result = (await response.json()) as {
        id?: string
        domain?: string
        status?: string
        verificationRecord?: { type: string; name: string; value: string }
        routingRecord?: { type: string; name: string; value: string }
        error?: string
      }

      if (!response.ok || !result.id) {
        setAddDomainError(result.error ?? "Unable to add domain.")
        return
      }

      setCustomDomains([
        {
          id: result.id,
          domain: result.domain ?? domainInput.trim().toLowerCase(),
          status: "pending",
          createdAt: new Date().toISOString(),
          verificationAttempts: 0,
          verificationRecord: result.verificationRecord
            ? { type: result.verificationRecord.type as "TXT", name: result.verificationRecord.name, value: result.verificationRecord.value }
            : undefined,
          routingRecord: result.routingRecord
            ? { type: result.routingRecord.type as "CNAME", name: result.routingRecord.name, value: result.routingRecord.value }
            : undefined,
        },
      ])
      setDomainInput("")
    } catch {
      setAddDomainError("Unable to add domain. Please try again.")
    } finally {
      setIsAddingDomain(false)
    }
  }

  async function handleVerifyDomain(domainId: string) {
    setIsVerifyingDomainId(domainId)

    try {
      const response = await fetch("/api/custom-domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      })

      const result = (await response.json()) as {
        status?: string
        routingDnsOk?: boolean
        message?: string
        error?: string
        dnsTarget?: string | null
      }

      const nextStatus = result.status ?? (response.ok ? "verified" : "error")

      setCustomDomains((current) =>
        current.map((d) =>
          d.id === domainId
            ? {
                ...d,
                status: nextStatus as typeof d.status,
                errorMessage: !response.ok ? (result.error ?? undefined) : undefined,
                verifiedAt: nextStatus === "verified" ? new Date().toISOString() : d.verifiedAt,
                routingDnsOk: result.routingDnsOk,
                verificationAttempts: d.verificationAttempts + 1,
                lastVerificationAttemptAt: new Date().toISOString(),
                routingRecord: result.dnsTarget
                  ? { type: "CNAME" as const, name: "@", value: result.dnsTarget }
                  : d.routingRecord,
              }
            : d,
        ),
      )
    } catch {
      setCustomDomains((current) =>
        current.map((d) =>
          d.id === domainId
            ? { ...d, status: "error", errorMessage: "Unable to check DNS. Please try again." }
            : d,
        ),
      )
    } finally {
      setIsVerifyingDomainId(null)
    }
  }

  async function handleCheckConnection(domainId: string) {
    setIsCheckingConnectionId(domainId)

    try {
      const response = await fetch(`/api/custom-domains/${domainId}/check-connection`, {
        method: "POST",
      })

      const result = (await response.json()) as {
        success?: boolean
        status?: string
        routingDnsOk?: boolean
        error?: string
        dnsTarget?: string | null
      }

      setCustomDomains((current) =>
        current.map((d) => {
          if (d.id !== domainId) return d
          const nextStatus = (result.status as typeof d.status | undefined) ?? d.status
          return {
            ...d,
            status: nextStatus,
            errorMessage: result.error ?? undefined,
            addedToVercelAt: nextStatus === "active" ? new Date().toISOString() : d.addedToVercelAt,
            routingRecord: result.dnsTarget
              ? { type: "CNAME" as const, name: "@", value: result.dnsTarget }
              : d.routingRecord,
          }
        }),
      )
    } catch {
      // Silently fail — status badge remains, user can retry
    } finally {
      setIsCheckingConnectionId(null)
    }
  }

  async function handleRemoveDomain(domainId: string) {
    setIsRemovingDomainId(domainId)

    try {
      const response = await fetch(`/api/custom-domains/${domainId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCustomDomains((current) => current.filter((d) => d.id !== domainId))
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsRemovingDomainId(null)
    }
  }

  function renderFooterBranding() {
    const year = new Date().getFullYear()
    const copyrightLine = footerCopyright.trim() || `© ${year} ${artist.artistName}`
    const previewLogoUrl = footerLogoUrl.trim() || artist.heroLogoUrl || null
    const activeSocialLinks = PLATFORM_CONFIG.filter(({ id }) => linkUrls[id]?.trim())

    // CSS filter applied to the logo based on mode
    const logoFilter =
      footerLogoMode === "light" ? "brightness(0) invert(1)" : undefined

    // Canvas-based opaque-background detection
    function detectLogoBg(url: string) {
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width  = Math.min(img.naturalWidth,  64)
          canvas.height = Math.min(img.naturalHeight, 64)
          const ctx = canvas.getContext("2d")
          if (!ctx) return
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const corners = [
            ctx.getImageData(0, 0, 1, 1).data,
            ctx.getImageData(canvas.width - 1, 0, 1, 1).data,
            ctx.getImageData(0, canvas.height - 1, 1, 1).data,
            ctx.getImageData(canvas.width - 1, canvas.height - 1, 1, 1).data,
          ]
          // All 4 corners: fully opaque (alpha 255) AND very dark (r<30,g<30,b<30)
          const solidBlack = corners.every(([r, g, b, a]) => a === 255 && r < 30 && g < 30 && b < 30)
          setFooterLogoHasBg(solidBlack)
        } catch {
          // CORS or canvas security error — skip detection
        }
      }
      img.onerror = () => { /* ignore */ }
      img.src = url
    }

    return (
      <div className="space-y-5">
        <HqPageHeader title="Footer" description="Configure the visual identity shown at the bottom of your artist profile." />

        {/* Live preview — dark + light backgrounds */}
        <div className="overflow-hidden rounded-xl border border-border bg-card/30">
          <p className="border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/28">Preview</p>
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Dark background preview (actual footer background) */}
            <div className="flex flex-col items-center gap-3 bg-[#0d0d0d] px-5 py-6 text-center">
              <p className="text-[9px] uppercase tracking-[0.20em] text-white/20">Dark</p>
              {previewLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewLogoUrl}
                  alt={artist.artistName}
                  style={{ maxWidth: `${footerLogoWidth}px`, filter: logoFilter }}
                  className="max-h-[56px] object-contain"
                />
              ) : (
                <p className="text-[0.9rem] font-black tracking-[-0.02em] text-white/60">{artist.artistName}</p>
              )}
              {footerSocialsEnabled && activeSocialLinks.length > 0 && (
                <div className="flex items-center gap-3">
                  {activeSocialLinks.slice(0, 4).map(({ id, Icon }) => (
                    <Icon key={id} className="h-4 w-4 text-white/35" />
                  ))}
                </div>
              )}
              {(footerBookingEmail || footerContactEmail || footerDemosEmail) && (
                <div className="space-y-1 text-center">
                  {[footerBookingEmail, footerContactEmail, footerDemosEmail].filter(Boolean).map((em, i) => (
                    <p key={i} className="text-[10px] text-white/30">{em}</p>
                  ))}
                </div>
              )}
              {footerNewsletterEnabled && (
                <div className="mt-1 w-full space-y-1.5 border-t border-border pt-3">
                  <p className="text-[8px] uppercase tracking-[0.20em] text-white/20">Stay Connected</p>
                  <div className="mx-auto flex max-w-[140px] gap-1">
                    <div className="h-5 flex-1 rounded-full border border-border" />
                    <div className="h-5 w-10 rounded-full border border-border" />
                  </div>
                </div>
              )}
            </div>
            {/* Light background preview */}
            <div className="flex flex-col items-center gap-3 bg-white px-5 py-6 text-center">
              <p className="text-[9px] uppercase tracking-[0.20em] text-black/25">Light</p>
              {previewLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewLogoUrl}
                  alt={artist.artistName}
                  style={{ maxWidth: `${footerLogoWidth}px`, filter: logoFilter }}
                  className="max-h-[56px] object-contain"
                />
              ) : (
                <p className="text-[0.9rem] font-black tracking-[-0.02em] text-black/60">{artist.artistName}</p>
              )}
            </div>
          </div>
          <div className="border-t border-border px-4 py-3 text-[9px] text-muted-foreground/22">
            {copyrightLine}
          </div>
        </div>

        {/* Footer Logo Upload */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <label className="mb-3 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">
            Footer Logo
          </label>

          {/* Existing logo preview */}
          {footerLogoUrl && (
            <div className="mb-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={footerLogoUrl}
                alt="Footer logo"
                style={{ filter: logoFilter }}
                className="max-h-[48px] max-w-[140px] rounded-lg object-contain"
                onLoad={() => detectLogoBg(footerLogoUrl)}
              />
              <button
                type="button"
                onClick={() => { setFooterLogoUrl(""); setFooterLogoHasBg(false) }}
                className="text-[11px] text-muted-foreground/40 transition-colors hover:text-destructive/70"
              >
                Remove
              </button>
            </div>
          )}

          {/* Warnings */}
          {footerLogoHasBg && (
            <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-400/80">
              This logo appears to contain a solid background. Transparent PNG or SVG is recommended.
            </div>
          )}

          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              onChange={(e) => setFooterLogoFile(e.target.files?.[0] ?? null)}
              className="text-[12px]"
            />
            <Button
              type="button"
              onClick={handleUploadFooterLogo}
              disabled={!footerLogoFile || isUploadingFooterLogo || isSaving}
              className="shrink-0 bg-secondary text-foreground hover:bg-secondary/80"
            >
              {isUploadingFooterLogo ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/38">
            Transparent PNG or SVG recommended for best results. JPG with solid backgrounds will blend into the dark footer.
          </p>
        </div>

        {/* Logo rendering mode */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <label className="mb-3 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">
            Logo Rendering Mode
          </label>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["auto", "dark", "light"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFooterLogoMode(mode)}
                className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-100 ${
                  footerLogoMode === mode
                    ? "bg-accent/[0.12] text-accent"
                    : "text-muted-foreground/40 hover:text-muted-foreground/65"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/38">
            <strong className="font-semibold text-muted-foreground/55">Auto</strong> — no filter applied.{" "}
            <strong className="font-semibold text-muted-foreground/55">Dark</strong> — original colors (logo designed for dark backgrounds).{" "}
            <strong className="font-semibold text-muted-foreground/55">Light</strong> — inverts the logo to white, useful for black logos without transparency.
          </p>
        </div>

        {/* Footer Logo Width */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">Logo Width</label>
            <span className="font-mono text-[12px] text-foreground/55">{footerLogoWidth}px</span>
          </div>
          <input type="range" min={80} max={420} step={10} value={footerLogoWidth} onChange={(e) => setFooterLogoWidth(Number(e.target.value))} className="mt-3 w-full accent-accent" />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/28"><span>80px</span><span>420px</span></div>
        </div>

        {/* Contact Emails */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <label className="mb-3.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">
            Contact Emails
          </label>
          <div className="space-y-4">
            {[
              { label: "Booking",  value: footerBookingEmail,  set: setFooterBookingEmail,  placeholder: "booking@" + artist.handle + ".music" },
              { label: "Contact",  value: footerContactEmail,  set: setFooterContactEmail,  placeholder: "hello@" + artist.handle + ".music"   },
              { label: "Demos",    value: footerDemosEmail,    set: setFooterDemosEmail,    placeholder: "demos@" + artist.handle + ".music"    },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/40">{label}</label>
                <Input type="email" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="text-[13px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">Copyright</label>
          <Input value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} placeholder={`© ${year} ${artist.artistName}`} className="text-[13px]" />
          <p className="mt-2 text-[11px] text-muted-foreground/40">Optional. Defaults to &ldquo;© {year} {artist.artistName}&rdquo;.</p>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {[
            { label: "Show social icons",    value: footerSocialsEnabled,    set: setFooterSocialsEnabled    },
            { label: "Show newsletter form", value: footerNewsletterEnabled, set: setFooterNewsletterEnabled },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-card/30 px-5 py-3.5">
              <span className="text-[13px] text-foreground/75">{label}</span>
              <button type="button" role="switch" aria-checked={value} onClick={() => set(!value)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${value ? "bg-accent" : "bg-secondary/60"}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderBrand() {

    // ─── Local helpers ────────────────────────────────────────────────────────
    const SOURCE_EXTS = new Set(["svg","png","jpg","jpeg","webp","pdf","ai","eps","zip","rar"])
    const PDF_EXTS    = new Set(["pdf"])
    const MAX_BYTES   = 50 * 1024 * 1024
    const MAX_PAGES   = 5
    const VARIANT_MODES: Array<{ mode: "original"|"black"|"white"; label: string }> = [
      { mode: "original", label: "Original" },
      { mode: "black",    label: "Black"    },
      { mode: "white",    label: "White"    },
    ]

    function getExt(name: string) { return name.split(".").pop()?.toLowerCase() ?? "" }
    function extLabel(ext: string): string {
      const m: Record<string,string> = {svg:"SVG",png:"PNG",jpg:"JPG",jpeg:"JPG",webp:"WEBP",pdf:"PDF",ai:"AI",eps:"EPS",zip:"ZIP",rar:"RAR"}
      return m[ext] ?? ext.toUpperCase()
    }
    function extColor(ext: string): string {
      return ["svg","png","jpg","jpeg","webp"].includes(ext)
        ? "border-accent/18 bg-accent/[0.06] text-accent/65"
        : "border-border bg-secondary text-muted-foreground/45"
    }
    function validateFile(file: File): string | null {
      const ext = getExt(file.name)
      if (!SOURCE_EXTS.has(ext)) return `.${ext} is not supported`
      if (file.size > MAX_BYTES) return `Exceeds 50 MB`
      return null
    }
    function formatBytes(n: number | null): string {
      if (!n) return "—"
      if (n < 1024) return `${n} B`
      if (n < 1048576) return `${(n/1024).toFixed(1)} KB`
      return `${(n/1048576).toFixed(1)} MB`
    }
    function formatDate(iso: string): string {
      return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
    }
    function variantLabel(v: string): string {
      return ({ original:"Original", black:"Black", white:"White" } as Record<string,string>)[v] ?? v
    }
    function variantDot(v: string): string {
      return ({
        original: "bg-accent/40",
        black:    "bg-[#111]",
        white:    "bg-white border border-border",
      } as Record<string,string>)[v] ?? "bg-muted-foreground/30"
    }

    // ─── Assignment helpers ──────────────────────────────────────────────────
    const ASSIGN_TYPES = [
      { type: "hero_logo",      label: "Hero Logo" },
      { type: "footer_logo",    label: "Footer Logo" },
      { type: "favicon",        label: "Favicon" },
      { type: "press_kit_logo", label: "Press Kit Logo" },
      { type: "social_avatar",  label: "Social Avatar" },
    ] as const

    function getAssignment(assignmentType: string) {
      return brandAssignments.find((a) => a.assignmentType === assignmentType)
    }

    function getGroupRoles(variants: BrandAsset[]): Array<{ label: string; variant: string }> {
      const roles: Array<{ label: string; variant: string }> = []
      const assetIds = new Set(variants.map((v) => v.id))
      for (const a of brandAssignments) {
        if (!assetIds.has(a.brandAssetId)) continue
        const typeDef = ASSIGN_TYPES.find((t) => t.type === a.assignmentType)
        if (typeDef) roles.push({ label: typeDef.label, variant: a.variant })
      }
      return roles
    }

    async function handleBrandAssign(
      asset: BrandAsset,
      assignmentType: string,
    ) {
      const existing = getAssignment(assignmentType)
      const isAssigned = existing && existing.brandAssetId === asset.id && existing.variant === asset.variant

      if (isAssigned) {
        setBrandAssignments((prev) => prev.filter((a) => a.assignmentType !== assignmentType))
        try {
          await fetch(`/api/artists/brand-assignments?artistId=${encodeURIComponent(artist.id)}&assignmentType=${encodeURIComponent(assignmentType)}`, { method: "DELETE" })
        } catch {
          setBrandAssignments((prev) => [...prev, existing])
        }
      } else {
        const newAssignment: BrandAssignment = {
          id: existing?.id ?? "",
          assignmentType,
          brandAssetId: asset.id,
          variant: asset.variant,
          variantUrl: asset.previewUrl,
        }
        setBrandAssignments((prev) => [
          ...prev.filter((a) => a.assignmentType !== assignmentType),
          newAssignment,
        ])
        try {
          const resp = await fetch("/api/artists/brand-assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              artistId: artist.id,
              assignmentType,
              brandAssetId: asset.id,
              variant: asset.variant,
              variantUrl: asset.previewUrl,
            }),
          })
          if (resp.ok) {
            const { assignment } = await resp.json() as { assignment?: Record<string, unknown> }
            if (assignment) {
              setBrandAssignments((prev) => [
                ...prev.filter((a) => a.assignmentType !== assignmentType),
                {
                  id:             assignment.id              as string,
                  assignmentType: assignment.assignment_type as string,
                  brandAssetId:   assignment.brand_asset_id  as string,
                  variant:        assignment.variant         as string,
                  variantUrl:     assignment.variant_url     as string,
                },
              ])
            }
          }
        } catch {
          setBrandAssignments((prev) => [
            ...prev.filter((a) => a.assignmentType !== assignmentType),
            ...(existing ? [existing] : []),
          ])
        }
      }
    }

    async function handleDownload(url: string, filename: string) {
      try {
        const resp = await fetch(url)
        const blob = await resp.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      } catch {
        window.open(url, "_blank")
      }
    }

    // ─── PDF processing pipeline ──────────────────────────────────────────────
    async function processPdfSourceFile(sourceFile: BrandSourceFile) {
      const fid = sourceFile.id
      setBrandProcessingIds((prev) => new Set([...prev, fid]))
      setBrandProcessingLog((prev) => ({ ...prev, [fid]: { steps: [], done: false } }))

      function addStep(label: string, ok: boolean) {
        setBrandProcessingLog((prev) => {
          const e = prev[fid] ?? { steps: [], done: false }
          return { ...prev, [fid]: { ...e, steps: [...e.steps, { label, ok }] } }
        })
      }
      function setError(msg: string) {
        setBrandProcessingLog((prev) => {
          const e = prev[fid] ?? { steps: [], done: false }
          return { ...prev, [fid]: { ...e, error: msg, done: true } }
        })
      }
      function markDone() {
        setBrandProcessingLog((prev) => {
          const e = prev[fid] ?? { steps: [], done: false }
          return { ...prev, [fid]: { ...e, done: true } }
        })
      }

      const newAssets: BrandAsset[] = []

      try {
        // ── Phase 0: Load renderer ─────────────────────────────────────────────
        addStep("Loading PDF renderer", true)
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const { supabase: client } = await import("@/lib/supabase/client")

        const pdf = await pdfjs.getDocument({ url: sourceFile.fileUrl }).promise
        const totalPages = Math.min(pdf.numPages, MAX_PAGES)
        addStep(`Opened PDF — ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"} detected`, true)

        // ── Phase 1: Render pages at detection scale + collect candidates ──────
        const DETECT_SCALE = 1.8
        const HIRES_SCALE  = 4.5
        type PendingCandidate = {
          canvas:       HTMLCanvasElement
          data:         Uint8ClampedArray
          w:            number
          h:            number
          fgCount:      number
          assetType:    BrandAsset["assetType"]
          hash:         Float32Array
          pageNum:      number
          candidateIdx: number
          isDuplicate:  boolean
          displayName:  string
          // Proportional bounds relative to page (0–1) for hi-res re-crop
          relX: number; relY: number; relW: number; relH: number
        }
        const pending: PendingCandidate[] = []
        let renderedPages = 0

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum)
            const [, , w, h] = page.view
            const scale = Math.min(DETECT_SCALE, 1400 / Math.max(w, h))
            const viewport = page.getViewport({ scale })
            const canvas = document.createElement("canvas")
            canvas.width  = Math.floor(viewport.width)
            canvas.height = Math.floor(viewport.height)
            const ctx = canvas.getContext("2d")!
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            await page.render({ canvas, canvasContext: ctx, viewport }).promise

            // Full-page preview upload
            const pageBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png", 0.88))
            if (pageBlob) {
              const pagePath = `artists/${artist.id}/generated/${Date.now()}-page-${pageNum}.png`
              const { error: pgUp } = await client.storage.from("brand-sources")
                .upload(pagePath, pageBlob, { contentType: "image/png", upsert: true })
              if (!pgUp) {
                const { data: pgUrl } = client.storage.from("brand-sources").getPublicUrl(pagePath)
                const baseName = sourceFile.filename.replace(/\.pdf$/i, "")
                const pgResp = await fetch("/api/artists/brand-create-asset", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    artistId: artist.id, sourceFileId: fid,
                    name: totalPages === 1 ? baseName : `${baseName} — Page ${pageNum}`,
                    assetType: "logo", previewUrl: pgUrl.publicUrl,
                    status: "preview_only", hasSolidBg: true,
                    variant: "original", sourcePage: pageNum,
                  }),
                })
                if (pgResp.ok) {
                  const { asset } = await pgResp.json() as { asset?: Record<string,unknown> }
                  if (asset) {
                    renderedPages++
                    newAssets.push({
                      id: asset.id as string, sourceFileId: asset.source_file_id as string|null,
                      name: asset.name as string|null, assetType: asset.asset_type as BrandAsset["assetType"],
                      status: asset.status as string, previewUrl: asset.preview_url as string,
                      hasSolidBg: asset.has_solid_bg as boolean,
                      variant: (asset.variant as string|undefined) ?? "original",
                      sourcePage: (asset.source_page as number|null|undefined) ?? null,
                      createdAt: asset.created_at as string,
                    })
                    addStep(`Page ${pageNum}: rendered as full-page preview`, true)
                  }
                }
              }
            }

            // Detect logo regions at detection scale
            addStep(`Page ${pageNum}: scanning for logo regions…`, true)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const bounds = detectCandidateBounds(imageData.data, canvas.width, canvas.height)

            if (bounds.length === 0) {
              addStep(`Page ${pageNum}: no distinct logo regions found`, false)
            } else {
              addStep(`Page ${pageNum}: ${bounds.length} region${bounds.length !== 1 ? "s" : ""} detected — analyzing…`, true)
              for (let ci = 0; ci < bounds.length; ci++) {
                const b = bounds[ci]
                // Store proportional bounds for hi-res re-crop
                const relX = b.x / canvas.width, relY = b.y / canvas.height
                const relW = b.w / canvas.width, relH = b.h / canvas.height

                const cropCanvas = document.createElement("canvas")
                cropCanvas.width = b.w; cropCanvas.height = b.h
                const cropCtx = cropCanvas.getContext("2d")!
                cropCtx.drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
                const normCanvas = normalizeCrop(cropCanvas)
                const nw = normCanvas.width, nh = normCanvas.height
                const normCtx = normCanvas.getContext("2d")!
                const normData = normCtx.getImageData(0, 0, nw, nh).data
                let fgCount = 0
                for (let i = 0; i < normData.length; i += 4) {
                  const r = normData[i], g = normData[i+1], bv = normData[i+2], a = normData[i+3]
                  if (a > 30 && !(r > 235 && g > 235 && bv > 235)) fgCount++
                }
                pending.push({
                  canvas: normCanvas, data: normData, w: nw, h: nh,
                  fgCount,
                  assetType: classifyAssetType(nw, nh, fgCount),
                  hash:      shapeHash(normData, nw, nh),
                  pageNum, candidateIdx: ci + 1,
                  isDuplicate: false, displayName: "",
                  relX, relY, relW, relH,
                })
              }
            }
          } catch (pageErr) {
            addStep(`Page ${pageNum}: render failed — ${pageErr instanceof Error ? pageErr.message : "error"}`, false)
          }
        }

        if (renderedPages === 0) {
          setError("No pages could be rendered. The PDF may be encrypted or unsupported.")
          return
        }
        if (pending.length === 0) {
          addStep("No logo regions detected across any page", false)
          markDone()
          if (newAssets.length) setBrandAssets((prev) => [...newAssets, ...prev])
          return
        }

        // ── Phase 2: Deduplicate ───────────────────────────────────────────────
        addStep(`${pending.length} candidate${pending.length !== 1 ? "s" : ""} collected — deduplicating…`, true)
        let dupCount = 0
        for (let i = 0; i < pending.length; i++) {
          if (pending[i].isDuplicate) continue
          for (let j = i + 1; j < pending.length; j++) {
            if (pending[j].isDuplicate) continue
            const a = pending[i], b = pending[j]
            const ratioA = a.w / a.h, ratioB = b.w / b.h
            const ratioDiff = Math.abs(ratioA - ratioB) / Math.max(ratioA, ratioB)
            const dist = shapeHashDist(a.hash, b.hash)
            if (ratioDiff < 0.12 && dist < 8) {
              if (a.fgCount >= b.fgCount) pending[j].isDuplicate = true
              else                         pending[i].isDuplicate = true
              dupCount++
            }
          }
        }
        const survivors = pending.filter((c) => !c.isDuplicate)
        if (dupCount > 0) {
          addStep(`${dupCount} duplicate${dupCount !== 1 ? "s" : ""} removed — ${survivors.length} unique logo${survivors.length !== 1 ? "s" : ""}`, true)
        } else {
          addStep(`All ${survivors.length} candidate${survivors.length !== 1 ? "s" : ""} are unique`, true)
        }

        // ── Phase 3: Classify + name ───────────────────────────────────────────
        const typeCount: Record<string, number> = {}
        const typeIdx:   Record<string, number> = {}
        for (const c of survivors) {
          const t = displayTypeName(c.assetType, c.w, c.h)
          typeCount[t] = (typeCount[t] ?? 0) + 1
        }
        for (const c of survivors) {
          const t = displayTypeName(c.assetType, c.w, c.h)
          typeIdx[t]  = (typeIdx[t] ?? 0) + 1
          c.displayName = typeCount[t] === 1 ? t : `${t} ${typeIdx[t]}`
        }

        // ── Phase 4: Hi-res re-render + generate variants ──────────────────────
        addStep(`Re-rendering ${survivors.length} logo${survivors.length !== 1 ? "s" : ""} at production resolution…`, true)
        let logoCount = 0
        type VariantQA = { name: string; mode: string; medianAlpha: number; rgbPure: boolean }
        const variantQA: VariantQA[] = []

        // Group survivors by page to avoid re-rendering the same page multiple times
        const byPage: Record<number, typeof survivors> = {}
        for (const c of survivors) (byPage[c.pageNum] ??= []).push(c)

        for (const [pageNumStr, pageSurvivors] of Object.entries(byPage)) {
          const pn = Number(pageNumStr)
          let hiresCanvas: HTMLCanvasElement | null = null
          try {
            const page = await pdf.getPage(pn)
            const [, , w, h] = page.view
            const hiScale = Math.min(HIRES_SCALE, 6000 / Math.max(w, h))
            const hiViewport = page.getViewport({ scale: hiScale })
            hiresCanvas = document.createElement("canvas")
            hiresCanvas.width  = Math.floor(hiViewport.width)
            hiresCanvas.height = Math.floor(hiViewport.height)
            const hiCtx = hiresCanvas.getContext("2d")!
            hiCtx.fillStyle = "#ffffff"
            hiCtx.fillRect(0, 0, hiresCanvas.width, hiresCanvas.height)
            await page.render({ canvas: hiresCanvas, canvasContext: hiCtx, viewport: hiViewport }).promise
            addStep(`Page ${pn}: re-rendered at ${hiresCanvas.width}×${hiresCanvas.height}`, true)
          } catch {
            addStep(`Page ${pn}: hi-res render failed — using detection-scale crops`, false)
          }

          for (const c of pageSurvivors) {
            // Get hi-res crop using proportional bounds
            let prodCanvas: HTMLCanvasElement
            if (hiresCanvas) {
              const hx = Math.round(c.relX * hiresCanvas.width)
              const hy = Math.round(c.relY * hiresCanvas.height)
              const hw = Math.round(c.relW * hiresCanvas.width)
              const hh = Math.round(c.relH * hiresCanvas.height)
              const hiCrop = document.createElement("canvas")
              hiCrop.width = hw; hiCrop.height = hh
              const hiCropCtx = hiCrop.getContext("2d")!
              hiCropCtx.drawImage(hiresCanvas, hx, hy, hw, hh, 0, 0, hw, hh)
              prodCanvas = normalizeCrop(hiCrop)
            } else {
              prodCanvas = c.canvas
            }

            let uploaded = 0
            for (const { mode } of VARIANT_MODES) {
              try {
                const varCanvas = recolorToVariant(prodCanvas, mode)

                // Pixel-level validation for white and black
                if (mode === "white" || mode === "black") {
                  const vCtx = varCanvas.getContext("2d")!
                  const vd = vCtx.getImageData(0, 0, varCanvas.width, varCanvas.height).data
                  const bodyAlphas: number[] = []
                  let pureCount = 0, bodyCount = 0
                  const tR = mode === "white" ? 255 : 0
                  const tG = mode === "white" ? 255 : 0
                  const tB = mode === "white" ? 255 : 0
                  for (let vi = 0; vi < vd.length; vi += 4) {
                    const a = vd[vi + 3]
                    if (a < 20) continue
                    if (a >= 200) {
                      bodyCount++
                      bodyAlphas.push(a)
                      if (vd[vi] === tR && vd[vi + 1] === tG && vd[vi + 2] === tB) pureCount++
                    }
                  }
                  if (bodyAlphas.length > 0) {
                    bodyAlphas.sort((x, y) => x - y)
                    variantQA.push({
                      name: c.displayName,
                      mode,
                      medianAlpha: bodyAlphas[Math.floor(bodyAlphas.length / 2)],
                      rgbPure: bodyCount > 0 && pureCount / bodyCount >= 0.95,
                    })
                  }
                }

                const blob = await new Promise<Blob | null>(res => varCanvas.toBlob(res, "image/png", 0.95))
                if (!blob) continue
                const filePath = `artists/${artist.id}/generated/${Date.now()}-${c.assetType}-p${c.pageNum}-c${c.candidateIdx}-${mode}.png`
                const { error: upErr } = await client.storage.from("brand-sources")
                  .upload(filePath, blob, { contentType: "image/png", upsert: true })
                if (upErr) continue
                const { data: fUrl } = client.storage.from("brand-sources").getPublicUrl(filePath)
                const resp = await fetch("/api/artists/brand-create-asset", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    artistId: artist.id, sourceFileId: fid,
                    name: c.displayName,
                    assetType: c.assetType,
                    previewUrl: fUrl.publicUrl,
                    status: "logo_candidate",
                    hasSolidBg: false,
                    variant: mode,
                    sourcePage: c.pageNum,
                  }),
                })
                if (!resp.ok) continue
                const { asset } = await resp.json() as { asset?: Record<string,unknown> }
                if (asset) {
                  uploaded++
                  newAssets.push({
                    id: asset.id as string, sourceFileId: asset.source_file_id as string|null,
                    name: asset.name as string|null, assetType: asset.asset_type as BrandAsset["assetType"],
                    status: asset.status as string, previewUrl: asset.preview_url as string,
                    hasSolidBg: asset.has_solid_bg as boolean,
                    variant: (asset.variant as string|undefined) ?? mode,
                    sourcePage: (asset.source_page as number|null|undefined) ?? c.pageNum,
                    createdAt: asset.created_at as string,
                  })
                }
              } catch { /* skip failed variant */ }
            }
            if (uploaded > 0) {
              const hiW = prodCanvas.width
              logoCount++
              addStep(`${c.displayName}: ${uploaded} variant${uploaded !== 1 ? "s" : ""} saved (${hiW}px wide)`, true)
            } else {
              addStep(`${c.displayName}: upload failed`, false)
            }
          }
        }

        // ── Phase 5: Pixel-level variant validation ─────────────────────────────
        if (variantQA.length > 0) {
          let allPassed = true
          // Per-variant RGB purity + alpha checks
          for (const q of variantQA) {
            if (!q.rgbPure) {
              addStep(`${q.name} (${q.mode}): variant quality warning — RGB not pure`, false)
              allPassed = false
            }
            if (q.medianAlpha < 245) {
              addStep(`${q.name} (${q.mode}): variant quality warning — median body alpha ${q.medianAlpha} (expected 245+)`, false)
              allPassed = false
            }
          }
          // Cross-variant consistency for white
          const whiteStats = variantQA.filter((q) => q.mode === "white")
          if (whiteStats.length >= 2) {
            const maxMedian = Math.max(...whiteStats.map((s) => s.medianAlpha))
            for (const s of whiteStats) {
              if (s.medianAlpha < maxMedian * 0.85) {
                addStep(`${s.name}: white variant density warning — median alpha ${s.medianAlpha} vs best ${maxMedian}`, false)
                allPassed = false
              }
            }
          }
          // Cross-variant consistency for black
          const blackStats = variantQA.filter((q) => q.mode === "black")
          if (blackStats.length >= 2) {
            const maxMedian = Math.max(...blackStats.map((s) => s.medianAlpha))
            for (const s of blackStats) {
              if (s.medianAlpha < maxMedian * 0.85) {
                addStep(`${s.name}: black variant density warning — median alpha ${s.medianAlpha} vs best ${maxMedian}`, false)
                allPassed = false
              }
            }
          }
          if (allPassed) {
            addStep(`Variant quality check passed — all body pixels pure, median alpha 245+`, true)
          }
        }

        addStep(
          `${renderedPages} page render${renderedPages !== 1 ? "s" : ""} + ${logoCount} logo${logoCount !== 1 ? "s" : ""} (${logoCount * 3} variants) generated`,
          true,
        )
        markDone()
        if (newAssets.length) setBrandAssets((prev) => [...newAssets, ...prev])

      } catch (err) {
        setError(`Processing failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setBrandProcessingIds((prev) => { const n = new Set(prev); n.delete(fid); return n })
      }
    }

    // ─── Upload handler ───────────────────────────────────────────────────────
    async function uploadSourceFiles(files: File[]) {
      const queue = files.map((f) => ({ file: f, status: "pending" as const, error: undefined as string|undefined }))
      setBrandUploadQueue(queue)
      setBrandUploading(true)
      const newSF: BrandSourceFile[] = []

      for (let i = 0; i < queue.length; i++) {
        const { file } = queue[i]
        const err = validateFile(file)
        if (err) {
          setBrandUploadQueue((prev) => { const c=[...prev]; c[i]={...c[i],status:"error",error:err}; return c })
          continue
        }
        setBrandUploadQueue((prev) => { const c=[...prev]; c[i]={...c[i],status:"uploading"}; return c })
        const ext = getExt(file.name)
        try {
          const params = new URLSearchParams({ artistId: artist.id, fileExt: ext, filename: file.name })
          const sResp = await fetch(`/api/artists/brand-upload?${params}`)
          const signed = await sResp.json() as { signedUrl?:string; token?:string; filePath?:string; contentType?:string; error?:string }
          if (!sResp.ok || !signed.signedUrl || !signed.token || !signed.filePath) throw new Error(signed.error ?? "Upload URL failed")
          const { supabase: client } = await import("@/lib/supabase/client")
          const { error: upErr } = await client.storage.from("brand-sources").uploadToSignedUrl(
            signed.filePath, signed.token, file, { contentType: signed.contentType ?? file.type ?? "application/octet-stream" }
          )
          if (upErr) throw new Error(upErr.message)
          const { data: urlData } = client.storage.from("brand-sources").getPublicUrl(signed.filePath)
          const regResp = await fetch("/api/artists/brand-assets", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId: artist.id, filename: file.name, fileType: file.type||`application/${ext}`, fileExt: ext, fileUrl: urlData.publicUrl, fileSize: file.size }),
          })
          const reg = await regResp.json() as { sourceFile?: Record<string,unknown>; error?: string }
          if (!regResp.ok) throw new Error(reg.error ?? "Registration failed")
          if (reg.sourceFile) {
            const f = reg.sourceFile
            const sf: BrandSourceFile = {
              id: f.id as string, filename: f.filename as string, fileType: f.file_type as string,
              fileExt: f.file_ext as string, fileUrl: f.file_url as string,
              fileSize: f.file_size as number|null, status: f.status as BrandSourceFile["status"], createdAt: f.created_at as string,
            }
            newSF.push(sf)
            if (PDF_EXTS.has(ext)) setTimeout(() => processPdfSourceFile(sf), 100)
          }
          setBrandUploadQueue((prev) => { const c=[...prev]; c[i]={...c[i],status:"done"}; return c })
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed"
          setBrandUploadQueue((prev) => { const c=[...prev]; c[i]={...c[i],status:"error",error:msg}; return c })
        }
      }
      if (newSF.length) setBrandSourceFiles((prev) => [...newSF, ...prev])
      setBrandUploading(false)
    }

    async function deleteSourceFile(id: string) {
      await fetch(`/api/artists/brand-assets?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      setBrandSourceFiles((prev) => prev.filter((f) => f.id !== id))
      setBrandAssets((prev) => prev.filter((a) => a.sourceFileId !== id))
    }
    async function deleteAsset(id: string) {
      await fetch(`/api/artists/brand-assets?id=${encodeURIComponent(id)}&type=asset`, { method: "DELETE" })
      setBrandAssets((prev) => prev.filter((a) => a.id !== id))
    }

    function onDragOver(e: React.DragEvent) { e.preventDefault(); setBrandDragActive(true) }
    function onDragLeave() { setBrandDragActive(false) }
    function onDrop(e: React.DragEvent) {
      e.preventDefault(); setBrandDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) { setBrandUploadQueue([]); uploadSourceFiles(files) }
    }
    function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
      const files = Array.from(e.target.files ?? [])
      if (files.length) { setBrandUploadQueue([]); uploadSourceFiles(files) }
      e.target.value = ""
    }

    // ─── Derived state ────────────────────────────────────────────────────────
    const pageRenders    = brandAssets.filter((a) => a.status === "preview_only")
    const logoCandidates = brandAssets.filter((a) => a.status === "logo_candidate")
    const hasAssets      = logoCandidates.length > 0

    // Group all variants by name (all 3 variants of the same logo share a name)
    const byName: Record<string, BrandAsset[]> = {}
    for (const a of logoCandidates) (byName[a.name ?? "Untitled"] ??= []).push(a)
    const VARIANT_ORDER = ["original", "black", "white"]
    for (const key of Object.keys(byName)) {
      byName[key].sort((a, b) =>
        (VARIANT_ORDER.indexOf(a.variant) + 1 || 99) - (VARIANT_ORDER.indexOf(b.variant) + 1 || 99),
      )
    }
    // Build display instances with semantic names
    const typeCounts: Record<string, number> = {}
    for (const name of Object.keys(byName)) typeCounts[assetGroupKey(name)] = (typeCounts[assetGroupKey(name)] ?? 0) + 1
    const typeSeq: Record<string, number> = {}
    const allInstances: Array<{ displayName: string; cardKey: string; variants: BrandAsset[] }> = []
    for (const [name, variants] of Object.entries(byName)) {
      const typeKey = assetGroupKey(name)
      typeSeq[typeKey] = (typeSeq[typeKey] ?? 0) + 1
      const displayName = typeCounts[typeKey] === 1 ? typeKey : `${typeKey} ${String.fromCharCode(64 + typeSeq[typeKey])}`
      allInstances.push({ displayName, cardKey: name, variants })
    }
    const logoCount    = allInstances.length
    const variantCount = logoCandidates.length
    const isProcessing = brandProcessingIds.size > 0
    const drawerName     = brandDrawerAsset
    const drawerInstance = drawerName ? byName[drawerName] : null

    function toggleCollapse(key: string) {
      setBrandCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const CHECKER = "repeating-conic-gradient(#e4e4e4 0% 25%, #f0f0f0 0% 50%) 0 0 / 12px 12px"

    // Selected variant per card for preview switching
    function getSelectedVariant(cardKey: string, variants: BrandAsset[]): BrandAsset {
      const selId = brandSelectedVariants[cardKey]
      return (selId ? variants.find((v) => v.id === selId) : undefined) ?? variants.find((v) => v.variant === "original") ?? variants[0]
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
      <div className="space-y-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Brand Kit</h2>
          {hasAssets ? (
            <p className="mt-1.5 text-[12px] text-muted-foreground/40">
              {logoCount} logo{logoCount !== 1 ? "s" : ""} · {variantCount} variant{variantCount !== 1 ? "s" : ""} · {brandSourceFiles.length} source{brandSourceFiles.length !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-muted-foreground/40">Upload brand files to generate production-ready logo variants.</p>
          )}
        </div>

        {/* ── Assignment overview ──────────────────────────────────────── */}
        {hasAssets && (
          <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ASSIGN_TYPES.map(({ type, label }) => {
              const a = getAssignment(type)
              const shortLabel = label.replace(" Logo", "")
              if (!a) return (
                <div key={type} className="flex flex-col items-center gap-2 rounded-xl bg-secondary/20 px-3 py-4 text-center">
                  <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-secondary/40">
                    <span className="text-[10px] text-muted-foreground/18">—</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/25">{shortLabel}</span>
                </div>
              )
              return (
                <div key={type} className="flex flex-col items-center gap-2 rounded-xl bg-accent/[0.04] ring-1 ring-accent/10 px-3 py-4 text-center">
                  <div className="flex h-10 w-14 items-center justify-center rounded-lg p-1"
                    style={{ background: a.variant === "white" ? "#0e0e0e" : a.variant === "black" ? "#f5f5f5" : CHECKER }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.variantUrl} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  <span className="text-[10px] text-accent/50">{shortLabel}</span>
                </div>
              )
            })}
          </section>
        )}

        {/* ── Processing ──────────────────────────────────────────────── */}
        {isProcessing && (
          <div className="flex items-center gap-3 rounded-xl bg-accent/[0.04] px-5 py-3.5">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
            <span className="text-[13px] text-accent/65">Extracting logos and generating variants…</span>
          </div>
        )}

        {/* ── Logo cards ──────────────────────────────────────────────── */}
        {hasAssets && (
          <section>
            <div className="grid gap-5 sm:grid-cols-2">
              {allInstances.map(({ displayName, cardKey, variants }) => {
                const selected = getSelectedVariant(cardKey, variants)
                const roles = getGroupRoles(variants)
                return (
                  <div key={cardKey} className="overflow-hidden rounded-2xl bg-card">
                    {/* Preview */}
                    <div className="flex h-40 items-center justify-center p-8"
                      style={{ background: selected.variant === "white" ? "#0e0e0e" : CHECKER }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="px-5 pt-4 pb-5 space-y-4">
                      {/* Name + assignments */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[15px] font-semibold text-foreground/80">{displayName}</p>
                          <button type="button" onClick={() => setBrandDrawerAsset(cardKey)}
                            className="shrink-0 text-[10px] text-muted-foreground/25 hover:text-foreground/50">Details</button>
                        </div>
                        {roles.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {roles.map((r, ri) => (
                              <span key={ri} className="flex items-center gap-1 text-[10px] text-accent/50">
                                <Check className="h-2.5 w-2.5" />
                                {r.label.replace(" Logo", "")}
                                <span className="text-muted-foreground/20">({variantLabel(r.variant)})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Variant selector */}
                      <div className="flex items-center gap-0.5 rounded-lg bg-secondary/30 p-0.5">
                        {variants.map((v) => (
                          <button key={v.id} type="button"
                            onClick={() => setBrandSelectedVariants((prev) => ({ ...prev, [cardKey]: v.id }))}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                              v.id === selected.id
                                ? "bg-background text-foreground/70 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                                : "text-muted-foreground/30 hover:text-foreground/50"
                            }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${variantDot(v.variant)}`} />
                            {variantLabel(v.variant)}
                          </button>
                        ))}
                      </div>
                      {/* Direct assignment buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {ASSIGN_TYPES.map(({ type, label }) => {
                          const existing = getAssignment(type)
                          const isThis = existing?.brandAssetId === selected.id && existing?.variant === selected.variant
                          return (
                            <button key={type} type="button"
                              onClick={() => handleBrandAssign(selected, type)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                                isThis
                                  ? "bg-accent/[0.08] text-accent/60 ring-1 ring-accent/15"
                                  : "bg-secondary/40 text-muted-foreground/30 hover:bg-secondary/70 hover:text-foreground/50"
                              }`}>
                              {isThis && <Check className="h-2.5 w-2.5" />}
                              {label.replace(" Logo", "")}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── No logos ────────────────────────────────────────────────── */}
        {pageRenders.length > 0 && logoCandidates.length === 0 && !isProcessing && (
          <div className="rounded-2xl bg-card/50 px-8 py-8 text-center">
            <p className="text-[14px] font-semibold text-foreground/40">No individual logos detected</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground/30">
              Upload individual SVG or PNG logo files directly.
            </p>
          </div>
        )}

        {/* ── Upload ──────────────────────────────────────────────────── */}
        <section className="space-y-2">
          {hasAssets ? (
            <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              className={`flex items-center gap-4 rounded-xl px-5 py-3 transition-colors ${brandDragActive ? "bg-accent/[0.04] ring-1 ring-accent/25" : "bg-secondary/25 hover:bg-secondary/40"}`}>
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground/25" />
              <span className="flex-1 text-[12px] text-foreground/40">{brandDragActive ? "Drop to upload" : "Upload more files"}</span>
              <label className={`cursor-pointer rounded-lg bg-secondary/60 px-4 py-1.5 text-[11px] font-semibold text-foreground/50 hover:text-foreground/70 ${brandUploading ? "pointer-events-none opacity-50" : ""}`}>
                {brandUploading ? "Uploading…" : "Browse"}
                <input type="file" multiple accept=".ai,.eps,.pdf,.zip,.rar,.svg,.png,.jpg,.jpeg,.webp" onChange={onFileInput} className="sr-only" />
              </label>
            </div>
          ) : (
            <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-colors ${brandDragActive ? "border-accent/40 bg-accent/[0.04]" : "border-border/40 bg-card/25 hover:border-accent/15"}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/40">
                <Sparkles className={`h-6 w-6 ${brandDragActive ? "text-accent" : "text-muted-foreground/18"}`} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground/55">{brandDragActive ? "Drop to upload" : "Drop brand files here"}</p>
                <p className="mt-1 text-[12px] text-muted-foreground/30">Logos are detected, classified, and output as transparent PNGs</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {["PDF","AI","EPS","SVG","PNG","JPG"].map((f) => (
                  <span key={f} className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${f==="PDF" ? "border-accent/12 bg-accent/[0.03] text-accent/40" : "border-border/40 bg-secondary/30 text-muted-foreground/20"}`}>{f}</span>
                ))}
              </div>
              <label className={`cursor-pointer rounded-lg border border-border bg-secondary px-5 py-2 text-[12px] font-semibold text-foreground/50 hover:text-foreground/70 ${brandUploading ? "pointer-events-none opacity-50" : ""}`}>
                {brandUploading ? "Uploading…" : "Choose files"}
                <input type="file" multiple accept=".ai,.eps,.pdf,.zip,.rar,.svg,.png,.jpg,.jpeg,.webp" onChange={onFileInput} className="sr-only" />
              </label>
            </div>
          )}
          {brandUploadQueue.length > 0 && (
            <div className="rounded-xl bg-card/40 p-3">
              <div className="space-y-1">
                {brandUploadQueue.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`shrink-0 rounded border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${extColor(getExt(item.file.name))}`}>{extLabel(getExt(item.file.name))}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/50">{item.file.name}</span>
                    <span className="shrink-0 text-[10px]">
                      {item.status==="uploading"&&<span className="text-accent/50">Uploading…</span>}
                      {item.status==="done"     &&<span className="text-accent/60">✓</span>}
                      {item.status==="error"    &&<span className="text-red-500/50" title={item.error}>Failed</span>}
                      {item.status==="pending"  &&<span className="text-muted-foreground/18">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brandLoadStatus === "loading" && <p className="text-[12px] text-muted-foreground/22">Loading…</p>}
          {!hasAssets && brandLoadStatus === "loaded" && brandSourceFiles.length === 0 && (
            <p className="py-2 text-center text-[12px] text-muted-foreground/22">No brand sources uploaded yet.</p>
          )}
        </section>

        {/* ── Sources (collapsed) ─────────────────────────────────────── */}
        {brandSourceFiles.length > 0 && (
          <section>
            <button type="button" onClick={() => toggleCollapse("sources")}
              className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left hover:bg-secondary/20">
              <span className="text-[11px] text-muted-foreground/30">Sources ({brandSourceFiles.length})</span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground/18 transition-transform ${brandCollapsed["sources"] !== true ? "-rotate-90" : ""}`} />
            </button>
            {brandCollapsed["sources"] === true && (
              <div className="mt-1 space-y-0.5">
                {brandSourceFiles.map((f) => {
                  const isPrx = brandProcessingIds.has(f.id)
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-secondary/25">
                      <span className={`shrink-0 rounded border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${extColor(f.fileExt)}`}>{extLabel(f.fileExt)}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/45">{f.filename}</span>
                      {isPrx && <span className="shrink-0 animate-pulse text-[10px] text-accent/45">Processing…</span>}
                      {!isPrx && PDF_EXTS.has(f.fileExt) && (
                        <button type="button" onClick={() => processPdfSourceFile(f)} className="shrink-0 text-[10px] text-accent/40 hover:text-accent/70">Regenerate variants</button>
                      )}
                      <button type="button" onClick={() => deleteSourceFile(f.id)} className="shrink-0 text-[10px] text-muted-foreground/14 hover:text-destructive/45">Remove</button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Advanced (collapsed) ────────────────────────────────────── */}
        {(Object.keys(brandProcessingLog).length > 0 || pageRenders.length > 0) && (
          <section>
            <button type="button" onClick={() => toggleCollapse("advanced")}
              className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left hover:bg-secondary/20">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/25">Advanced</span>
                {isProcessing && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
              </div>
              <ChevronDown className={`h-3 w-3 text-muted-foreground/18 transition-transform ${brandCollapsed["advanced"] !== true ? "-rotate-90" : ""}`} />
            </button>
            {(brandCollapsed["advanced"] === true || isProcessing) && (
              <div className="mt-2 space-y-5">
                {Object.keys(brandProcessingLog).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/22">Processing History</p>
                    {Object.entries(brandProcessingLog).map(([fileId, log]) => {
                      const file = brandSourceFiles.find((f) => f.id === fileId)
                      const isActive = brandProcessingIds.has(fileId)
                      return (
                        <div key={fileId} className="rounded-lg bg-card/35 p-3">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-foreground/40">{file?.filename ?? "Unknown"}</p>
                              {isActive  && <span className="flex items-center gap-1 text-[9px] text-accent/45"><span className="h-1 w-1 animate-pulse rounded-full bg-accent" /> Active</span>}
                              {!isActive && log.done && !log.error && <span className="text-[9px] text-accent/40">Done</span>}
                              {!isActive && log.error && <span className="text-[9px] text-red-500/40">Failed</span>}
                            </div>
                            <button type="button" onClick={() => setBrandProcessingLog((prev) => { const n={...prev}; delete n[fileId]; return n })} className="text-[9px] text-muted-foreground/14 hover:text-muted-foreground/35">Dismiss</button>
                          </div>
                          <div className="space-y-0.5">
                            {log.steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                                <span className={`mt-px shrink-0 ${step.ok ? "text-accent/35" : "text-muted-foreground/18"}`}>{step.ok ? "✓" : "·"}</span>
                                <span className={step.ok ? "text-foreground/30" : "text-muted-foreground/18"}>{step.label}</span>
                              </div>
                            ))}
                            {isActive && <div className="text-[10px] text-muted-foreground/14 animate-pulse">···</div>}
                          </div>
                          {log.error && <p className="mt-1 text-[10px] text-red-500/35">{log.error}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
                {pageRenders.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/22">Source Pages</p>
                    <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                      {pageRenders.map((asset) => (
                        <div key={asset.id} className="group overflow-hidden rounded-lg bg-card/25">
                          <div className="flex h-20 items-center justify-center bg-white p-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex items-center justify-between px-2 py-1">
                            <p className="truncate text-[8px] text-foreground/22">{asset.name ?? "Page"}</p>
                            <button type="button" onClick={() => deleteAsset(asset.id)} className="shrink-0 text-[8px] text-muted-foreground/10 opacity-0 group-hover:opacity-100 hover:text-destructive/40">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Drawer ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {drawerName && drawerInstance && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/18 backdrop-blur-[2px]"
                onClick={() => setBrandDrawerAsset(null)} />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col bg-background shadow-2xl">
                <div className="flex items-center justify-between px-7 py-5">
                  <div>
                    <p className="text-[16px] font-semibold tracking-tight text-foreground">{(() => {
                      const inst = allInstances.find((i) => i.cardKey === drawerName)
                      return inst?.displayName ?? drawerName
                    })()}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/35">{drawerInstance.length} variant{drawerInstance.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button type="button" onClick={() => setBrandDrawerAsset(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                    <X className="h-4 w-4 text-muted-foreground/35" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-8 px-7 pb-6">
                    {drawerInstance.map((asset) => (
                      <div key={asset.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-border/10 ${variantDot(asset.variant)}`} />
                            <span className="text-[13px] font-semibold text-foreground/65">{variantLabel(asset.variant)}</span>
                          </div>
                          <button type="button"
                            onClick={() => handleDownload(
                              asset.previewUrl,
                              `${(() => { const inst = allInstances.find((i) => i.cardKey === drawerName); return inst?.displayName ?? drawerName })()}-${variantLabel(asset.variant)}.png`,
                            )}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-accent/50 hover:bg-accent/[0.05] hover:text-accent/75">
                            <Download className="h-3 w-3" /> PNG
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex h-28 items-center justify-center rounded-xl p-5"
                            style={{ background: asset.variant === "white" ? "#0a0a0a" : CHECKER }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex h-28 items-center justify-center rounded-xl p-5"
                            style={{ background: asset.variant === "white" ? CHECKER : "#0a0a0a" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          {ASSIGN_TYPES.map(({ type, label }) => {
                            const existing = getAssignment(type)
                            const isThis = existing?.brandAssetId === asset.id && existing?.variant === asset.variant
                            const isOtherVariant = existing?.brandAssetId === asset.id && existing?.variant !== asset.variant
                            return (
                              <button key={type} type="button"
                                onClick={() => handleBrandAssign(asset, type)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] transition-colors ${
                                  isThis
                                    ? "bg-accent/[0.07] ring-1 ring-accent/20"
                                    : "hover:bg-secondary/40"
                                }`}>
                                <span className={isThis ? "font-medium text-accent/65" : "text-foreground/40"}>{label}</span>
                                {isThis ? (
                                  <span className="flex items-center gap-1 text-accent/55">
                                    Assigned <Check className="h-3 w-3" />
                                  </span>
                                ) : isOtherVariant ? (
                                  <span className="text-[10px] text-muted-foreground/25">
                                    {variantLabel(existing!.variant)} assigned
                                  </span>
                                ) : existing ? (
                                  <span className="text-[10px] text-muted-foreground/20">Replace</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/20">Assign</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/40 px-7 py-5">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/22">Details</p>
                    <div className="space-y-1.5">
                      {drawerInstance[0]?.sourcePage != null && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground/30">Source page</span>
                          <span className="text-foreground/45">Page {drawerInstance[0].sourcePage}</span>
                        </div>
                      )}
                      {drawerInstance[0]?.sourceFileId && (() => {
                        const sf = brandSourceFiles.find((f) => f.id === drawerInstance[0].sourceFileId)
                        return sf ? (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground/30">Source</span>
                            <span className="truncate max-w-[180px] text-foreground/45">{sf.filename}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div className="border-t border-border/40 px-7 py-5">
                    <button type="button"
                      onClick={() => { drawerInstance.forEach((a) => deleteAsset(a.id)); setBrandDrawerAsset(null) }}
                      className="flex items-center gap-2 text-[11px] text-destructive/30 hover:text-destructive/55">
                      <Trash2 className="h-3.5 w-3.5" /> Remove all variants
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    )
  }

  function renderHero() {
    const previewName = artistName.trim() || artist.artistName
    const isFloating = heroLogoPlacement !== "editorial"
    const previewLogoWidth = `min(80vw, ${Math.min(heroLogoScale * 3, 720)}px)`
    const previewContentWidthClass = heroContentWidth === "compact" ? "max-w-2xl" : heroContentWidth === "wide" ? "max-w-5xl" : "max-w-4xl"
    const previewTheme = getAccentTheme(accentTheme)
    const previewHasFloatingLogo = isFloating && !!(heroLogoUrl || null) && artist.plan === "pro" &&
      (heroIdentityMode === "logo" || heroIdentityMode === "both")
    const previewFloatingTransform = heroLogoPlacement === "top_center"
      ? `translate(calc(-50% + ${heroLogoOffsetX}px), ${heroLogoOffsetY}px)`
      : `translate(calc(-50% + ${heroLogoOffsetX}px), calc(-50% + ${heroLogoOffsetY}px))`
    const isPro = artist.plan === "pro"
    const togglePanel = (id: "content"|"branding"|"media"|"appearance") =>
      setOpenHeroPanel(prev => prev === id ? null : id)

    return (
      <div className="space-y-5">
        <HqPageHeader title="Hero" description="Configure the hero section of your public profile — image, identity, copy and style." />

        {/* ── Preset strip ── */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-1.5">
          <p className="shrink-0 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/35">Layout</p>
          <div className="flex flex-1 items-center gap-0.5">
            {HERO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={!isPro}
                onClick={() => {
                  if (!isPro) return
                  setHeroIdentityMode(preset.heroIdentityMode)
                  setHeroLogoPlacement(preset.heroLogoPlacement)
                  setHeroLogoLayout(preset.heroLogoLayout)
                  setHeroLogoAlignment(preset.heroLogoAlignment)
                  setHeroLogoScale(preset.heroLogoScale)
                  setHeroLogoOffsetX(preset.heroLogoOffsetX)
                  setHeroLogoOffsetY(preset.heroLogoOffsetY)
                  setHeroLogoStyle(preset.heroLogoStyle)
                }}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-center transition-colors duration-100",
                  "text-muted-foreground/45 hover:bg-background/25 hover:text-muted-foreground/70",
                  !isPro && "pointer-events-none opacity-40"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {!isPro && <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/28">Pro</span>}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">

          {/* LEFT: Preview (sticky) */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-2xl border border-border bg-[#080808]">
              <div ref={previewContainerRef} className="relative aspect-[16/5] overflow-hidden">
                <div style={{ position:"absolute",bottom:0,left:0,width:PREVIEW_NATURAL_W,height:PREVIEW_NATURAL_H,transform:`scale(${previewScale})`,transformOrigin:"bottom left","--accent":previewTheme.accent,"--accent-foreground":previewTheme.accentForeground } as React.CSSProperties}>
                  {heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroImageUrl} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:`${heroImageX}% ${heroImageY}%`,transform:heroImageZoom>100?`scale(${heroImageZoom/100})`:undefined,transformOrigin:"center"}} />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_30%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.32),_hsl(var(--background)/0.04)_28%,_hsl(var(--background)/0.52)_66%,_hsl(var(--background)/0.98))]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_transparent_18%,_hsl(var(--background)/0.24)_55%,_hsl(var(--background)/0.72)_100%)]" />
                  <div className="absolute inset-y-0 left-0 w-3/4 bg-[linear-gradient(92deg,_hsl(var(--background)/0.42),_transparent_72%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_90%,_hsl(var(--accent)/0.10),_transparent_38%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_hsl(var(--background)/0.30)_100%)]" />
                  {previewHasFloatingLogo && (
                    <div className="pointer-events-none absolute" style={{top:heroLogoPlacement==="top_center"?"18%":"50%",left:"50%",transform:previewFloatingTransform}}>
                      <HeroLogoElement logoUrl={heroLogoUrl} artistName={previewName} logoWidth={previewLogoWidth} heroLogoStyle={heroLogoStyle} heroLogoReadability={heroLogoReadability} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(78%,460px)] bg-[linear-gradient(0deg,_hsl(var(--background)/0.95)_0%,_hsl(var(--background)/0.62)_38%,_hsl(var(--background)/0.10)_72%,_transparent_100%)]" />
                    <div className={cn("relative",heroContentSurface==="soft"&&"rounded-[1.5rem] border border-border bg-black/[0.10] px-4 py-3 backdrop-blur-[1px] [box-shadow:inset_0_0_40px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4",heroContentSurface==="strong"&&"rounded-[1.5rem] border border-border bg-black/[0.18] px-4 py-3 backdrop-blur-[2px] [box-shadow:inset_0_0_40px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4")}>
                      {heroContentSurface!=="none"&&<div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-b from-black/[0.04] to-transparent" />}
                      {genres.split(",").map((g)=>g.trim()).filter(Boolean).length>0&&(
                        <div className="mb-3.5 flex flex-wrap gap-2 sm:mb-4">
                          {genres.split(",").map((g)=>g.trim()).filter(Boolean).map((genre)=>(
                            <span key={genre} className="rounded-full border border-accent/70 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm" style={{boxShadow:"0 0 16px color-mix(in srgb, var(--accent) 12%, transparent)"}}>{genre}</span>
                          ))}
                        </div>
                      )}
                      {!isFloating&&(
                        <HeroIdentity artistName={previewName} heroLogoUrl={isPro?(heroLogoUrl||null):null} heroIdentityMode={heroIdentityMode} heroTextStyle={heroTextStyle} heroLogoScale={heroLogoScale} heroLogoLayout={heroLogoLayout} heroLogoAlignment={heroLogoAlignment} heroLogoOffsetX={heroLogoOffsetX} heroLogoOffsetY={heroLogoOffsetY} heroLogoStyle={heroLogoStyle} heroLogoReadability={heroLogoReadability} isPro={isPro} isPreview />
                      )}
                      <div className={cn("relative",previewContentWidthClass)}>
                        {location&&<p className="mt-2.5 flex items-center gap-2 text-sm text-white/65 sm:mt-3"><MapPin className="h-3.5 w-3.5 shrink-0 text-accent/80 sm:h-4 sm:w-4" />{location}</p>}
                        {heroTagline&&<p className="mt-1 text-base font-medium uppercase tracking-[0.07em] text-accent/90 sm:mt-1.5 sm:text-lg" style={{textShadow:`0 0 10px rgba(${previewTheme.glowRgb}, 0.15)`}}>{heroTagline}</p>}
                        {shortBio&&<p className="mt-2 max-w-[700px] text-sm leading-relaxed text-white/80 sm:mt-2.5 sm:text-base">{shortBio}</p>}
                        {bookingEmail&&<div className="mt-4 flex flex-col gap-3 sm:mt-5"><div className="flex h-11 w-fit items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-md shadow-accent/15 sm:h-12"><Mail className="h-4 w-4" />Book this artist</div></div>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute right-2 top-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/40">Preview</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Accordion panels */}
          <div className="space-y-1.5">

            {/* Content */}
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <button type="button" onClick={() => togglePanel("content")} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-100 hover:bg-white/[0.015]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">Content</span>
                <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/35 transition-transform duration-150", openHeroPanel === "content" && "rotate-180")} />
              </button>
              {openHeroPanel === "content" && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="heroTagline" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Tagline</label>
                      <span className={cn("text-[10px] tabular-nums transition-colors duration-150", heroTagline.length > 90 ? "text-amber-400/60" : "text-muted-foreground/30")}>{heroTagline.length}/100</span>
                    </div>
                    <Input id="heroTagline" value={heroTagline} maxLength={100} placeholder="Peak-time house music for underground dance floors." onChange={(e) => setHeroTagline(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground/38">Rendered above the bio in accent color. Leave blank to omit.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Branding */}
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <button type="button" onClick={() => togglePanel("branding")} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-100 hover:bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">Branding</span>
                  {!isPro && <span className="rounded border border-border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/28">Pro</span>}
                </div>
                <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/35 transition-transform duration-150", openHeroPanel === "branding" && "rotate-180")} />
              </button>
              {openHeroPanel === "branding" && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Identity Mode</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                      {(["text","logo","both"] as const).map((mode) => (
                        <button key={mode} type="button" onClick={() => isPro && setHeroIdentityMode(mode)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", heroIdentityMode === mode ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{mode}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Text: name only. Logo: logo only. Both: logo + name.</p>
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Typography Style</p>
                    <div className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                      {(["default","condensed","cinematic","editorial"] as const).map((style) => (
                        <button key={style} type="button" onClick={() => isPro && setHeroTextStyle(style)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", heroTextStyle === style ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{style}</button>
                      ))}
                    </div>
                  </div>
                  {isPro && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo</p>
                      {heroLogoUrl && (
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
                          <div className="flex h-10 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-[#0a0a0a]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={heroLogoUrl} alt="Hero logo" className="max-h-8 max-w-full object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-foreground/55">{heroLogoUrl.split("/").pop()}</p>
                            <button type="button" onClick={() => setHeroLogoUrl("")} className="mt-0.5 text-[10px] text-destructive/50 transition-colors hover:text-destructive/80">Remove</button>
                          </div>
                        </div>
                      )}
                      <Input id="heroLogoFile" type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => setHeroLogoFile(e.target.files?.[0] ?? null)} />
                      <Button type="button" onClick={handleUploadHeroLogo} disabled={!heroLogoFile || isUploadingHeroLogo || isSaving || isPublishing} className="bg-secondary text-foreground hover:bg-secondary/80">{isUploadingHeroLogo ? "Uploading..." : "Upload logo"}</Button>
                      <p className="text-[10px] text-muted-foreground/38">PNG, SVG, or WEBP. Transparent background recommended.</p>
                    </div>
                  )}
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Placement</p>
                    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                      {([{value:"editorial",label:"Editorial"},{value:"top_center",label:"Top"},{value:"center",label:"Center"},{value:"custom",label:"Custom"}] as {value:HeroLogoPlacement;label:string}[]).map(({value,label}) => (
                        <button key={value} type="button" onClick={() => isPro && setHeroLogoPlacement(value)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", heroLogoPlacement === value ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{label}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Editorial: in content flow. Floating: over the photo.</p>
                  </div>
                  <div className={cn("space-y-2 border-t border-border pt-3", isFloating && "pointer-events-none opacity-30")}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Layout</p>
                    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                      {([{value:"replace_text",label:"Replace"},{value:"above_text",label:"Above"},{value:"below_text",label:"Below"},{value:"left_text",label:"Left"},{value:"right_text",label:"Right"}] as {value:HeroLogoLayout;label:string}[]).map(({value,label}) => (
                        <button key={value} type="button" onClick={() => isPro && setHeroLogoLayout(value)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", heroLogoLayout === value ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{label}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Use Replace if your logo already contains your name.</p>
                  </div>
                  <div className={cn("space-y-2 border-t border-border pt-3", isFloating && "pointer-events-none opacity-30")}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Alignment</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                      {(["left","center","right"] as const).map((a) => (
                        <button key={a} type="button" onClick={() => isPro && setHeroLogoAlignment(a)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", heroLogoAlignment === a ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Size</p>
                      <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroLogoScale}px</span>
                    </div>
                    <input type="range" min={40} max={240} step={5} value={heroLogoScale} onChange={(e) => isPro && setHeroLogoScale(Number(e.target.value))} disabled={!isPro} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-accent/70 disabled:cursor-not-allowed disabled:opacity-40" />
                  </div>
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Position Offset</p>
                    {[{label:"H",val:heroLogoOffsetX,set:setHeroLogoOffsetX},{label:"V",val:heroLogoOffsetY,set:setHeroLogoOffsetY}].map(({label,val,set}) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground/50">{label}</p>
                          <span className="text-[10px] tabular-nums text-muted-foreground/50">{val > 0 ? "+" : ""}{val}px</span>
                        </div>
                        <input type="range" min={-100} max={100} step={1} value={val} onChange={(e) => isPro && set(Number(e.target.value))} disabled={!isPro} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-accent/70 disabled:cursor-not-allowed disabled:opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Media */}
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <button type="button" onClick={() => togglePanel("media")} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-100 hover:bg-white/[0.015]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">Media</span>
                <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/35 transition-transform duration-150", openHeroPanel === "media" && "rotate-180")} />
              </button>
              {openHeroPanel === "media" && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="heroImageUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Image URL</label>
                    <Input id="heroImageUrl" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <label htmlFor="heroImageFile" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Upload</label>
                    <Input id="heroImageFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)} />
                    <Button type="button" onClick={handleUploadHeroImage} disabled={!heroImageFile || isUploadingHeroImage || isSaving || isPublishing} className="bg-secondary text-foreground hover:bg-secondary/80">
                      {heroUploadStatus === "compressing" ? "Compressing..." : heroUploadStatus === "uploading" ? "Uploading..." : "Upload image"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/38">JPEG, PNG, or WEBP. Large images are auto-optimized before upload.</p>
                  </div>
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">Composition</p>
                      <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.10em] text-muted-foreground/30">Preview only</span>
                    </div>
                    {[{label:"Position X",val:heroImageX,set:setHeroImageX,min:0,max:100},{label:"Position Y",val:heroImageY,set:setHeroImageY,min:0,max:100},{label:"Zoom",val:heroImageZoom,set:setHeroImageZoom,min:100,max:140}].map(({label,val,set,min,max}) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground/50">{label}</p>
                          <span className="text-[10px] tabular-nums text-muted-foreground/50">{val}%</span>
                        </div>
                        <input type="range" min={min} max={max} step={1} value={val} onChange={(e) => set(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-accent/70" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Appearance */}
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <button type="button" onClick={() => togglePanel("appearance")} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-100 hover:bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">Appearance</span>
                  {!isPro && <span className="rounded border border-border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/28">Pro</span>}
                </div>
                <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/35 transition-transform duration-150", openHeroPanel === "appearance" && "rotate-180")} />
              </button>
              {openHeroPanel === "appearance" && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Theme</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.values(ACCENT_THEMES).map((theme) => (
                        <button key={theme.value} type="button" onClick={() => isPro && setAccentTheme(theme.value)} disabled={!isPro} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", accentTheme === theme.value ? "border-border bg-secondary text-foreground/80" : "border-transparent text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor:theme.hex}} />{theme.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {[
                    {title:"Logo Style",items:["solid","soft","cinematic"] as const,state:heroLogoStyle,set:(v:string)=>isPro&&setHeroLogoStyle(v as HeroLogoStyle),note:"Solid: full opacity. Soft: reduced opacity with glow. Cinematic: blends into photo."},
                    {title:"Logo Readability",items:["none","subtle","strong"] as const,state:heroLogoReadability,set:(v:string)=>isPro&&setHeroLogoReadability(v as HeroLogoReadability),note:"Contrast protection behind the logo without a visible box."},
                    {title:"Content Surface",items:["none","soft","strong"] as const,state:heroContentSurface,set:(v:string)=>isPro&&setHeroContentSurface(v as HeroContentSurface),note:"Atmospheric backing for readability on busy photos."},
                    {title:"Content Width",items:["compact","standard","wide"] as const,state:heroContentWidth,set:(v:string)=>isPro&&setHeroContentWidth(v as HeroContentWidth),note:"How wide the text block extends across the hero."},
                  ].map(({title,items,state,set,note}) => (
                    <div key={title} className="space-y-2 border-t border-border pt-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">{title}</p>
                      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5 w-fit">
                        {items.map((v) => (
                          <button key={v} type="button" onClick={() => set(v)} disabled={!isPro} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100", state === v ? "bg-secondary text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50", !isPro && "pointer-events-none")}>{v}</button>
                        ))}
                      </div>
                      {note && <p className="text-[10px] text-muted-foreground/35">{note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    )
  }

  function renderCustomDomain() {
    const isPro = artist.plan === "pro"

    const statusBadge = (status: string) => {
      const styles: Record<string, string> = {
        active:    "border-accent/20 bg-accent/10 text-accent",
        verified:  "border-border bg-secondary/40 text-muted-foreground",
        pending:   "border-border bg-secondary/40 text-muted-foreground",
        verifying: "border-border bg-secondary/40 text-muted-foreground/60",
        error:     "border-destructive/20 bg-destructive/10 text-destructive/80",
        suspended: "border-destructive/20 bg-destructive/10 text-destructive/80",
      }
      const dots: Record<string, string> = {
        active:    "bg-accent",
        verified:  "bg-muted-foreground/50",
        pending:   "bg-muted-foreground/30",
        verifying: "bg-muted-foreground/30",
        error:     "bg-destructive/60",
        suspended: "bg-destructive/60",
      }
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.pending}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dots[status] ?? dots.pending}`} />
          {status}
        </span>
      )
    }

    const dnsTable = (rows: { label: string; value: string }[]) => (
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-secondary">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4 border-b border-border px-3 py-2 last:border-0">
            <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{label}</span>
            <span className="break-all font-mono text-xs text-foreground/75">{value}</span>
          </div>
        ))}
      </div>
    )

    if (!isPro) {
      return (
        <div className="space-y-6">
          <HqPageHeader title="Custom Domain" description="Connect an apex domain you own to your DJHQ profile." />
          <div className="rounded-xl border border-border bg-card/30 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/60">Pro feature</p>
            <h3 className="mt-2 text-sm font-semibold text-foreground">Available on Pro</h3>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Upgrade to Pro to connect a custom domain like{" "}
              <span className="font-mono text-foreground/70">yourname.com</span> to your DJHQ profile.
            </p>
            <a
              href={`mailto:${brand.supportEmail}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent/70"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact us to upgrade
            </a>
          </div>
        </div>
      )
    }

    const activeDomain = customDomains[0] ?? null

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Custom Domain</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Connect an apex domain you own to your DJHQ profile.</p>
        </div>

        {/* Add domain form — only shown when no domain exists */}
        {!activeDomain && (
          <div className="rounded-xl border border-border bg-card/40 p-5 transition-colors duration-150 hover:border-border">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Add domain</p>
            <div className="flex gap-2">
              <Input
                value={domainInput}
                onChange={(e) => { setDomainInput(e.target.value); setAddDomainError("") }}
                onKeyDown={(e) => { if (e.key === "Enter" && !isAddingDomain) void handleAddDomain() }}
                placeholder="yourartistdomain.com"
                disabled={isAddingDomain}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                onClick={() => void handleAddDomain()}
                disabled={isAddingDomain || !domainInput.trim()}
                className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isAddingDomain ? "Adding…" : "Add domain"}
              </Button>
            </div>
            {addDomainError && (
              <p className="mt-2 text-xs text-destructive/70">{addDomainError}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground/40">
              Apex domains only (e.g. <span className="font-mono">yourname.com</span>). Subdomains and www are not yet supported.
            </p>
          </div>
        )}

        {/* Domain status card */}
        {activeDomain && (
          <div className="rounded-xl border border-border bg-card/40 p-5 transition-colors duration-150 hover:border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <span className="font-mono text-sm font-medium text-foreground">{activeDomain.domain}</span>
              </div>
              {statusBadge(activeDomain.status)}
            </div>

            {/* Error message */}
            {activeDomain.errorMessage && (
              <p className="mt-3 text-xs text-destructive/70">{activeDomain.errorMessage}</p>
            )}

            {/* error from provisioning failure — routing DNS was ok but Vercel call failed */}
            {activeDomain.status === "error" && activeDomain.errorMessage?.startsWith("Provisioning") && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  Retry after a few minutes or contact support if the issue persists.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCheckConnection(activeDomain.id)}
                    disabled={isCheckingConnectionId === activeDomain.id}
                    className="bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    {isCheckingConnectionId === activeDomain.id ? "Checking…" : "Retry connection"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveDomain(activeDomain.id)}
                    disabled={isRemovingDomainId === activeDomain.id}
                    className="text-xs text-muted-foreground/40 transition-colors hover:text-destructive/70 disabled:pointer-events-none"
                  >
                    {isRemovingDomainId === activeDomain.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            )}

            {/* pending or TXT-ownership error — show TXT record and verify button */}
            {(activeDomain.status === "pending" || (activeDomain.status === "error" && !activeDomain.errorMessage?.startsWith("Provisioning"))) && activeDomain.verificationRecord && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  Add this TXT record to your DNS to verify ownership:
                </p>
                {dnsTable([
                  { label: "Type", value: activeDomain.verificationRecord.type },
                  { label: "Name", value: activeDomain.verificationRecord.name },
                  { label: "Value", value: activeDomain.verificationRecord.value },
                ])}
                <p className="text-[11px] text-muted-foreground/40">
                  DNS changes can take up to 48 hours to propagate.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleVerifyDomain(activeDomain.id)}
                    disabled={isVerifyingDomainId === activeDomain.id}
                    className="bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    {isVerifyingDomainId === activeDomain.id ? "Checking…" : "Check verification"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveDomain(activeDomain.id)}
                    disabled={isRemovingDomainId === activeDomain.id}
                    className="text-xs text-muted-foreground/40 transition-colors hover:text-destructive/70 disabled:pointer-events-none"
                  >
                    {isRemovingDomainId === activeDomain.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            )}

            {/* verifying — transient, buttons disabled */}
            {activeDomain.status === "verifying" && (
              <div className="mt-4 flex items-center gap-2">
                <Button type="button" size="sm" disabled className="bg-secondary text-foreground/50">
                  Checking…
                </Button>
              </div>
            )}

            {/* verified — ownership confirmed, waiting for routing DNS */}
            {activeDomain.status === "verified" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  ✓ Ownership verified. Now point your domain to DJHQ:
                </p>
                {activeDomain.routingRecord && dnsTable([
                  { label: "Type", value: activeDomain.routingRecord.type },
                  { label: "Name", value: activeDomain.routingRecord.name },
                  { label: "Value", value: activeDomain.routingRecord.value },
                ])}
                <p className="text-[11px] text-muted-foreground/40">
                  If using Cloudflare, set this record to DNS-only (grey cloud) while connecting.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCheckConnection(activeDomain.id)}
                    disabled={isCheckingConnectionId === activeDomain.id}
                    className="bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    {isCheckingConnectionId === activeDomain.id ? "Checking…" : "Check connection"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveDomain(activeDomain.id)}
                    disabled={isRemovingDomainId === activeDomain.id}
                    className="text-xs text-muted-foreground/40 transition-colors hover:text-destructive/70 disabled:pointer-events-none"
                  >
                    {isRemovingDomainId === activeDomain.id ? "Removing…" : "Remove domain"}
                  </button>
                </div>
              </div>
            )}

            {/* active — live confirmation */}
            {activeDomain.status === "active" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  Your profile is live at{" "}
                  <a
                    href={`https://${activeDomain.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent/80 transition-colors hover:text-accent"
                  >
                    {activeDomain.domain}
                  </a>
                  .
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void handleRemoveDomain(activeDomain.id)}
                    disabled={isRemovingDomainId === activeDomain.id}
                    className="text-xs text-muted-foreground/40 transition-colors hover:text-destructive/70 disabled:pointer-events-none"
                  >
                    {isRemovingDomainId === activeDomain.id ? "Removing…" : "Remove domain"}
                  </button>
                </div>
              </div>
            )}

            {/* suspended */}
            {activeDomain.status === "suspended" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  This domain is suspended. Contact DJHQ to reactivate it.
                </p>
                <a
                  href={`mailto:${brand.supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-xs text-accent/70 transition-colors hover:text-accent"
                >
                  <Mail className="h-3 w-3" />
                  Contact support
                </a>
              </div>
            )}
          </div>
        )}

        {/* Canonical URL note */}
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">Note</p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Your canonical DJHQ URL{" "}
            <span className="font-mono text-foreground/50">{APP_DISPLAY_HOST}/{artist.handle}</span>{" "}
            always remains active regardless of custom domain status.
          </p>
        </div>
      </div>
    )
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "home":
        return renderHome()
      case "profile":
        return renderProfile()
      case "links":
        return renderLinks()
      case "releases":
        return renderReleases()
      case "shows":         // renamed from "gigs"
        return renderGigs()
      case "sets":          // renamed from "dj-sets"
        return renderDjSets()
      case "media":         // renamed from "videos"
        return renderVideos()
      case "gallery":
        return renderGallery()
      case "bookings":
        return renderBookings()
      case "tours":
        return renderTourPlanner()
      case "press-kit":
        return renderPressKit()
      case "domain":        // renamed from "custom-domain"
        return renderCustomDomain()
      case "brand":
        return renderBrand()
      case "hero":
        return renderHero()
      case "footer":
        return renderFooterBranding()
      case "publish":
        return renderPublish()
      default:
        return renderHome()
    }
  }

  return (
    <main className="djhq-hq min-h-screen">

      {/* ── HQ Status Bar ───────────────────────────────────────────────
           Split header: dark spine cap on left (matching control spine) +
           light status/action area on right. Feels like a cockpit header. */}
      <header className="sticky top-0 z-40 flex h-14 items-stretch border-b border-border">

        {/* Spine cap — same width as control spine, dark surface */}
        <div
          className="hidden w-[196px] shrink-0 items-center gap-3 border-r px-4 lg:flex"
          style={{ backgroundColor: "#0d0d0d", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className="flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-accent">
              <span className="text-[9px] font-black leading-none text-accent-foreground">HQ</span>
            </div>
            <span className="text-[11px] font-bold tracking-[0.1em] text-white/45">DJHQ</span>
          </button>
        </div>

        {/* Status + actions */}
        <div className="flex flex-1 items-center gap-3 bg-background/96 px-5 backdrop-blur-md sm:px-6">

          {/* Mobile: HQ mark */}
          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className="flex shrink-0 items-center gap-2 lg:hidden"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-accent">
              <span className="text-[9px] font-black leading-none text-accent-foreground">HQ</span>
            </div>
          </button>

          <p className="hidden min-w-0 truncate text-[12px] font-black uppercase tracking-[0.07em] text-foreground/70 sm:block">
            {artist.artistName}
          </p>
          <span className="hidden text-border/60 sm:block">·</span>
          <p className="hidden font-mono text-[10px] text-muted-foreground/38 md:block">
            /{artist.handle}
          </p>

          <div className="flex-1" />

          {(saveMessage || statusMessage) && (
            <p className={`hidden max-w-[240px] truncate text-[11px] sm:block ${
              saveMessage && !saveMessage.startsWith("Changes") && !saveMessage.startsWith("Release") && !saveMessage.startsWith("DJ set") && !saveMessage.startsWith("Video") && !saveMessage.startsWith("Gallery")
                ? "text-destructive/65"
                : "text-muted-foreground/55"
            }`}>
              {saveMessage || statusMessage}
            </p>
          )}

          <span className={`hidden items-center gap-1.5 text-[11px] font-semibold sm:inline-flex ${
            artist.isPublished ? "text-accent" : "text-muted-foreground/38"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${artist.isPublished ? "animate-pulse bg-accent" : "bg-muted-foreground/25"}`} />
            {artist.isPublished ? "Live" : "Draft"}
          </span>

          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </a>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="h-8 rounded-lg px-2 text-muted-foreground/38 transition-colors hover:text-foreground/65"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border" />

          <Button
            size="sm"
            disabled={!isSaveDirty || isSaving || isPublishing || importingSelectedReleaseIndex !== null || importingVideoIndex !== null || isUploadingHeroImage || isUploadingGalleryImage}
            onClick={handleSaveChanges}
            className={`relative h-8 rounded-lg px-4 text-[12px] font-semibold shadow-sm transition-all duration-200 ${
              isSaving
                ? "bg-accent/55 text-accent-foreground/65"
                : isSaveDirty
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-accent/85 text-accent-foreground hover:bg-accent"
            }`}
          >
            {isSaveDirty && !isSaving && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-foreground ring-[1.5px] ring-background" />
            )}
            {savedRecently && !isSaveDirty && !isSaving ? (
              <><Check className="h-3.5 w-3.5" /> Saved</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> {isSaving ? "Saving…" : "Save"}</>
            )}
          </Button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-[1600px]">

        {/* ── Control Spine ───────────────────────────────────────────
             Dark near-black navigation rail — the studio console aesthetic.
             Inline style keeps this spine dark regardless of any parent token cascade. */}
        <aside
          className="hidden w-[196px] shrink-0 flex-col lg:flex"
          style={{ backgroundColor: "#0d0d0d" }}
        >
          <div
            className="sticky top-14 flex h-[calc(100vh-56px)] flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >

            {/* Artist identity block */}
            <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-black text-accent"
                  style={{ backgroundColor: "rgba(100,215,140,0.10)" }}
                >
                  {artist.artistName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold leading-tight text-white/72">
                    {artist.artistName}
                  </p>
                  <p className="font-mono text-[9px] text-white/28">/{artist.handle}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3">
              <button
                type="button"
                aria-pressed={activeSection === "home"}
                onClick={() => setActiveSection("home")}
                className={`hq-nav-item${activeSection === "home" ? " hq-nav-item--active" : ""}`}
              >
                <Layers className="h-[14px] w-[14px] shrink-0" />
                Command
              </button>

              {navGroups.map((group, gi) => (
                <div key={group.label} className={gi === 0 ? "mt-5" : "mt-6"}>
                  <p
                    className="mb-1.5 px-3 text-[8px] font-black uppercase tracking-[0.28em]"
                    style={{ color: "rgba(255,255,255,0.20)" }}
                  >
                    {group.label}
                  </p>
                  <div className="space-y-px">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeSection === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setActiveSection(item.id)}
                          className={`hq-nav-item${isActive ? " hq-nav-item--active" : ""}`}
                        >
                          <Icon className="h-[14px] w-[14px] shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">

          {/* Mobile nav — scrollable chip row */}
          <div className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b border-border px-4 pb-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:hidden [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              aria-pressed={activeSection === "home"}
              onClick={() => setActiveSection("home")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                activeSection === "home" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Command
            </button>
            {navGroups.flatMap((g) => g.items).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  activeSection === item.id ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Active section */}
          {renderActiveSection()}
        </div>
      </div>

    </main>
  )
}
