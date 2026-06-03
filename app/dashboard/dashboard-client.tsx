"use client"

import { useState, useRef, useLayoutEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown, ArrowUp, Check, ChevronDown, ExternalLink, Globe, Headphones, LogOut, Mail, MapPin, Music, Play, Plus, Save, Star, Trash2 } from "lucide-react"
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
import { VenueAutocomplete } from "@/components/dashboard/venue-autocomplete"
import { HeroIdentity } from "@/components/djhq/hero-identity"
import { HeroLogoElement } from "@/components/djhq/hero-logo-element"

// Natural dimensions of the virtual hero used for CSS-scale preview.
// The preview container scales this viewport-equivalent canvas down to fit.
const PREVIEW_NATURAL_W = 1440
const PREVIEW_NATURAL_H = Math.round(PREVIEW_NATURAL_W * 7 / 16) // 630

// Canonical app host used for display copy. Controlled by NEXT_PUBLIC_APP_URL in production.
const APP_DISPLAY_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.vercel.app")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")

type NavGroup = { label: string; items: { id: string; label: string }[] }

const navGroups: NavGroup[] = [
  {
    label: "Artist",
    items: [
      { id: "profile", label: "Profile" },
      { id: "links", label: "Links" },
      { id: "gallery", label: "Gallery" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "releases", label: "Releases" },
      { id: "shows", label: "Shows" },
      { id: "sets", label: "Sets" },
      { id: "media", label: "Media" },
    ],
  },
  {
    label: "Brand",
    items: [
      { id: "booking", label: "Booking" },
      { id: "press-kit", label: "Press Kit" },
      { id: "domain", label: "Domain" },
    ],
  },
  {
    label: "Publish",
    items: [
      { id: "publish", label: "Publish" },
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
    id: "editorial_center",
    label: "Editorial Center",
    description: "Balanced premium lockup",
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
    id: "club_poster",
    label: "Club Poster",
    description: "Large festival-style mark",
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
    id: "left_lockup",
    label: "Left Lockup",
    description: "Editorial left-weighted layout",
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
    id: "cinematic_wide",
    label: "Cinematic Wide",
    description: "Blends into photography",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 210,
    heroLogoOffsetX: -20,
    heroLogoOffsetY: 0,
    heroLogoStyle: "cinematic",
  },
  {
    id: "minimal_mark",
    label: "Minimal Mark",
    description: "Quiet identity presence",
    heroIdentityMode: "logo",
    heroLogoPlacement: "editorial",
    heroLogoLayout: "replace_text",
    heroLogoAlignment: "center",
    heroLogoScale: 120,
    heroLogoOffsetX: 0,
    heroLogoOffsetY: 10,
    heroLogoStyle: "soft",
  },
]

type SocialLinkFormState = {
  platform: string
  label: string
  url: string
}

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
  venue: string
  date: string
  city: string
  country: string
  ticketUrl?: string
  flyerUrl?: string
  instagramUrl?: string
  feeAmount?: number | null
  feeCurrency?: string | null
  paymentStatus?: "pending" | "partial" | "paid" | "cancelled" | null
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

const socialPlatforms: SocialPlatform[] = [
  "beatport",
  "spotify",
  "soundcloud",
  "youtube",
  "instagram",
  "tiktok",
  "website",
  "other",
]

function normalizeSocialPlatform(platform: string): SocialPlatform {
  return socialPlatforms.includes(platform as SocialPlatform) ? (platform as SocialPlatform) : "other"
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

function getSocialLinkFormState(artist: Artist): SocialLinkFormState[] {
  return artist.socialLinks.map((link) => ({
    platform: link.platform,
    label: link.label,
    url: link.url,
  }))
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
      venue: gig.venue,
      date: toDateInputValue(gig.date),
      city: gig.city,
      country: gig.country,
      ticketUrl: gig.ticketUrl,
      flyerUrl: gig.flyerUrl,
      instagramUrl: gig.instagramUrl,
      feeAmount: gig.feeAmount ?? null,
      feeCurrency: gig.feeCurrency ?? null,
      paymentStatus: gig.paymentStatus ?? null,
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

// GigAnimatedRow wraps each card in a motion.div for enter/exit animations.
// It manages overflow state so autocomplete dropdowns can escape the card bounds
// when the card is at rest, while still clipping correctly during height animations.
type GigAnimatedRowProps = {
  gig: GigFormState
  isNew: boolean
  newGigId: string | null
  isPast: boolean
  onChange: (updated: GigFormState) => void
  onDelete: () => void
}

function GigAnimatedRow({ gig, isNew, newGigId, isPast, onChange, onDelete }: GigAnimatedRowProps) {
  const [animating, setAnimating] = useState(isNew)

  function handleDelete() {
    // Clip overflow before AnimatePresence starts the exit height animation.
    setAnimating(true)
    onDelete()
  }

  return (
    <motion.div
      id={`gig-${gig.id}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: animating ? "hidden" : "visible" }}
      onAnimationComplete={() => setAnimating(false)}
    >
      <GigCard
        gig={gig}
        onChange={onChange}
        onDelete={handleDelete}
        initialExpanded={gig.id === newGigId}
        isPast={isPast}
      />
    </motion.div>
  )
}

type DashboardClientProps = {
  initialArtist: Artist
  statusMessage?: string
}

export default function DashboardClient({ initialArtist, statusMessage }: DashboardClientProps) {
  const [artist, setArtist] = useState<Artist>(initialArtist)
  const initialSocialLinks = getSocialLinkFormState(artist)
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
  const [heroLogoFile, setHeroLogoFile] = useState<File | null>(null)
  const [isUploadingHeroLogo, setIsUploadingHeroLogo] = useState(false)
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks)
  const [releases, setReleases] = useState(initialReleases)
  const [upcomingGigs, setUpcomingGigs] = useState(initialUpcomingGigs)
  const [newGigId, setNewGigId] = useState<string | null>(null)
  const [bookingEmail, setBookingEmail] = useState(initialArtist.bookingInfo.email)
  const [bookingUrl, setBookingUrl] = useState(initialArtist.bookingInfo.bookingUrl ?? "")
  const [pressKitEnabled, setPressKitEnabled] = useState(initialArtist.pressKit.enabled)
  const [pressKitUrl, setPressKitUrl] = useState(initialArtist.pressKit.downloadUrl)
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
  const [saveMessage, setSaveMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [importingSelectedReleaseIndex, setImportingSelectedReleaseIndex] = useState<number | null>(null)
  const [importingDjSetIndex, setImportingDjSetIndex] = useState<number | null>(null)
  const [importingVideoIndex, setImportingVideoIndex] = useState<number | null>(null)
  const [uploadingVideoThumbnailIndex, setUploadingVideoThumbnailIndex] = useState<number | null>(null)
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
  const [focalDirtyIds, setFocalDirtyIds] = useState<Set<string>>(new Set())
  const [isSavingFocalPoints, setIsSavingFocalPoints] = useState(false)
  const isGalleryFocalDirty = focalDirtyIds.size > 0
  const [savedRecently, setSavedRecently] = useState(false)
  const [customDomains, setCustomDomains] = useState(initialArtist.customDomains)
  const [domainInput, setDomainInput] = useState("")
  const [isAddingDomain, setIsAddingDomain] = useState(false)
  const [addDomainError, setAddDomainError] = useState("")
  const [isVerifyingDomainId, setIsVerifyingDomainId] = useState<string | null>(null)
  const [isCheckingConnectionId, setIsCheckingConnectionId] = useState<string | null>(null)
  const [isRemovingDomainId, setIsRemovingDomainId] = useState<string | null>(null)
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
  const isLinksDirty = JSON.stringify(socialLinks) !== JSON.stringify(initialSocialLinks)
  const isReleasesDirty = JSON.stringify(releases) !== JSON.stringify(initialReleases)
  const isGigsDirty = JSON.stringify(upcomingGigs) !== JSON.stringify(initialUpcomingGigs)
  const isDjSetsDirty = JSON.stringify(djSets) !== JSON.stringify(initialDjSets)
  const isVideosDirty = JSON.stringify(videos) !== JSON.stringify(initialVideos)
  const isBookingDirty =
    bookingEmail !== artist.bookingInfo.email ||
    bookingUrl !== (artist.bookingInfo.bookingUrl ?? "")
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
    pressKitUseGalleryPhotos !== (artist.pressKit.useGalleryPhotos ?? true)
  const isSaveDirty = isProfileDirty || isLinksDirty || isReleasesDirty || isGigsDirty || isDjSetsDirty || isVideosDirty || isBookingDirty || isPressKitDirty || isGalleryFocalDirty

  async function persistArtistChanges(nextPublished: boolean, successMessage: string) {
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
          faviconUrl,
          heroLogoUrl,
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
        socialLinks,
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
      faviconUrl: faviconUrl.trim() || undefined,
      heroLogoUrl: heroLogoUrl.trim() || null,
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
      socialLinks: socialLinks.map((link) => ({
        platform: normalizeSocialPlatform(link.platform),
        label: link.label.trim(),
        url: link.url.trim(),
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
        venue: gig.venue.trim(),
        city: gig.city.trim(),
        country: gig.country.trim(),
        ticketUrl: gig.ticketUrl?.trim() || undefined,
        flyerUrl: gig.flyerUrl?.trim() || undefined,
        instagramUrl: gig.instagramUrl?.trim() || undefined,
        feeAmount: gig.feeAmount ?? null,
        feeCurrency: gig.feeCurrency?.trim() || null,
        paymentStatus: gig.paymentStatus ?? null,
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
    setSocialLinks(getSocialLinkFormState(savedArtist))
    setReleases(getReleaseFormState(savedArtist))
    setUpcomingGigs(getGigFormState(savedArtist))
    setDjSets(getDjSetFormState(savedArtist))
    setVideos(getVideoFormState(savedArtist))
    setBookingEmail(savedArtist.bookingInfo.email)
    setBookingUrl(savedArtist.bookingInfo.bookingUrl ?? "")
    setPressKitEnabled(savedArtist.pressKit.enabled)
    setPressKitUrl(savedArtist.pressKit.downloadUrl)
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

  async function saveFocalPoints(): Promise<void> {
    if (focalDirtyIds.size === 0) return

    setIsSavingFocalPoints(true)
    const dirtyIds = [...focalDirtyIds]

    const updates = dirtyIds.map((id) => {
      const image = galleryImages.find((img) => img.id === id)
      if (!image) return Promise.resolve()
      return fetch("/api/artists/gallery-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          galleryImageId: id,
          focalX: image.focalX,
          focalY: image.focalY,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to save focal point.")
      })
    })

    await Promise.all(updates)
    setFocalDirtyIds(new Set())
    setIsSavingFocalPoints(false)
  }

  async function handleSaveChanges() {
    setIsSaving(true)
    setSavedRecently(false)
    setSaveMessage("")

    try {
      await Promise.all([
        persistArtistChanges(artist.isPublished, "Changes saved."),
        saveFocalPoints(),
      ])
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
    setReleases((current) => [...current, createEmptyRelease()])
  }

  function handleRemoveRelease(index: number) {
    setReleases((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function handleMoveRelease(index: number, direction: "up" | "down") {
    setReleases((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
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

  function handleMoveDjSet(index: number, direction: "up" | "down") {
    setDjSets((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
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

  function handleAddVideo() {
    setVideos((current) => [...current, createEmptyVideo(artist.artistName)])
  }

  function handleRemoveVideo(index: number) {
    setVideos((current) => current.filter((_, i) => i !== index))
  }

  function handleMoveVideo(index: number, direction: "up" | "down") {
    setVideos((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
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
      setSaveMessage("Gallery image uploaded.")
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

  function handleSetFocalPoint(imageId: string, event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const focalX = Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 100)))
    const focalY = Math.min(100, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * 100)))
    setGalleryImages((current) =>
      current.map((img) => (img.id === imageId ? { ...img, focalX, focalY } : img)),
    )
    setFocalDirtyIds((current) => new Set([...current, imageId]))
  }

  async function handleReorderGalleryImage(currentIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= galleryImages.length) {
      return
    }

    const reordered = [...galleryImages]
    const [movedImage] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, movedImage)

    setIsReorderingGallery(true)
    setSaveMessage("")

    try {
      const response = await fetch("/api/artists/gallery-image", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistId: artist.id,
          orderedImageIds: reordered.map((image) => image.id),
        }),
      })

      const result = (await response.json()) as { error?: string; galleryImages?: GalleryImage[] }

      if (!response.ok || !result.galleryImages) {
        throw new Error(result.error ?? "Unable to reorder gallery images.")
      }

      setGalleryImages(result.galleryImages)
      setArtist((current) => ({
        ...current,
        galleryImages: result.galleryImages ?? current.galleryImages,
        updatedAt: new Date().toISOString(),
      }))
      setSaveMessage("Gallery order updated.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reorder gallery images."
      setSaveMessage(message)
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
    // ── Profile completion ──────────────────────────────────────────────
    const completionChecks = [
      { label: "Name & handle",    done: !!artist.artistName && !!artist.handle },
      { label: "Bio & location",   done: !!artist.shortBio && !!artist.location },
      { label: "Social links",     done: artist.socialLinks.length > 0 },
      { label: "Featured release", done: artist.releases.some((r) => r.isFeatured) },
      { label: "Releases",         done: artist.releases.length > 0 },
      { label: "Sets",             done: artist.djSets.length > 0 },
      { label: "Media",            done: artist.videos.length > 0 },
      { label: "Gallery",          done: artist.galleryImages.length > 0 },
      { label: "Hero image",       done: !!artist.heroImageUrl && !artist.heroImageUrl.includes("dj-hero") && !artist.heroImageUrl.includes("placeholder") },
    ]
    const completionDone = completionChecks.filter((c) => c.done).length
    const completionPct  = Math.round((completionDone / completionChecks.length) * 100)
    const isComplete     = completionPct === 100

    // ── Avatar ──────────────────────────────────────────────────────────
    const heroThumb = artist.avatarUrl?.trim() || artist.heroImageUrl?.trim()
    const initials  = artist.artistName
      .split(/[\s:_-]+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "").join("")

    // ── Dates ────────────────────────────────────────────────────────────
    const lastUpdated = new Date(artist.updatedAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })
    const today = new Date().toISOString().slice(0, 10)

    // ── Upcoming shows (future only, ascending) ──────────────────────────
    const upcomingShowsList = [...artist.upcomingGigs]
      .filter((g) => g.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
    const upcomingCount = artist.upcomingGigs.filter((g) => g.date >= today).length

    // ── Publishing status ────────────────────────────────────────────────
    const hasActiveDomain = customDomains.some((d) => d.status === "active")
    const hasBooking      = !!artist.bookingInfo.email.trim()
    const hasPressKit     = pressKitEnabled

    return (
      <div className="space-y-4">

        {/* ── Artist Header ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5">
          <div className="flex items-start gap-4">

            {/* Avatar */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-white/[0.08] sm:h-16 sm:w-16">
              {heroThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroThumb} alt={artist.artistName} className="h-full w-full object-cover object-top brightness-90" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground/60">
                  {initials}
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
                {artist.artistName}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground/50">@{artist.handle}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  artist.isPublished
                    ? "border-accent/25 bg-accent/10 text-accent"
                    : "border-white/[0.06] bg-secondary/40 text-muted-foreground"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${artist.isPublished ? "bg-accent" : "bg-muted-foreground/40"}`} />
                  {artist.isPublished ? "Published" : "Draft"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/30">Updated {lastUpdated}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <a
                  href={publicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.08] bg-secondary/30 px-2.5 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-white/[0.14] hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Profile
                </a>
                <button
                  type="button"
                  onClick={() => setActiveSection("profile")}
                  className="inline-flex h-7 items-center rounded-md border border-white/[0.08] bg-secondary/30 px-2.5 text-[11px] font-medium text-foreground/65 transition-all duration-150 hover:border-white/[0.14] hover:text-foreground"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/[0.04] pt-4">
            {[
              { label: "Upcoming", value: upcomingCount, section: "shows"    },
              { label: "Releases", value: artist.releases.length, section: "releases" },
              { label: "Sets",     value: artist.djSets.length, section: "sets"     },
              { label: "Views",    value: "—", section: null },
            ].map(({ label, value, section }) => (
              section ? (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className="group rounded-lg py-1 text-center transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <p className="text-lg font-bold tabular-nums text-foreground/85 transition-colors group-hover:text-foreground">{value}</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/40">{label}</p>
                </button>
              ) : (
                <div key={label} className="rounded-lg py-1 text-center">
                  <p className="text-lg font-bold tabular-nums text-muted-foreground/20">{value}</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/25">{label}</p>
                </div>
              )
            ))}
          </div>

          {/* Profile completion */}
          <div className="mt-3 border-t border-white/[0.04] pt-3">
            {isComplete ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent/70">
                <Check className="h-3 w-3" />
                Profile Fully Optimized
              </span>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
                    Profile Completion
                  </p>
                  <p className="text-[11px] font-bold tabular-nums text-foreground/55">{completionPct}%</p>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-accent/40 transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground/30">
                  Missing: {completionChecks.filter((c) => !c.done).map((c) => c.label).join(" · ")}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Add Release",  sub: "Upload your latest track",   section: "releases" },
            { label: "Add Show",     sub: "Schedule an upcoming gig",   section: "shows"    },
            { label: "Add Set",      sub: "Publish a recorded mix",     section: "sets"     },
            { label: "Upload Media", sub: "Add photos and videos",      section: "media"    },
          ].map(({ label, sub, section }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveSection(section)}
              className="group flex flex-col rounded-xl border border-white/[0.06] bg-card/30 p-4 text-left transition-all duration-150 hover:border-white/[0.12] hover:bg-card/50"
            >
              <p className="text-sm font-semibold text-foreground/85 transition-colors group-hover:text-foreground">
                {label}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground/38">{sub}</p>
            </button>
          ))}
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

          {/* Left: Upcoming Shows + Content Overview */}
          <div className="space-y-4">

            {/* Upcoming Shows */}
            <div className="rounded-xl border border-white/[0.06] bg-card/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
                  Upcoming Shows
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection("shows")}
                  className="text-[10px] font-medium text-accent/60 transition-colors hover:text-accent"
                >
                  Manage Shows →
                </button>
              </div>

              {upcomingShowsList.length > 0 ? (
                <div className="space-y-px">
                  {upcomingShowsList.map((g) => {
                    const d = new Date(g.date)
                    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveSection("shows")}
                        className="group flex w-full items-center gap-4 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
                      >
                        <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/60">
                          {dateStr}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground/80 transition-colors group-hover:text-foreground">
                            {g.venue}
                          </p>
                          {g.city && (
                            <p className="truncate text-[11px] text-muted-foreground/40">{g.city}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm text-muted-foreground/30">No upcoming shows.</p>
                  <button
                    type="button"
                    onClick={() => setActiveSection("shows")}
                    className="mt-2 text-[11px] font-medium text-accent/60 hover:text-accent"
                  >
                    Add your first show →
                  </button>
                </div>
              )}
            </div>

            {/* Content Overview */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Releases", count: artist.releases.length,     section: "releases" },
                { label: "Shows",    count: artist.upcomingGigs.length, section: "shows"    },
                { label: "Sets",     count: artist.djSets.length,       section: "sets"     },
                { label: "Media",    count: artist.videos.length,       section: "media"    },
              ].map(({ label, count, section }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-card/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">{label}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground/85">{count}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection(section)}
                      className="mt-0.5 shrink-0 rounded-md border border-white/[0.06] bg-secondary/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground/45 transition-all duration-150 hover:border-white/[0.12] hover:text-foreground"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Publishing Status + Analytics */}
          <div className="space-y-4">

            {/* Publishing Status */}
            <div className="rounded-xl border border-white/[0.06] bg-card/30 p-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
                Publishing Status
              </p>
              <div className="space-y-1">
                {[
                  { label: "Public Profile", ok: artist.isPublished, onText: "Live",      offText: "Draft",    section: "publish"   },
                  { label: "Custom Domain",  ok: hasActiveDomain,    onText: "Connected", offText: "Not set",  section: "domain"    },
                  { label: "Booking Form",   ok: hasBooking,         onText: "Active",    offText: "Not set",  section: "booking"   },
                  { label: "Press Kit",      ok: hasPressKit,        onText: "Published", offText: "Disabled", section: "press-kit" },
                ].map(({ label, ok, onText, offText, section }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    <span className="text-xs text-muted-foreground/55 transition-colors group-hover:text-foreground/65">
                      {label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${ok ? "text-accent/75" : "text-muted-foreground/30"}`}>
                      {ok
                        ? <Check className="h-3 w-3" />
                        : <span className="h-1.5 w-1.5 rounded-full bg-white/[0.08]" />
                      }
                      {ok ? onText : offText}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded-xl border border-white/[0.06] bg-card/30 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
                  Analytics
                </p>
                <span className="rounded-full border border-white/[0.06] bg-secondary/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/30">
                  Coming Soon
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/28">
                Profile views, link clicks and audience insights will be available soon.
              </p>
            </div>

          </div>
        </div>

      </div>
    )
  }

  function renderProfile() {
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

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Your public artist identity and hero section.</p>
        </div>

        {/* Basic artist info */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artist</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="artistName" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artist Name</label>
              <Input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="handle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Handle</label>
              <Input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Hero Studio ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/45">Hero Studio</p>
            <span className="h-px flex-1 bg-white/[0.05]" />
          </div>

          {/* Two-column layout: preview+presets left, panels right */}
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

            {/* ── LEFT: Preview + presets ── */}
            <div className="space-y-4">

              {/* Preview frame */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080808]">
                <div
                  ref={previewContainerRef}
                  className="relative aspect-[16/7] overflow-hidden"
                >
                  {/* Virtual hero at natural PREVIEW_NATURAL_W width, CSS-scaled to container */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: PREVIEW_NATURAL_W,
                      height: PREVIEW_NATURAL_H,
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                      "--accent": previewTheme.accent,
                      "--accent-foreground": previewTheme.accentForeground,
                    } as React.CSSProperties}
                  >
                    {/* Background image — wired to image composition sliders */}
                    {heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroImageUrl}
                        alt=""
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: `${heroImageX}% ${heroImageY}%`,
                          transform: heroImageZoom > 100 ? `scale(${heroImageZoom / 100})` : undefined,
                          transformOrigin: "center",
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_30%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
                    )}

                    {/* Multi-layer gradient system — identical to public hero */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.32),_hsl(var(--background)/0.04)_28%,_hsl(var(--background)/0.52)_66%,_hsl(var(--background)/0.98))]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_transparent_18%,_hsl(var(--background)/0.24)_55%,_hsl(var(--background)/0.72)_100%)]" />
                    <div className="absolute inset-y-0 left-0 w-3/4 bg-[linear-gradient(92deg,_hsl(var(--background)/0.42),_transparent_72%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_90%,_hsl(var(--accent)/0.10),_transparent_38%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_hsl(var(--background)/0.30)_100%)]" />

                    {/* Floating logo layer */}
                    {previewHasFloatingLogo && (
                      <div
                        className="pointer-events-none absolute"
                        style={{
                          top: heroLogoPlacement === "top_center" ? "18%" : "50%",
                          left: "50%",
                          transform: previewFloatingTransform,
                        }}
                      >
                        <HeroLogoElement
                          logoUrl={heroLogoUrl}
                          artistName={previewName}
                          logoWidth={previewLogoWidth}
                          heroLogoStyle={heroLogoStyle}
                          heroLogoReadability={heroLogoReadability}
                        />
                      </div>
                    )}

                    {/* Content area — mirrors public hero structure exactly */}
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(78%,460px)] bg-[linear-gradient(0deg,_hsl(var(--background)/0.95)_0%,_hsl(var(--background)/0.62)_38%,_hsl(var(--background)/0.10)_72%,_transparent_100%)]" />
                      <div className={cn(
                        "relative",
                        heroContentSurface === "soft" && "rounded-[1.5rem] border border-white/[0.04] bg-black/[0.10] px-4 py-3 backdrop-blur-[1px] [box-shadow:inset_0_0_40px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4",
                        heroContentSurface === "strong" && "rounded-[1.5rem] border border-white/[0.06] bg-black/[0.18] px-4 py-3 backdrop-blur-[2px] [box-shadow:inset_0_0_40px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4",
                      )}>
                        {heroContentSurface !== "none" && (
                          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-b from-black/[0.04] to-transparent" />
                        )}

                        {/* Genre chips — above logo */}
                        {genres.split(",").map((g) => g.trim()).filter(Boolean).length > 0 && (
                          <div className="mb-3.5 flex flex-wrap gap-2 sm:mb-4">
                            {genres.split(",").map((g) => g.trim()).filter(Boolean).map((genre) => (
                              <span
                                key={genre}
                                className="rounded-full border border-accent/70 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm"
                                style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 12%, transparent)" }}
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Hero identity — skipped for floating placements */}
                        {!isFloating && (
                          <HeroIdentity
                            artistName={previewName}
                            heroLogoUrl={isPro ? (heroLogoUrl || null) : null}
                            heroIdentityMode={heroIdentityMode}
                            heroTextStyle={heroTextStyle}
                            heroLogoScale={heroLogoScale}
                            heroLogoLayout={heroLogoLayout}
                            heroLogoAlignment={heroLogoAlignment}
                            heroLogoOffsetX={heroLogoOffsetX}
                            heroLogoOffsetY={heroLogoOffsetY}
                            heroLogoStyle={heroLogoStyle}
                            heroLogoReadability={heroLogoReadability}
                            isPro={isPro}
                            isPreview
                          />
                        )}

                        {/* Text content block */}
                        <div className={cn("relative", previewContentWidthClass)}>
                          {location && (
                            <p className="mt-2.5 flex items-center gap-2 text-sm text-white/65 sm:mt-3">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/80 sm:h-4 sm:w-4" />
                              {location}
                            </p>
                          )}
                          {heroTagline && (
                            <p
                              className="mt-1 text-base font-medium uppercase tracking-[0.07em] text-accent/90 sm:mt-1.5 sm:text-lg"
                              style={{ textShadow: `0 0 10px rgba(${previewTheme.glowRgb}, 0.15)` }}
                            >
                              {heroTagline}
                            </p>
                          )}
                          {shortBio && (
                            <p className="mt-2 max-w-[700px] text-sm leading-relaxed text-white/80 sm:mt-2.5 sm:text-base">
                              {shortBio}
                            </p>
                          )}
                          {bookingEmail && (
                            <div className="mt-4 flex flex-col gap-3 sm:mt-5">
                              <div className="flex h-11 w-fit items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-md shadow-accent/15 sm:h-12">
                                <Mail className="h-4 w-4" />
                                Book this artist
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview badge */}
                  <div className="absolute right-2 top-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/40">
                    Preview
                  </div>
                </div>
              </div>

              {/* Composition presets — below preview as compact shortcuts */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                  Composition Presets
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
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
                        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-100",
                        "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.10] hover:bg-white/[0.03]",
                        !isPro && "pointer-events-none opacity-40",
                      )}
                    >
                      <span className="text-[10px] font-semibold text-foreground/70">{preset.label}</span>
                      <span className="text-[9px] text-muted-foreground/40">{preset.description}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/30">
                  Start with a curated composition, then fine-tune in the panels.
                </p>
              </div>
            </div>

            {/* ── RIGHT: Control panels ── */}
            <div className="space-y-4">

              {/* A. Hero Image */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Hero Image</p>
                <p className="mb-4 text-[10px] text-muted-foreground/40">Photograph or artwork behind the hero.</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="heroImageUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Image URL</label>
                    <Input id="heroImageUrl" value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="heroImageFile" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Upload</label>
                    <Input
                      id="heroImageFile"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setHeroImageFile(event.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      onClick={handleUploadHeroImage}
                      disabled={!heroImageFile || isUploadingHeroImage || isSaving || isPublishing}
                      className="bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      {heroUploadStatus === "compressing" ? "Compressing..." : heroUploadStatus === "uploading" ? "Uploading..." : "Upload hero image"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/38">
                      Recommended: high-quality landscape. Large images are auto-optimized before upload.
                    </p>
                  </div>

                  {/* Image composition sliders — UI-only preview, not saved to profile */}
                  <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">Image Composition</p>
                      <span className="rounded border border-white/[0.04] bg-white/[0.02] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.10em] text-muted-foreground/30">Preview only</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">Position X</p>
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroImageX}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} step={1} value={heroImageX}
                        onChange={(e) => setHeroImageX(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">Position Y</p>
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroImageY}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} step={1} value={heroImageY}
                        onChange={(e) => setHeroImageY(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">Zoom</p>
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroImageZoom}%</span>
                      </div>
                      <input
                        type="range" min={100} max={140} step={1} value={heroImageZoom}
                        onChange={(e) => setHeroImageZoom(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/30">
                      Adjusts the image in the preview only. Changes are not saved to your profile.
                    </p>
                  </div>
                </div>
              </div>

              {/* B. Hero Identity */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Hero Identity</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/40">Logo and name in the public hero.</p>
                  </div>
                  {!isPro && (
                    <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">Pro only</span>
                  )}
                </div>
                <div className="space-y-5">
                  {/* Identity mode */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Identity Mode</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["text", "logo", "both"] as const).map((mode) => (
                        <button
                          key={mode} type="button"
                          onClick={() => isPro && setHeroIdentityMode(mode)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroIdentityMode === mode ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Text: name only. Logo: logo only or alongside name. Both: logo + name together.</p>
                  </div>

                  {/* Typography style */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Typography Style</p>
                    <div className="flex flex-wrap gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["default", "condensed", "cinematic", "editorial"] as const).map((style) => (
                        <button
                          key={style} type="button"
                          onClick={() => isPro && setHeroTextStyle(style)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroTextStyle === style ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Controls weight and size of your name. Only visible when text is shown.</p>
                  </div>

                  {/* Custom Logo */}
                  {isPro && (
                    <div className="space-y-2 border-t border-white/[0.04] pt-4">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Custom Logo</p>
                      {heroLogoUrl ? (
                        <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="flex h-10 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-[#0a0a0a]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={heroLogoUrl} alt="Hero logo" className="max-h-8 max-w-full object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-foreground/55">{heroLogoUrl.split("/").pop()}</p>
                            <button type="button" onClick={() => setHeroLogoUrl("")} className="mt-0.5 text-[10px] text-destructive/50 transition-colors hover:text-destructive/80">Remove</button>
                          </div>
                        </div>
                      ) : null}
                      <Input id="heroLogoFile" type="file" accept="image/png,image/svg+xml,image/webp" onChange={(event) => setHeroLogoFile(event.target.files?.[0] ?? null)} />
                      <Button type="button" onClick={handleUploadHeroLogo} disabled={!heroLogoFile || isUploadingHeroLogo || isSaving || isPublishing} className="bg-secondary text-foreground hover:bg-secondary/80">
                        {isUploadingHeroLogo ? "Uploading..." : "Upload logo"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground/38">PNG, SVG, or WEBP. Transparent background recommended. Use Logo Size to control height on the public profile.</p>
                    </div>
                  )}

                  {/* Logo Placement */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Placement</p>
                    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {([
                        { value: "editorial", label: "Editorial" },
                        { value: "top_center", label: "Top Center" },
                        { value: "center", label: "Center" },
                        { value: "custom", label: "Custom" },
                      ] as { value: HeroLogoPlacement; label: string }[]).map(({ value, label }) => (
                        <button
                          key={value} type="button"
                          onClick={() => isPro && setHeroLogoPlacement(value)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroLogoPlacement === value ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Editorial keeps the logo in content flow. Floating places it independently over the photo.</p>
                  </div>

                  {/* Logo Layout */}
                  <div className={cn("space-y-2 border-t border-white/[0.04] pt-4 transition-opacity duration-150", isFloating && "pointer-events-none opacity-30")}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Layout</p>
                    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {([
                        { value: "replace_text", label: "Replace" },
                        { value: "above_text", label: "Above" },
                        { value: "below_text", label: "Below" },
                        { value: "left_text", label: "Left" },
                        { value: "right_text", label: "Right" },
                      ] as { value: HeroLogoLayout; label: string }[]).map(({ value, label }) => (
                        <button
                          key={value} type="button"
                          onClick={() => isPro && setHeroLogoLayout(value)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroLogoLayout === value ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Use <strong className="font-semibold text-muted-foreground/55">Replace</strong> if your logo already contains your name.</p>
                  </div>

                  {/* Logo Alignment */}
                  <div className={cn("space-y-2 border-t border-white/[0.04] pt-4 transition-opacity duration-150", isFloating && "pointer-events-none opacity-30")}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Alignment</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["left", "center", "right"] as const).map((alignment) => (
                        <button
                          key={alignment} type="button"
                          onClick={() => isPro && setHeroLogoAlignment(alignment)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroLogoAlignment === alignment ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {alignment}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Size */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Size</p>
                      <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroLogoScale}px</span>
                    </div>
                    <input
                      type="range" min={40} max={240} step={5} value={heroLogoScale}
                      onChange={(e) => isPro && setHeroLogoScale(Number(e.target.value))}
                      disabled={!isPro}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <p className="text-[10px] text-muted-foreground/35">Controls visual logo width. Layout spacing stays fixed.</p>
                  </div>

                  {/* Logo Offset */}
                  <div className="space-y-3 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Position Offset</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">Horizontal</p>
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroLogoOffsetX > 0 ? "+" : ""}{heroLogoOffsetX}px</span>
                      </div>
                      <input
                        type="range" min={-100} max={100} step={1} value={heroLogoOffsetX}
                        onChange={(e) => isPro && setHeroLogoOffsetX(Number(e.target.value))}
                        disabled={!isPro}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">Vertical</p>
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">{heroLogoOffsetY > 0 ? "+" : ""}{heroLogoOffsetY}px</span>
                      </div>
                      <input
                        type="range" min={-100} max={100} step={1} value={heroLogoOffsetY}
                        onChange={(e) => isPro && setHeroLogoOffsetY(Number(e.target.value))}
                        disabled={!isPro}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Fine-tune logo position without affecting layout or spacing.</p>
                  </div>
                </div>
              </div>

              {/* C. Hero Copy */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Hero Copy</p>
                <p className="mb-4 text-[10px] text-muted-foreground/40">Text content shown in the hero section.</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="genres" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Genre Tags</label>
                    <Input id="genres" value={genres} onChange={(event) => setGenres(event.target.value)} placeholder="House, Tech House, Melodic" />
                    <p className="text-[10px] text-muted-foreground/38">Comma-separated. Displayed as chips above the logo.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="location" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Location</label>
                    <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="heroTagline" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Hero Tagline</label>
                      <span className={cn("text-[10px] tabular-nums transition-colors duration-150", heroTagline.length > 90 ? "text-amber-400/60" : "text-muted-foreground/30")}>
                        {heroTagline.length}/100
                      </span>
                    </div>
                    <Input id="heroTagline" value={heroTagline} maxLength={100} placeholder="Peak-time house music for underground dance floors." onChange={(event) => setHeroTagline(event.target.value)} />
                    <p className="text-[10px] text-muted-foreground/38">Rendered above the bio in accent color. Leave blank to omit.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="shortBio" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Short Bio</label>
                    <Textarea id="shortBio" value={shortBio} onChange={(event) => setShortBio(event.target.value)} />
                  </div>
                </div>
              </div>

              {/* D. Hero Style */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Hero Style</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/40">Visual treatment and color theme.</p>
                  </div>
                  {!isPro && (
                    <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">Pro only</span>
                  )}
                </div>
                <div className="space-y-5">
                  {/* Accent theme */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Accent Theme</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(Object.values(ACCENT_THEMES)).map((theme) => (
                        <button
                          key={theme.value} type="button"
                          onClick={() => isPro && setAccentTheme(theme.value)}
                          disabled={!isPro}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            accentTheme === theme.value ? "border-white/[0.14] bg-white/[0.07] text-foreground/80" : "border-transparent text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: theme.hex }} />
                          {theme.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Primary accent color used throughout your profile.</p>
                  </div>

                  {/* Logo Visual Style */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Visual Style</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["solid", "soft", "cinematic"] as const).map((style) => (
                        <button
                          key={style} type="button"
                          onClick={() => isPro && setHeroLogoStyle(style)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroLogoStyle === style ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Solid: full opacity. Soft: reduced opacity with glow. Cinematic: blends into the photo.</p>
                  </div>

                  {/* Logo Readability */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Logo Readability</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["none", "subtle", "strong"] as const).map((level) => (
                        <button
                          key={level} type="button"
                          onClick={() => isPro && setHeroLogoReadability(level)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroLogoReadability === level ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Soft contrast protection behind the logo without a visible box.</p>
                  </div>

                  {/* Content Surface */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Content Surface</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["none", "soft", "strong"] as const).map((level) => (
                        <button
                          key={level} type="button"
                          onClick={() => isPro && setHeroContentSurface(level)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroContentSurface === level ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">Atmospheric surface behind the full content cluster for readability on busy photos.</p>
                  </div>

                  {/* Content Width */}
                  <div className="space-y-2 border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Content Width</p>
                    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {(["compact", "standard", "wide"] as const).map((w) => (
                        <button
                          key={w} type="button"
                          onClick={() => isPro && setHeroContentWidth(w)}
                          disabled={!isPro}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            heroContentWidth === w ? "bg-white/[0.07] text-foreground/75" : "text-muted-foreground/30 hover:text-muted-foreground/50",
                            !isPro && "pointer-events-none",
                          )}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">How wide the text content block extends across the hero.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* DJHQ Branding */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                DJHQ Branding
              </p>
              <p className="text-xs text-muted-foreground/45">
                {artist.plan === "pro"
                  ? "Show or hide the DJHQ wordmark in your public profile header."
                  : "Upgrade to Pro to hide the DJHQ wordmark from your public profile."}
              </p>
            </div>
            {artist.plan === "pro" ? (
              <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5">
                {(["show", "hide"] as const).map((opt) => {
                  const isActive = opt === "show" ? showHeaderBranding : !showHeaderBranding
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setShowHeaderBranding(opt === "show")}
                      className={cn(
                        "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                        isActive
                          ? "bg-white/[0.07] text-foreground/75"
                          : "text-muted-foreground/30 hover:text-muted-foreground/50",
                      )}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">
                Pro only
              </span>
            )}
          </div>
        </div>

        {/* Browser Identity */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Browser Identity
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/45">
                Control how your profile appears in browser tabs, bookmarks, and shared links.
              </p>
            </div>
            {artist.plan !== "pro" && (
              <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">
                Pro only
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Browser Title */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="browserTitle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Browser Title
                </label>
                <span className={cn(
                  "text-[10px] tabular-nums transition-colors duration-150",
                  browserTitle.length > 70 ? "text-amber-400/60" : "text-muted-foreground/30",
                )}>
                  {browserTitle.length}/80
                </span>
              </div>
              <Input
                id="browserTitle"
                value={browserTitle}
                maxLength={80}
                placeholder={artist.plan === "pro" ? artist.artistName : `${artist.artistName} — DJHQ`}
                disabled={artist.plan !== "pro"}
                onChange={(event) => setBrowserTitle(event.target.value)}
                className={artist.plan !== "pro" ? "opacity-40 cursor-not-allowed" : ""}
              />
              {/* Live browser tab preview */}
              <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1a1a1a]">
                <div className="flex h-9 items-end gap-0 px-2 pt-2">
                  <div className="flex h-8 min-w-0 max-w-[240px] shrink items-center gap-2 rounded-t-lg border border-b-0 border-white/[0.12] bg-[#242424] px-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-[#0a0a0a]">
                      {faviconUrl && artist.plan === "pro" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={faviconUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[7px] font-bold leading-none text-white/80">
                          {artist.plan === "pro"
                            ? getArtistInitialsPreview(artistName || artist.artistName)
                            : "DJ"}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-[10px] text-[#c8c8c8]">
                      {artist.plan === "pro"
                        ? (browserTitle.trim() || artistName || artist.artistName)
                        : `${artistName || artist.artistName} — DJHQ`}
                    </span>
                  </div>
                  <div className="ml-1 flex h-7 w-6 items-center justify-center text-[#555]">
                    <span className="text-sm leading-none">+</span>
                  </div>
                </div>
                <div className="flex h-7 items-center gap-2 border-t border-white/[0.06] bg-[#141414] px-3">
                  <div className="flex shrink-0 gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                  </div>
                  <div className="flex h-4 flex-1 items-center rounded-sm bg-[#2a2a2a] px-2">
                    <span className="truncate text-[9px] text-[#555]">
                      {artist.handle}.djhq.com
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/38">
                {artist.plan === "pro"
                  ? "Shown in browser tabs, bookmarks, and shared links. Leave blank to use your artist name."
                  : "Upgrade to Pro to set a custom browser title without the DJHQ suffix."}
              </p>
            </div>

            {/* Custom Favicon */}
            {artist.plan === "pro" && (
              <div className="space-y-2 border-t border-white/[0.04] pt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Custom Favicon
                </p>
                {faviconUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0a0a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faviconUrl} alt="Current favicon" className="h-8 w-8 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-foreground/55">{faviconUrl.split("/").pop()}</p>
                      <button
                        type="button"
                        onClick={() => setFaviconUrl("")}
                        className="mt-0.5 text-[10px] text-destructive/50 transition-colors hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
                <Input
                  id="faviconFile"
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  onChange={(event) => setFaviconFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  onClick={handleUploadFavicon}
                  disabled={!faviconFile || isUploadingFavicon || isSaving || isPublishing}
                  className="bg-secondary text-foreground hover:bg-secondary/80"
                >
                  {isUploadingFavicon ? "Uploading..." : "Upload favicon"}
                </Button>
                <p className="text-[10px] text-muted-foreground/38">
                  PNG, SVG, or WEBP. 512×512 recommended. Leave blank to use artist initials.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderLinks() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Links</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Social platforms and external links shown on your profile.</p>
        </div>
        <div className="space-y-3">
          {socialLinks.map((link, index) => (
            <div key={`${link.platform}-${index}`} className="rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-colors duration-150 hover:border-white/[0.09] sm:p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`link-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Platform
                  </label>
                  <Input
                    id={`link-platform-${index}`}
                    value={link.platform}
                    onChange={(event) =>
                      setSocialLinks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, platform: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`link-label-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Label
                  </label>
                  <Input
                    id={`link-label-${index}`}
                    value={link.label}
                    onChange={(event) =>
                      setSocialLinks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`link-url-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    URL
                  </label>
                  <Input
                    id={`link-url-${index}`}
                    value={link.url}
                    onChange={(event) =>
                      setSocialLinks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderReleases() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Releases</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">All releases shown on your profile. Star one to feature it at the top of your page.</p>
        </div>
        <div className="space-y-3">
          {releases.map((release, index) => (
            <div key={release.id} className={cn("rounded-xl border bg-card/40 p-4 transition-colors duration-150 sm:p-5", release.isFeatured ? "border-accent/25" : "border-white/[0.06] hover:border-white/[0.09]")}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {release.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={release.artworkUrl} alt="" className="h-9 w-9 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted-foreground/30">
                      <Music className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-none text-foreground">{release.title || <span className="text-muted-foreground/30">Untitled</span>}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/40">Release {index + 1}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetFeatured(index)}
                    disabled={isSaving || isPublishing}
                    title={release.isFeatured ? "Featured release" : "Set as featured"}
                    className={cn("h-7 w-7 p-0", release.isFeatured ? "text-accent" : "text-muted-foreground hover:text-accent")}
                  >
                    <Star className={cn("h-3.5 w-3.5", release.isFeatured && "fill-current")} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveRelease(index, "up")}
                    disabled={index === 0 || isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    title="Move up"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveRelease(index, "down")}
                    disabled={index === releases.length - 1 || isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    title="Move down"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRelease(index)}
                    disabled={isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    title="Remove"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 border-t border-white/[0.04] pt-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-title-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Title
                  </label>
                  <Input
                    id={`selected-release-title-${index}`}
                    value={release.title}
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-label-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Label
                  </label>
                  <Input
                    id={`selected-release-label-${index}`}
                    value={release.label}
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`selected-release-credits-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Artists
                  </label>
                  <Input
                    id={`selected-release-credits-${index}`}
                    value={release.credits}
                    placeholder="e.g. Artist 1, Artist 2"
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, credits: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-date-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Release Date
                  </label>
                  <DatePicker
                    value={release.releaseDate}
                    onChange={(v) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, releaseDate: v } : item,
                        ),
                      )
                    }
                    allowClear
                    triggerClassName="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-reltype-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Release Type
                  </label>
                  <select
                    id={`selected-release-reltype-${index}`}
                    value={release.releaseType}
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, releaseType: event.target.value } : item,
                        ),
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— None —</option>
                    {RELEASE_TYPE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-version-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Version / Mix Type
                  </label>
                  <select
                    id={`selected-release-version-${index}`}
                    value={release.versionType}
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, versionType: event.target.value, customVersionType: "" }
                            : item,
                        ),
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— None —</option>
                    {VERSION_TYPE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {release.versionType === "other" && (
                    <Input
                      placeholder="Custom version / mix type"
                      value={release.customVersionType}
                      onChange={(event) =>
                        setReleases((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, customVersionType: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  )}
                </div>
                {release.versionType === "remix" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor={`selected-release-remixer-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                    >
                      Remixer
                    </label>
                    <Input
                      id={`selected-release-remixer-${index}`}
                      placeholder="Artist name"
                      value={release.remixer}
                      onChange={(event) =>
                        setReleases((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, remixer: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                )}
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`selected-release-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Primary URL / Legacy URL
                  </label>
                  <Input
                    id={`selected-release-platform-${index}`}
                    value={release.platformUrl}
                    placeholder="https://..."
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, platformUrl: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <p className="text-[10px] text-muted-foreground/35">
                    Fallback when no platform-specific links are configured below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImportReleaseMetadata(index)}
                    disabled={
                      importingSelectedReleaseIndex === index ||
                      isSaving ||
                      isPublishing
                    }
                    className="border-border bg-background/70"
                  >
                    {importingSelectedReleaseIndex === index ? "Fetching..." : "Import metadata"}
                  </Button>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`selected-release-artwork-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                  >
                    Artwork URL
                  </label>
                  <Input
                    id={`selected-release-artwork-${index}`}
                    value={release.artworkUrl}
                    onChange={(event) =>
                      setReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, artworkUrl: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>

                {/* Platform Links */}
                <div className="space-y-3 border-t border-white/[0.04] pt-3 md:col-span-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                      Platform Links
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/35">
                      Only configured platforms appear in the Listen Now panel.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { key: "spotifyUrl",      label: "Spotify" },
                        { key: "appleMusicUrl",   label: "Apple Music" },
                        { key: "soundcloudUrl",   label: "SoundCloud" },
                        { key: "youtubeMusicUrl", label: "YouTube Music" },
                        { key: "beatportUrl",     label: "Beatport" },
                        { key: "traxsourceUrl",   label: "Traxsource" },
                        { key: "bandcampUrl",     label: "Bandcamp" },
                        { key: "otherUrl",        label: "Other" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] font-medium uppercase tracking-[0.10em] text-muted-foreground/40">
                          {label}
                        </label>
                        <Input
                          value={release[key]}
                          placeholder="https://..."
                          onChange={(event) =>
                            setReleases((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, [key]: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {releases.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Music className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No releases yet</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Add releases to showcase your discography. Star one to feature it at the top of your profile.</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddRelease}
            disabled={isSaving || isPublishing || importingSelectedReleaseIndex !== null}
            className="flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent/70 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add release
          </button>
        </div>
      </div>
    )
  }

  function handleAddGig() {
    const id = crypto.randomUUID()
    const d = new Date()
    d.setDate(d.getDate() + 28)
    setNewGigId(id)
    setUpcomingGigs((current) =>
      sortGigsByDate([
        ...current,
        { id, venue: "", date: d.toISOString().slice(0, 10), city: "", country: "", ticketUrl: undefined, flyerUrl: undefined, instagramUrl: undefined, feeAmount: null, feeCurrency: null, paymentStatus: null },
      ]),
    )
    setTimeout(() => {
      document.getElementById(`gig-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 150)
  }

  function handleDeleteGig(id: string) {
    setUpcomingGigs((current) => current.filter((g) => g.id !== id))
  }


  function renderGigs() {
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = upcomingGigs.filter((g) => g.date && g.date >= today)
    const past = upcomingGigs.filter((g) => !g.date || g.date < today)

    function handleGigChange(updated: GigFormState) {
      setUpcomingGigs((current) =>
        sortGigsByDate(current.map((g) => (g.id === updated.id ? updated : g))),
      )
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Gigs</h2>
            <p className="mt-0.5 text-sm text-muted-foreground/55">
              Up to 3 upcoming shows appear on your public profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddGig}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-foreground/70 transition-colors duration-150 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add show
          </button>
        </div>

        {/* Upcoming section */}
        <div className="space-y-2">
          {/* Editorial header: label + extending hairline */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
              Upcoming
            </span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {upcoming.map((gig) => (
                <GigAnimatedRow
                  key={gig.id}
                  gig={gig}
                  isNew={gig.id === newGigId}
                  newGigId={newGigId}
                  isPast={false}
                  onChange={handleGigChange}
                  onDelete={() => handleDeleteGig(gig.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {upcoming.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <div className="mb-3 flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                <span className="text-sm font-black leading-none text-foreground/18">—</span>
                <span className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-accent/20">
                  JUN
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground/45">No upcoming shows</p>
              <p className="mt-1 text-xs text-muted-foreground/30">
                Add a show to display it on your public profile.
              </p>
              <button
                type="button"
                onClick={handleAddGig}
                className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-foreground/60 transition-colors duration-150 hover:border-white/[0.12] hover:text-foreground/80"
              >
                Add your first show
              </button>
            </div>
          )}
        </div>

        {/* Past section — collapsible, editorial header with hairline */}
        {past.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPastGigsExpanded((v) => !v)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/30">
                Past
              </span>
              <span className="tabular-nums text-[10px] font-medium text-foreground/20">
                {past.length}
              </span>
              <span className="h-px flex-1 bg-white/[0.04]" />
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground/25 transition-transform duration-200",
                  pastGigsExpanded && "rotate-180",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {pastGigsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {past.map((gig) => (
                        <GigAnimatedRow
                          key={gig.id}
                          gig={gig}
                          isNew={gig.id === newGigId}
                          newGigId={newGigId}
                          isPast={true}
                          onChange={handleGigChange}
                          onDelete={() => handleDeleteGig(gig.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }

  function renderDjSets() {
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

    const performanceTypes: PerformanceType[] = ["dj_set", "live_set", "vinyl_set", "b2b", "b3b", "other"]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Performances</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Curated shows displayed on your profile. The first set is your <span className="font-medium text-foreground/60">Featured Show</span>; the rest appear as <span className="font-medium text-foreground/60">Selected Shows</span>.
          </p>
        </div>
        <div className="space-y-3">
          {djSets.map((set, index) => {
            const generatedTitle = computeDjSetTitle(
              set.performanceType,
              set.performanceArtists,
              set.customPerformanceType || undefined,
              set.event || undefined,
              set.venue || undefined,
              artist.artistName,
            )
            const displayTitle = set.titleOverride.trim() || generatedTitle
            const previewMeta = [
              PERFORMANCE_TYPE_LABELS[set.performanceType],
              set.event,
              set.city,
              set.venue,
              formatDjSetDate(set.setDate),
            ].filter(Boolean).join(" · ")
            const isAdvancedOpen = advancedOpenIds.has(set.id)

            return (
              <div key={set.id} className="rounded-xl border border-white/[0.06] bg-card/40 transition-colors duration-150 hover:border-white/[0.09]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {set.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={set.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted-foreground/30">
                        <Headphones className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-medium leading-none text-foreground">
                          {displayTitle || <span className="text-muted-foreground/30">Set {index + 1}</span>}
                        </p>
                        {index === 0 && (
                          <span className="shrink-0 rounded border border-accent/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent/60">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/40">
                        {previewMeta || `Set ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDjSet(index, "up")}
                      disabled={index === 0 || isSaving || isPublishing || importingDjSetIndex !== null}
                      title="Move up"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDjSet(index, "down")}
                      disabled={index === djSets.length - 1 || isSaving || isPublishing || importingDjSetIndex !== null}
                      title="Move down"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDjSet(index)}
                      disabled={isSaving || isPublishing || importingDjSetIndex !== null}
                      title="Remove"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4 border-t border-white/[0.04] px-4 py-4 sm:px-5">

                  {/* Row 1: Performance Type */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Type</p>
                    <div className="flex flex-wrap gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                      {performanceTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTypeChange(index, type)}
                          disabled={isSaving || isPublishing}
                          className={cn(
                            "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            set.performanceType === type
                              ? "bg-white/[0.07] text-foreground/75"
                              : "text-muted-foreground/30 hover:text-muted-foreground/50",
                          )}
                        >
                          {PERFORMANCE_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Artists */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artists</p>
                    <div className="space-y-2">
                      {set.performanceArtists.map((name, ai) => (
                        <div key={ai} className="flex gap-2">
                          <Input
                            value={name}
                            placeholder="Artist name"
                            onChange={(e) => {
                              const next = [...set.performanceArtists]
                              next[ai] = e.target.value
                              updateSet(index, { performanceArtists: next })
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const next = set.performanceArtists.filter((_, j) => j !== ai)
                              updateSet(index, { performanceArtists: next.length > 0 ? next : [""] })
                            }}
                            disabled={set.performanceArtists.length <= 1 || isSaving || isPublishing}
                            className="h-9 w-9 shrink-0 p-0 text-muted-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateSet(index, { performanceArtists: [...set.performanceArtists, ""] })}
                        disabled={isSaving || isPublishing}
                        className="flex items-center gap-1 text-xs text-accent/60 transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                        Add artist
                      </button>
                    </div>
                  </div>

                  {/* Custom type — only for "other" */}
                  {set.performanceType === "other" && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-custom-type-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Custom Type
                      </label>
                      <Input
                        id={`djset-custom-type-${index}`}
                        value={set.customPerformanceType}
                        placeholder="Radio show, podcast, guest mix…"
                        onChange={(e) => updateSet(index, { customPerformanceType: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Row 3: Date · Venue · City · Event */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-date-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Date
                      </label>
                      <DatePicker
                        value={set.setDate ?? ""}
                        onChange={(v) => updateSet(index, { setDate: v })}
                        allowClear
                        triggerClassName="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                        Venue
                      </label>
                      <VenueAutocomplete
                        value={set.venue}
                        onChange={(v) => updateSet(index, { venue: v })}
                        onSelect={(entry) => updateSet(index, { venue: entry.name })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-city-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                      >
                        City
                      </label>
                      <Input
                        id={`djset-city-${index}`}
                        value={set.city}
                        placeholder="Santiago, Berlin…"
                        onChange={(e) => updateSet(index, { city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-event-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Event
                      </label>
                      <Input
                        id={`djset-event-${index}`}
                        value={set.event}
                        placeholder="MISA, Boiler Room…"
                        onChange={(e) => updateSet(index, { event: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 4: Platform URL · Thumbnail URL */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-platform-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Platform URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id={`djset-platform-${index}`}
                          value={set.platformUrl}
                          placeholder="soundcloud.com/…"
                          onChange={(e) => updateSet(index, { platformUrl: e.target.value })}
                          className="min-w-0 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImportDjSetMetadata(index)}
                          disabled={importingDjSetIndex === index || isSaving || isPublishing}
                          className="shrink-0 border-border bg-background/70 text-xs"
                          title="Import thumbnail from SoundCloud or YouTube"
                        >
                          {importingDjSetIndex === index ? "…" : "Import"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-image-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                      >
                        Thumbnail URL
                      </label>
                      <Input
                        id={`djset-image-${index}`}
                        value={set.imageUrl}
                        placeholder="https://…"
                        onChange={(e) => updateSet(index, { imageUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Advanced section — Title Override */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced(set.id)}
                      className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40 transition-colors hover:text-muted-foreground/60"
                    >
                      <ChevronDown className={cn("h-3 w-3 transition-transform duration-150", isAdvancedOpen ? "rotate-180" : "")} />
                      Advanced
                    </button>
                    {isAdvancedOpen && (
                      <div className="space-y-1.5 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3">
                        <label
                          htmlFor={`djset-override-${index}`}
                          className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60"
                        >
                          Title Override
                        </label>
                        <Input
                          id={`djset-override-${index}`}
                          value={set.titleOverride}
                          placeholder={generatedTitle}
                          onChange={(e) => updateSet(index, { titleOverride: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground/35">
                          Replaces the generated title on your public profile. Leave empty to use the generated title.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Show on profile */}
                  <div className="flex items-center gap-2">
                    <input
                      id={`djset-published-${index}`}
                      type="checkbox"
                      checked={set.isPublished}
                      onChange={(e) => updateSet(index, { isPublished: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor={`djset-published-${index}`} className="text-sm text-foreground">
                      Show on public profile
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
          {djSets.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Headphones className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No sets added</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Add a set and fill in the performance details to generate an editorial title.</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddDjSet}
            disabled={isSaving || isPublishing || importingDjSetIndex !== null}
            className="flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent/70 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add set
          </button>
        </div>
      </div>
    )
  }

  function renderVideos() {
    function updateVideo(index: number, patch: Partial<VideoFormState>) {
      setVideos((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Videos</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">YouTube performance videos shown on your public profile. First video is featured.</p>
        </div>
        <div className="space-y-3">
          {videos.map((video, index) => {
            const filledArtists = video.videoArtists.filter(Boolean)
            const generatedTitle = computeVideoTitle(filledArtists, video.videoEvent || undefined, video.venue || undefined, artist.artistName)
            const displayTitle = generatedTitle || video.title || null
            return (
            <div key={video.id} className="rounded-xl border border-white/[0.06] bg-card/40 transition-colors duration-150 hover:border-white/[0.09]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {(video.customThumbnailUrl ?? video.thumbnailUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(video.customThumbnailUrl ?? video.thumbnailUrl)!} alt="" className="h-9 w-16 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
                  ) : (
                    <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted-foreground/30">
                      <Play className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium leading-none text-foreground">
                        {displayTitle ?? <span className="text-muted-foreground/30">Video {index + 1}</span>}
                      </p>
                      {index === 0 && (
                        <span className="shrink-0 rounded border border-accent/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent/60">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground/40">
                      {[video.videoEvent, video.venue].filter(Boolean).join(" · ") || `Video ${index + 1}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveVideo(index, "up")}
                    disabled={index === 0 || isSaving || isPublishing || importingVideoIndex !== null}
                    title="Move up"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveVideo(index, "down")}
                    disabled={index === videos.length - 1 || isSaving || isPublishing || importingVideoIndex !== null}
                    title="Move down"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveVideo(index)}
                    disabled={isSaving || isPublishing || importingVideoIndex !== null}
                    title="Remove"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4 border-t border-white/[0.04] px-4 py-4 sm:px-5">

                {/* Artists */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Artists</p>
                  <div className="space-y-2">
                    {video.videoArtists.map((name, ai) => (
                      <div key={ai} className="flex gap-2">
                        <Input
                          value={name}
                          placeholder="Artist name"
                          onChange={(e) => {
                            const next = [...video.videoArtists]
                            next[ai] = e.target.value
                            updateVideo(index, { videoArtists: next })
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = video.videoArtists.filter((_, j) => j !== ai)
                            updateVideo(index, { videoArtists: next.length > 0 ? next : [""] })
                          }}
                          disabled={video.videoArtists.length <= 1 || isSaving || isPublishing}
                          className="h-9 w-9 shrink-0 p-0 text-muted-foreground/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateVideo(index, { videoArtists: [...video.videoArtists, ""] })}
                      disabled={isSaving || isPublishing}
                      className="flex items-center gap-1 text-xs text-accent/60 transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      Add artist
                    </button>
                  </div>
                </div>

                {/* Event · Venue · Date */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`video-event-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                    >
                      Event
                    </label>
                    <Input
                      id={`video-event-${index}`}
                      value={video.videoEvent}
                      placeholder="Boiler Room, ICE…"
                      onChange={(e) => updateVideo(index, { videoEvent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`video-venue-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                    >
                      Venue
                    </label>
                    <Input
                      id={`video-venue-${index}`}
                      value={video.venue}
                      placeholder="Club, stage…"
                      onChange={(e) => updateVideo(index, { venue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`video-date-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                    >
                      Date
                    </label>
                    <DatePicker
                      value={video.videoDate ?? ""}
                      onChange={(v) => updateVideo(index, { videoDate: v })}
                      allowClear
                      triggerClassName="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3"
                    />
                  </div>
                </div>

                {/* City · Country (optional) */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`video-city-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                    >
                      City
                    </label>
                    <Input
                      id={`video-city-${index}`}
                      value={video.videoCity}
                      placeholder="Santiago, Berlin…"
                      onChange={(e) => updateVideo(index, { videoCity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`video-country-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                    >
                      Country
                    </label>
                    <Input
                      id={`video-country-${index}`}
                      value={video.videoCountry}
                      placeholder="CL, DE…"
                      onChange={(e) => updateVideo(index, { videoCountry: e.target.value })}
                    />
                  </div>
                </div>

                {/* Platform URL */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Video URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id={`video-platform-${index}`}
                      value={video.platformUrl}
                      placeholder="youtube.com/watch?v=…"
                      onChange={(e) => updateVideo(index, { platformUrl: e.target.value })}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportVideoMetadata(index)}
                      disabled={importingVideoIndex === index || isSaving || isPublishing}
                      className="shrink-0 border-border bg-background/70 text-xs"
                      title="Import thumbnail from YouTube"
                    >
                      {importingVideoIndex === index ? "…" : "Import"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/35">
                    Paste a YouTube link — thumbnail is filled automatically when available.
                  </p>
                </div>

                {/* Thumbnail URL */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-thumbnail-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                  >
                    Thumbnail URL
                  </label>
                  <Input
                    id={`video-thumbnail-${index}`}
                    value={video.thumbnailUrl}
                    onChange={(e) => updateVideo(index, { thumbnailUrl: e.target.value })}
                  />
                </div>
                {/* Custom Thumbnail — PRO only */}
                <div className={`space-y-2 rounded-lg border border-white/[0.05] p-3 md:col-span-2 ${artist.plan !== "pro" ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                      Custom Cover
                    </p>
                    {artist.plan !== "pro" && (
                      <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-accent/50">
                        PRO
                      </span>
                    )}
                    {video.customThumbnailUrl && artist.plan === "pro" && (
                      <button
                        type="button"
                        onClick={() =>
                          setVideos((current) =>
                            current.map((item, i) => (i === index ? { ...item, customThumbnailUrl: null } : item)),
                          )
                        }
                        className="text-[10px] text-muted-foreground/40 transition-colors hover:text-destructive/60"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {video.customThumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.customThumbnailUrl}
                      alt="Custom cover"
                      className="aspect-video w-full rounded-md object-cover"
                    />
                  ) : (
                    <p className="text-[11px] text-muted-foreground/35">
                      Upload your own event cover or cinematic thumbnail. Overrides the YouTube thumbnail on your profile.
                    </p>
                  )}
                  {artist.plan === "pro" && (
                    <label
                      className={`flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60 ${uploadingVideoThumbnailIndex === index ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            void handleUploadVideoThumbnail(index, file)
                          }
                          e.target.value = ""
                        }}
                        disabled={uploadingVideoThumbnailIndex !== null || isSaving || isPublishing}
                      />
                      {uploadingVideoThumbnailIndex === index ? "Uploading..." : "Upload cover image"}
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id={`video-published-${index}`}
                    type="checkbox"
                    checked={video.isPublished}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, isPublished: event.target.checked } : item)),
                      )
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor={`video-published-${index}`} className="text-sm text-foreground">
                    Show on public profile
                  </label>
                </div>
              </div>
            </div>
            )
          })}
          {videos.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Play className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No videos added</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Paste a YouTube link to import your performance videos.</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddVideo}
            disabled={isSaving || isPublishing || importingVideoIndex !== null}
            className="flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent/70 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add video
          </button>
        </div>
      </div>
    )
  }

  function renderGallery() {
    const busy = isReorderingGallery || !!deletingGalleryImageId || isUploadingGalleryImage || isSaving || isPublishing || isSavingFocalPoints

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Gallery</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Press and event photography shown on your public profile.</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {galleryImages.map((image, index) => {
              const isFocalDirty = focalDirtyIds.has(image.id)
              return (
                <div key={image.id} className="space-y-2">
                  {/* Image preview with focal point editor */}
                  <div className="group relative">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Click to set focal point"
                      title="Click to set focal point"
                      className="relative aspect-[4/5] cursor-crosshair overflow-hidden rounded-lg border border-white/[0.06] bg-secondary/40 select-none"
                      onClick={(e) => !busy && handleSetFocalPoint(image.id, e)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !busy) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const syntheticEvent = { currentTarget: e.currentTarget, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 } as React.MouseEvent<HTMLDivElement>
                          handleSetFocalPoint(image.id, syntheticEvent)
                        }
                      }}
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        sizes="200px"
                        className="pointer-events-none object-cover"
                        style={{ objectPosition: `${image.focalX ?? 50}% ${image.focalY ?? 50}%` }}
                      />
                      {/* Focal point crosshair */}
                      <div
                        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                        style={{ left: `${image.focalX ?? 50}%`, top: `${image.focalY ?? 50}%` }}
                      >
                        <div className="absolute inset-0 rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" />
                        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/60" />
                        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/60" />
                      </div>
                      {/* Hover hint */}
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2 pt-6 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/70">Click to set focal</span>
                      </div>
                    </div>
                    {isFocalDirty && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-accent/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-black">
                        unsaved
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs text-muted-foreground">{image.altText}</p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorderGalleryImage(index, "up")}
                        disabled={index === 0 || busy}
                        title="Move up"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorderGalleryImage(index, "down")}
                        disabled={index === galleryImages.length - 1 || busy}
                        title="Move down"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGalleryImage(image.id)}
                        disabled={deletingGalleryImageId === image.id || busy}
                        title="Delete"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {isGalleryFocalDirty && (
            <p className="text-[10px] text-accent/60 tracking-[0.06em]">Focal point changes will be saved when you click Save.</p>
          )}
          <div className="rounded-xl border border-white/[0.06] bg-card/30 p-4 sm:p-5">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="galleryImageFile"
                  className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                >
                  Upload Gallery Image
                </label>
                <Input
                  id="galleryImageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      setGalleryFileError("Only JPEG, PNG, and WEBP images are supported.")
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
                        if (img.naturalWidth < 2400) {
                          setGalleryImageSmallWarning(
                            "This image may look soft in the large press photo slot. Recommended width: 2400px+",
                          )
                        }
                      }
                      img.onerror = () => URL.revokeObjectURL(objectUrl)
                      img.src = objectUrl
                    }
                  }}
                />
                {galleryFileError && (
                  <p className="text-xs text-destructive/80">{galleryFileError}</p>
                )}
                {galleryImageSmallWarning && !galleryFileError && (
                  <p className="text-xs text-amber-400/80">{galleryImageSmallWarning}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="galleryImageAltText"
                  className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                >
                  Alt Text
                </label>
                <Input
                  id="galleryImageAltText"
                  value={galleryImageAltText}
                  onChange={(event) => setGalleryImageAltText(event.target.value)}
                  placeholder="Live set photo, press portrait, or stage moment"
                />
              </div>
              <Button
                type="button"
                onClick={handleUploadGalleryImage}
                disabled={!galleryImageFile || busy}
                className="bg-secondary text-foreground hover:bg-secondary/80"
              >
                {isUploadingGalleryImage ? "Uploading..." : "Upload gallery image"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPG, PNG, WEBP. Recommended size: up to 20 MB. Images are compressed and resized to max 3000 × 3000 px before upload.
              </p>
            </div>
          </div>
        </div>
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

  function renderBooking() {
    const emailInvalid = Boolean(bookingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail))
    const bookingUrlInvalid = Boolean(bookingUrl && !bookingUrl.startsWith("http"))

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Booking</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Contact details shown to promoters and venues.
          </p>
        </div>

        {/* Booking contact */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="bookingEmail" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Booking Email
              </label>
              <Input
                id="bookingEmail"
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="booking@artist.com"
              />
              {emailInvalid && (
                <p className="text-[10px] text-amber-400/60">Enter a valid email address.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bookingUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Booking URL
              </label>
              <Input
                id="bookingUrl"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://artist.com/booking"
              />
              {bookingUrlInvalid && (
                <p className="text-[10px] text-amber-400/60">Should start with https://</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderPressKit() {
    const pressKitUrlInvalid = Boolean(pressKitEnabled && pressKitUrl && !pressKitUrl.startsWith("http"))

    const activeDomain = customDomains.find((d) => d.status === "active")
    const pressKitPublicUrl = activeDomain
      ? `https://${activeDomain.domain}/presskit`
      : `${APP_DISPLAY_HOST}/${artist.handle}/presskit`

    const optionalLinks = [
      { label: "Bio & Text",      ok: Boolean(pressKitBioFolderUrl.trim()) },
      { label: "Logos & Artwork", ok: Boolean(pressKitLogosFolderUrl.trim()) },
      { label: "Press Photos",    ok: Boolean(pressKitMediaFolderUrl.trim()) },
      { label: "Technical Rider", ok: Boolean(pressKitRiderFolderUrl.trim()) },
      { label: "English PDF",     ok: Boolean(pressKitPdfEnUrl.trim()) },
      { label: "Spanish PDF",     ok: Boolean(pressKitPdfEsUrl.trim()) },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Press Kit</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Your EPK page is live at{" "}
            <span className="font-mono text-foreground/50">{pressKitPublicUrl}</span>.
          </p>
        </div>

        {/* Status toggle */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Status</p>
              <p className="mt-0.5 text-xs text-muted-foreground/45">
                Enable to make your EPK page publicly accessible.
              </p>
            </div>
            <div
              role="group"
              aria-label="Press kit enabled"
              className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5"
            >
              <button
                type="button"
                onClick={() => setPressKitEnabled(true)}
                aria-pressed={pressKitEnabled}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                  pressKitEnabled
                    ? "bg-accent/[0.15] text-accent/80"
                    : "text-muted-foreground/25 hover:text-muted-foreground/45",
                )}
              >
                On
              </button>
              <button
                type="button"
                onClick={() => setPressKitEnabled(false)}
                aria-pressed={!pressKitEnabled}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                  !pressKitEnabled
                    ? "bg-white/[0.06] text-foreground/60"
                    : "text-muted-foreground/25 hover:text-muted-foreground/45",
                )}
              >
                Off
              </button>
            </div>
          </div>
        </div>

        {/* All fields — dimmed when off */}
        <div className={cn("space-y-4 transition-opacity duration-200", !pressKitEnabled && "pointer-events-none opacity-35")}>

          {/* ── Press Kit Source ──────────────────────────────────────── */}
          <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Root Folder</p>
                <p className="mt-0.5 text-xs text-muted-foreground/45">
                  Link your Google Drive press kit folder. Organize it like:
                </p>
                <pre className="mt-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground/40">
{`PRESSKIT-ARTIST/
├── BIO/
├── LOGOS/
├── MEDIA/
├── RIDER & HOSPITALITY/
├── ENG_ARTIST_PRESSKIT.pdf
└── ESP_ARTIST_PRESSKIT.pdf`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pressKitRootUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Google Drive Root Folder URL
                </label>
                <Input
                  id="pressKitRootUrl"
                  value={pressKitRootUrl}
                  onChange={(e) => setPressKitRootUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  disabled={!pressKitEnabled}
                />
              </div>

              {/* ── Asset status ────────────────────────────────── */}
              {pressKitRootUrl.trim() ? (
                <div className="space-y-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                    <span className="text-sm text-foreground/65">Root folder configured</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">
                    Optional asset links can be added in Advanced Settings below for individual download buttons on your press kit page.
                  </p>
                  {optionalLinks.some((l) => l.ok) && (
                    <div className="mt-2 space-y-1 border-t border-white/[0.05] pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/35">
                        Optional links configured
                      </p>
                      {optionalLinks.filter((l) => l.ok).map(({ label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <Check className="h-3 w-3 shrink-0 text-accent/50" />
                          <span className="text-xs text-foreground/55">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/35">
                  No root folder set. Visitors will see your bio, photos, and any individual links you configure below.
                </p>
              )}
            </div>
          </div>

          {/* ── Press Photos ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Press Photos</p>
                <p className="mt-0.5 text-xs text-muted-foreground/45">
                  Show gallery images in the press kit photo grid.
                </p>
              </div>
              <div
                role="group"
                aria-label="Use gallery photos"
                className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setPressKitUseGalleryPhotos(true)}
                  aria-pressed={pressKitUseGalleryPhotos}
                  disabled={!pressKitEnabled}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                    pressKitUseGalleryPhotos
                      ? "bg-accent/[0.15] text-accent/80"
                      : "text-muted-foreground/25 hover:text-muted-foreground/45",
                  )}
                >
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setPressKitUseGalleryPhotos(false)}
                  aria-pressed={!pressKitUseGalleryPhotos}
                  disabled={!pressKitEnabled}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                    !pressKitUseGalleryPhotos
                      ? "bg-white/[0.06] text-foreground/60"
                      : "text-muted-foreground/25 hover:text-muted-foreground/45",
                  )}
                >
                  Hidden
                </button>
              </div>
            </div>
          </div>

          {/* ── Advanced Settings ─────────────────────────────────────── */}
          <div className="rounded-xl border border-white/[0.06] bg-card/40 overflow-hidden transition-colors duration-150 hover:border-white/[0.09]">
            <button
              type="button"
              onClick={() => setPressKitAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 sm:px-6"
            >
              <span className="text-sm font-semibold text-foreground/70">Advanced Settings</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground/40 transition-transform duration-200",
                  pressKitAdvancedOpen && "rotate-180",
                )}
              />
            </button>

            {pressKitAdvancedOpen && (
              <div className="space-y-5 border-t border-white/[0.05] px-5 pb-5 pt-4 sm:px-6">

                {/* Asset folder URLs */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Asset Folders
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(
                      [
                        { label: "Bio & Text", value: pressKitBioFolderUrl, setter: setPressKitBioFolderUrl },
                        { label: "Logos & Artwork", value: pressKitLogosFolderUrl, setter: setPressKitLogosFolderUrl },
                        { label: "Press Photos", value: pressKitMediaFolderUrl, setter: setPressKitMediaFolderUrl },
                        { label: "Technical Rider", value: pressKitRiderFolderUrl, setter: setPressKitRiderFolderUrl },
                      ] as const
                    ).map(({ label, value, setter }) => (
                      <div key={label} className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                          {label}
                        </label>
                        <Input
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/…"
                          disabled={!pressKitEnabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF URLs */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    PDF Downloads
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">English PDF URL</label>
                      <Input value={pressKitPdfEnUrl} onChange={(e) => setPressKitPdfEnUrl(e.target.value)} placeholder="https://…/epk-en.pdf" disabled={!pressKitEnabled} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">English PDF Size</label>
                      <Input value={pressKitPdfEnSize} onChange={(e) => setPressKitPdfEnSize(e.target.value)} placeholder="e.g. 4.2 MB" disabled={!pressKitEnabled} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Spanish PDF URL</label>
                      <Input value={pressKitPdfEsUrl} onChange={(e) => setPressKitPdfEsUrl(e.target.value)} placeholder="https://…/epk-es.pdf" disabled={!pressKitEnabled} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">Spanish PDF Size</label>
                      <Input value={pressKitPdfEsSize} onChange={(e) => setPressKitPdfEsSize(e.target.value)} placeholder="e.g. 3.8 MB" disabled={!pressKitEnabled} />
                    </div>
                  </div>
                </div>

                {/* Legacy download URL */}
                <div className="space-y-1.5">
                  <label htmlFor="pressKitUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                    Legacy Download URL
                  </label>
                  <Input
                    id="pressKitUrl"
                    value={pressKitUrl}
                    onChange={(e) => setPressKitUrl(e.target.value)}
                    placeholder="https://artist.com/epk"
                    disabled={!pressKitEnabled}
                  />
                  {pressKitUrlInvalid && (
                    <p className="text-[10px] text-amber-400/60">Should start with https://</p>
                  )}
                </div>

                {/* Assets chips */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Assets Included
                  </p>
                  {pressKitAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pressKitAssets.map((asset, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-foreground/60"
                        >
                          {asset}
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(i)}
                            aria-label={`Remove ${asset}`}
                            className="leading-none text-muted-foreground/30 transition-colors duration-100 hover:text-foreground/60"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAssetInput}
                      onChange={(e) => setNewAssetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddAsset()
                        }
                      }}
                      placeholder="Add asset… e.g. Press photos"
                      disabled={!pressKitEnabled}
                      aria-label="New asset name"
                      className={cn(
                        "h-9 min-w-0 flex-1 rounded-lg border border-white/[0.07] bg-white/[0.025]",
                        "px-3 text-sm font-medium text-foreground",
                        "placeholder:text-muted-foreground/30",
                        "outline-none transition-colors duration-150",
                        "focus:border-white/[0.14] focus:bg-white/[0.04]",
                        "disabled:cursor-not-allowed",
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddAsset}
                      disabled={!pressKitEnabled || !newAssetInput.trim()}
                      aria-label="Add asset"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-muted-foreground/40 transition-colors duration-150 hover:border-white/[0.12] hover:text-foreground/60 disabled:cursor-not-allowed disabled:opacity-25"
                    >
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
        <div>
          <h2 className="text-base font-semibold text-foreground">Publish</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Control whether your profile is visible to the public.</p>
        </div>
        <div className="space-y-5 rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                artist.isPublished
                  ? "border-accent/20 bg-accent/10 text-accent"
                  : "border-white/[0.06] bg-secondary/40 text-muted-foreground"
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

  function renderCustomDomain() {
    const isPro = artist.plan === "pro"

    const statusBadge = (status: string) => {
      const styles: Record<string, string> = {
        active:    "border-accent/20 bg-accent/10 text-accent",
        verified:  "border-white/[0.08] bg-secondary/40 text-muted-foreground",
        pending:   "border-white/[0.08] bg-secondary/40 text-muted-foreground",
        verifying: "border-white/[0.08] bg-secondary/40 text-muted-foreground/60",
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
      <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02]">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4 border-b border-white/[0.04] px-3 py-2 last:border-0">
            <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{label}</span>
            <span className="break-all font-mono text-xs text-foreground/75">{value}</span>
          </div>
        ))}
      </div>
    )

    if (!isPro) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Custom Domain</h2>
            <p className="mt-1 text-sm text-muted-foreground/60">Connect an apex domain you own to your DJHQ profile.</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-card/30 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/60">Pro feature</p>
            <h3 className="mt-2 text-sm font-semibold text-foreground">Available on Pro</h3>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Upgrade to Pro to connect a custom domain like{" "}
              <span className="font-mono text-foreground/70">yourname.com</span> to your DJHQ profile.
            </p>
            <a
              href="mailto:hello@djhq.com"
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
          <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09]">
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
          <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09]">
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
                  href="mailto:hello@djhq.com"
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
        <div className="rounded-xl border border-white/[0.06] bg-card/30 p-4">
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
      case "booking":
        return renderBooking()
      case "press-kit":
        return renderPressKit()
      case "domain":        // renamed from "custom-domain"
        return renderCustomDomain()
      case "publish":
        return renderPublish()
      default:
        return renderHome()
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <span className="text-xs font-bold text-accent-foreground">DJ</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">DJHQ</span>
          </button>
          <span className="select-none text-border">/</span>
          <p className="min-w-0 truncate text-sm text-muted-foreground">{artist.artistName}</p>
          <div className="flex-1" />
          <span
            className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
              artist.isPublished
                ? "border-accent/20 bg-accent/10 text-accent"
                : "border-white/[0.06] bg-secondary/40 text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${artist.isPublished ? "bg-accent" : "bg-muted-foreground/40"}`}
            />
            {artist.isPublished ? "Published" : "Draft"}
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <Link href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Sign out</span>
          </Button>
          <Button
            size="sm"
            disabled={
              !isSaveDirty ||
              isSaving ||
              isPublishing ||
              importingSelectedReleaseIndex !== null ||
              importingVideoIndex !== null ||
              isUploadingHeroImage ||
              isUploadingGalleryImage
            }
            onClick={handleSaveChanges}
            className={`relative transition-all duration-200 ${
              isSaving
                ? "bg-accent/60 text-accent-foreground/70"
                : isSaveDirty
                  ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:bg-accent/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
          >
            {isSaveDirty && !isSaving && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-foreground ring-[1.5px] ring-background" />
            )}
            {savedRecently && !isSaveDirty && !isSaving ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving…" : savedRecently && !isSaveDirty ? "Saved" : "Save"}
          </Button>
        </div>
        {(saveMessage || statusMessage) ? (
          <div className="border-t border-white/[0.04] px-4 py-1.5 sm:px-6">
            <p className={`text-xs ${saveMessage && !saveMessage.startsWith("Changes") && !saveMessage.startsWith("Release") && !saveMessage.startsWith("DJ set") && !saveMessage.startsWith("Video") && !saveMessage.startsWith("Gallery") ? "text-destructive/70" : "text-muted-foreground"}`}>
              {saveMessage || statusMessage}
            </p>
          </div>
        ) : null}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          {navGroups.flatMap((group) => group.items).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs transition-colors duration-150 ${
                activeSection === item.id
                  ? "bg-accent/10 font-medium text-accent"
                  : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-[176px] shrink-0 lg:block">
            <nav className="sticky top-20 space-y-3">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/30">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={activeSection === item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`relative w-full rounded-md py-1.5 text-left text-sm transition-all duration-150 ${
                          activeSection === item.id
                            ? "bg-accent/[0.08] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                        }`}
                      >
                        {activeSection === item.id && (
                          <span className="absolute inset-y-0.5 left-0 w-0.5 rounded-full bg-accent" />
                        )}
                        <span className="block px-3">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">{renderActiveSection()}</div>
        </div>
      </div>
    </main>
  )
}
