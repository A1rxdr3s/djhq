"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown, ArrowUp, Check, ChevronDown, ExternalLink, Globe, Headphones, LogOut, Mail, Music, Play, Plus, Save, Trash2 } from "lucide-react"
import type { Artist, DjSet, GalleryImage, ReleaseType, SocialPlatform, Video } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GigCard } from "@/components/dashboard/gig-card"
import { VenueAutocomplete } from "@/components/dashboard/venue-autocomplete"

// Canonical app host used for display copy. Controlled by NEXT_PUBLIC_APP_URL in production.
const APP_DISPLAY_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.vercel.app")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")

type NavGroup = { label: string; items: { id: string; label: string }[] }

const navGroups: NavGroup[] = [
  {
    label: "Profile",
    items: [
      { id: "overview", label: "Overview" },
      { id: "profile", label: "Profile" },
      { id: "links", label: "Links" },
      { id: "gallery", label: "Gallery" },
    ],
  },
  {
    label: "Music",
    items: [
      { id: "featured-release", label: "Featured Release" },
      { id: "selected-releases", label: "Selected Releases" },
    ],
  },
  {
    label: "Live",
    items: [
      { id: "gigs", label: "Gigs" },
      { id: "dj-sets", label: "DJ Sets" },
      { id: "videos", label: "Videos" },
    ],
  },
  {
    label: "Publishing",
    items: [
      { id: "booking", label: "Booking" },
      { id: "custom-domain", label: "Custom Domain" },
      { id: "publish", label: "Publish" },
    ],
  },
]


type SocialLinkFormState = {
  platform: string
  label: string
  url: string
}

type FeaturedReleaseFormState = {
  title: string
  label: string
  credits: string
  releaseDate: string
  type: string
  platformUrl: string
  artworkUrl: string
}

type SelectedReleaseFormState = FeaturedReleaseFormState & {
  id: string
  spotifyUrl: string
  beatportUrl: string
  appleMusicUrl: string
  soundcloudUrl: string
  youtubeMusicUrl: string
  bandcampUrl: string
  otherUrl: string
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
  title: string
  venue: string
  event: string
  setDate: string
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
  title: string
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

function getFeaturedReleaseFormState(artist: Artist): FeaturedReleaseFormState | null {
  return artist.featuredRelease
    ? {
        title: artist.featuredRelease.title,
        label: artist.featuredRelease.label,
        credits: artist.featuredRelease.credits ?? "",
        releaseDate: toDateInputValue(artist.featuredRelease.releaseDate),
        type: artist.featuredRelease.type,
        platformUrl: artist.featuredRelease.platformUrl,
        artworkUrl: artist.featuredRelease.artworkUrl,
      }
    : null
}

function getSelectedReleaseFormState(artist: Artist): SelectedReleaseFormState[] {
  return artist.selectedReleases.map((release) => ({
    id: release.id,
    title: release.title,
    label: release.label,
    credits: release.credits ?? "",
    releaseDate: toDateInputValue(release.releaseDate),
    type: release.type,
    platformUrl: release.platformUrl,
    artworkUrl: release.artworkUrl,
    spotifyUrl: release.spotifyUrl ?? "",
    beatportUrl: release.beatportUrl ?? "",
    appleMusicUrl: release.appleMusicUrl ?? "",
    soundcloudUrl: release.soundcloudUrl ?? "",
    youtubeMusicUrl: release.youtubeMusicUrl ?? "",
    bandcampUrl: release.bandcampUrl ?? "",
    otherUrl: release.otherUrl ?? "",
  }))
}

function createEmptySelectedRelease(): SelectedReleaseFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    title: "",
    label: "",
    credits: "",
    releaseDate: "",
    type: "",
    platformUrl: "",
    artworkUrl: "",
    spotifyUrl: "",
    beatportUrl: "",
    appleMusicUrl: "",
    soundcloudUrl: "",
    youtubeMusicUrl: "",
    bandcampUrl: "",
    otherUrl: "",
  }
}

function mergeImportedReleaseFields<T extends FeaturedReleaseFormState>(
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
    title: result.title?.trim() || current.title,
    imageUrl: result.artworkUrl?.trim() || current.imageUrl,
    platformUrl: result.platformUrl || current.platformUrl,
    // Only fill date/venue/event if they aren't already set
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
    title: set.title,
    venue: set.venue ?? "",
    event: set.event ?? "",
    setDate: set.setDate ? toDateInputValue(set.setDate) : "",
    imageUrl: set.imageUrl ?? "",
    platformUrl: set.platformUrl,
    isPublished: set.isPublished,
  }))
}

function createEmptyDjSet(): DjSetFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    title: "",
    venue: "",
    event: "",
    setDate: "",
    imageUrl: "",
    platformUrl: "",
    isPublished: true,
  }
}

function getVideoFormState(artist: Artist): VideoFormState[] {
  return artist.videos.map((video) => ({
    id: video.id,
    title: video.title,
    venue: video.venue ?? "",
    videoDate: video.videoDate ? toDateInputValue(video.videoDate) : "",
    thumbnailUrl: video.thumbnailUrl ?? "",
    customThumbnailUrl: video.customThumbnailUrl ?? null,
    platformUrl: video.platformUrl,
    isPublished: video.isPublished,
  }))
}

function createEmptyVideo(): VideoFormState {
  return {
    id: `new-${crypto.randomUUID()}`,
    title: "",
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

// Resizes and re-encodes a File to WebP (JPEG fallback) at max 2000×2000, quality 0.82.
// Runs entirely in the browser — no server round-trip for the image bytes.
function compressGalleryImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 2000
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
            0.82,
          )
        },
        "image/webp",
        0.82,
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
    title: result.title?.trim() || current.title,
    thumbnailUrl: result.thumbnailUrl?.trim() || current.thumbnailUrl,
    platformUrl: result.platformUrl || current.platformUrl,
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
  const initialFeaturedRelease = getFeaturedReleaseFormState(artist)
  const initialSelectedReleases = getSelectedReleaseFormState(artist)
  const initialUpcomingGigs = getGigFormState(artist)
  const [activeSection, setActiveSection] = useState("overview")
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
  const [heroLogoFile, setHeroLogoFile] = useState<File | null>(null)
  const [isUploadingHeroLogo, setIsUploadingHeroLogo] = useState(false)
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks)
  const [featuredRelease, setFeaturedRelease] = useState(initialFeaturedRelease)
  const [selectedReleases, setSelectedReleases] = useState(initialSelectedReleases)
  const [upcomingGigs, setUpcomingGigs] = useState(initialUpcomingGigs)
  const [newGigId, setNewGigId] = useState<string | null>(null)
  const [bookingEmail, setBookingEmail] = useState(initialArtist.bookingInfo.email)
  const [bookingUrl, setBookingUrl] = useState(initialArtist.bookingInfo.bookingUrl ?? "")
  const [pressKitEnabled, setPressKitEnabled] = useState(initialArtist.pressKit.enabled)
  const [pressKitUrl, setPressKitUrl] = useState(initialArtist.pressKit.downloadUrl)
  const [pressKitAssets, setPressKitAssets] = useState<string[]>(initialArtist.pressKit.assetsIncluded)
  const [newAssetInput, setNewAssetInput] = useState("")
  const [pastGigsExpanded, setPastGigsExpanded] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return initialUpcomingGigs.filter((g) => g.date && g.date < today).length <= 5
  })
  const initialDjSets = getDjSetFormState(artist)
  const [djSets, setDjSets] = useState(initialDjSets)
  const initialVideos = getVideoFormState(artist)
  const [videos, setVideos] = useState(initialVideos)
  const [saveMessage, setSaveMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isImportingReleaseMetadata, setIsImportingReleaseMetadata] = useState(false)
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
    heroTextStyle !== (artist.heroTextStyle ?? "default")
  const isLinksDirty = JSON.stringify(socialLinks) !== JSON.stringify(initialSocialLinks)
  const isFeaturedReleaseDirty = JSON.stringify(featuredRelease) !== JSON.stringify(initialFeaturedRelease)
  const isSelectedReleasesDirty = JSON.stringify(selectedReleases) !== JSON.stringify(initialSelectedReleases)
  const isGigsDirty = JSON.stringify(upcomingGigs) !== JSON.stringify(initialUpcomingGigs)
  const isDjSetsDirty = JSON.stringify(djSets) !== JSON.stringify(initialDjSets)
  const isVideosDirty = JSON.stringify(videos) !== JSON.stringify(initialVideos)
  const isBookingDirty =
    bookingEmail !== artist.bookingInfo.email ||
    bookingUrl !== (artist.bookingInfo.bookingUrl ?? "") ||
    pressKitEnabled !== artist.pressKit.enabled ||
    pressKitUrl !== artist.pressKit.downloadUrl ||
    JSON.stringify(pressKitAssets) !== JSON.stringify(artist.pressKit.assetsIncluded)
  const isSaveDirty = isProfileDirty || isLinksDirty || isFeaturedReleaseDirty || isSelectedReleasesDirty || isGigsDirty || isDjSetsDirty || isVideosDirty || isBookingDirty || isGalleryFocalDirty

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
        },
        socialLinks,
        featuredRelease,
        selectedReleases: selectedReleases.map((r) => ({
          title: r.title,
          label: r.label,
          credits: r.credits,
          releaseDate: r.releaseDate,
          type: r.type,
          platformUrl: r.platformUrl,
          artworkUrl: r.artworkUrl,
          spotifyUrl: r.spotifyUrl,
          beatportUrl: r.beatportUrl,
          appleMusicUrl: r.appleMusicUrl,
          soundcloudUrl: r.soundcloudUrl,
          youtubeMusicUrl: r.youtubeMusicUrl,
          bandcampUrl: r.bandcampUrl,
          otherUrl: r.otherUrl,
        })),
        gigs: upcomingGigs,
        djSets: djSets.map((set) => ({
          title: set.title,
          venue: set.venue,
          event: set.event,
          setDate: set.setDate,
          imageUrl: set.imageUrl,
          platformUrl: set.platformUrl,
          isPublished: set.isPublished,
        })),
        videos,
        booking: {
          email: bookingEmail,
          bookingUrl: bookingUrl || null,
          pressKitEnabled,
          pressKitUrl: pressKitUrl || null,
          pressKitAssets,
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
      isPublished: nextPublished,
      socialLinks: socialLinks.map((link) => ({
        platform: normalizeSocialPlatform(link.platform),
        label: link.label.trim(),
        url: link.url.trim(),
      })),
      featuredRelease: featuredRelease
        ? {
            id: artist.featuredRelease?.id ?? "featured-release",
            title: featuredRelease.title.trim(),
            label: featuredRelease.label.trim(),
            credits: featuredRelease.credits.trim() || undefined,
            releaseDate: featuredRelease.releaseDate,
            artworkUrl: featuredRelease.artworkUrl.trim(),
            platformUrl: featuredRelease.platformUrl.trim(),
            type: normalizeReleaseType(featuredRelease.type),
          }
        : undefined,
      selectedReleases: selectedReleases.map((release) => ({
        id: release.id,
        title: release.title.trim(),
        label: release.label.trim(),
        credits: release.credits.trim() || undefined,
        releaseDate: release.releaseDate,
        artworkUrl: release.artworkUrl.trim(),
        platformUrl: release.platformUrl.trim(),
        type: normalizeReleaseType(release.type),
        spotifyUrl: release.spotifyUrl?.trim() || undefined,
        beatportUrl: release.beatportUrl?.trim() || undefined,
        appleMusicUrl: release.appleMusicUrl?.trim() || undefined,
        soundcloudUrl: release.soundcloudUrl?.trim() || undefined,
        youtubeMusicUrl: release.youtubeMusicUrl?.trim() || undefined,
        bandcampUrl: release.bandcampUrl?.trim() || undefined,
        otherUrl: release.otherUrl?.trim() || undefined,
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
      djSets: djSets.map((set, index): DjSet => ({
        id: set.id,
        title: set.title.trim(),
        venue: set.venue.trim() || undefined,
        event: set.event.trim() || undefined,
        setDate: set.setDate || undefined,
        imageUrl: set.imageUrl.trim() || undefined,
        platformUrl: set.platformUrl.trim(),
        sortOrder: index + 1,
        isPublished: set.isPublished,
      })),
      videos: videos.map((video, index): Video => ({
        id: video.id,
        title: video.title.trim(),
        venue: video.venue.trim() || undefined,
        videoDate: video.videoDate || undefined,
        thumbnailUrl: video.thumbnailUrl.trim() || undefined,
        customThumbnailUrl: video.customThumbnailUrl ?? null,
        platformUrl: video.platformUrl.trim(),
        sortOrder: index + 1,
        isPublished: video.isPublished,
      })),
      bookingInfo: {
        email: bookingEmail.trim(),
        bookingUrl: bookingUrl.trim() || undefined,
      },
      pressKit: {
        enabled: pressKitEnabled,
        downloadUrl: pressKitUrl.trim(),
        assetsIncluded: pressKitAssets,
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
    setSocialLinks(getSocialLinkFormState(savedArtist))
    setFeaturedRelease(getFeaturedReleaseFormState(savedArtist))
    setSelectedReleases(getSelectedReleaseFormState(savedArtist))
    setUpcomingGigs(getGigFormState(savedArtist))
    setDjSets(getDjSetFormState(savedArtist))
    setVideos(getVideoFormState(savedArtist))
    setBookingEmail(savedArtist.bookingInfo.email)
    setBookingUrl(savedArtist.bookingInfo.bookingUrl ?? "")
    setPressKitEnabled(savedArtist.pressKit.enabled)
    setPressKitUrl(savedArtist.pressKit.downloadUrl)
    setPressKitAssets(savedArtist.pressKit.assetsIncluded)
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

  async function handleImportReleaseMetadata() {
    if (!featuredRelease?.platformUrl.trim()) {
      setSaveMessage("Paste a supported release URL first.")
      return
    }

    setIsImportingReleaseMetadata(true)
    setSaveMessage("")

    try {
      const response = await fetch("/api/import/release-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: featuredRelease.platformUrl,
        }),
      })

      const result = (await response.json()) as ImportedReleaseMetadata & { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to import release metadata. Please verify the release URL and try again.")
      }

      setFeaturedRelease((current) => (current ? mergeImportedReleaseFields(current, result) : current))
      setSaveMessage("Release metadata imported. Review and save changes.")
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to import release metadata. Please verify the release URL and try again."
      setSaveMessage(message)
    } finally {
      setIsImportingReleaseMetadata(false)
    }
  }

  async function handleImportSelectedReleaseMetadata(index: number) {
    const release = selectedReleases[index]

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

      setSelectedReleases((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? mergeImportedReleaseFields(item, result) : item)),
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

  function handleAddSelectedRelease() {
    setSelectedReleases((current) => [...current, createEmptySelectedRelease()])
  }

  function handleRemoveSelectedRelease(index: number) {
    setSelectedReleases((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function handleMoveSelectedRelease(index: number, direction: "up" | "down") {
    setSelectedReleases((current) => {
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
    setDjSets((current) => [...current, createEmptyDjSet()])
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
    setVideos((current) => [...current, createEmptyVideo()])
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
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage
        .from("artist-gallery")
        .getPublicUrl(signedUrlResult.filePath)

      setFaviconUrl(urlData.publicUrl)
      setFaviconFile(null)
      setSaveMessage("Favicon uploaded. Save your profile to apply.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload favicon."
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
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage.from("artist-gallery").getPublicUrl(signedUrlResult.filePath)

      setHeroLogoUrl(urlData.publicUrl)
      setHeroLogoFile(null)
      setSaveMessage("Hero logo uploaded. Save to apply.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload hero logo."
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

  function renderOverview() {
    const releaseCount = artist.selectedReleases.length + (artist.featuredRelease ? 1 : 0)
    const completionChecks = [
      { label: "Name & handle", done: !!artist.artistName && !!artist.handle },
      { label: "Bio & location", done: !!artist.shortBio && !!artist.location },
      { label: "Social links", done: artist.socialLinks.length > 0 },
      { label: "Featured release", done: !!artist.featuredRelease },
      { label: "Selected releases", done: artist.selectedReleases.length > 0 },
      { label: "DJ sets", done: artist.djSets.length > 0 },
      { label: "Videos", done: artist.videos.length > 0 },
      { label: "Gallery images", done: artist.galleryImages.length > 0 },
      { label: "Hero image", done: !!artist.heroImageUrl && !artist.heroImageUrl.includes("dj-hero") && !artist.heroImageUrl.includes("placeholder") },
    ]
    const completionDone = completionChecks.filter((c) => c.done).length
    const completionPct = Math.round((completionDone / completionChecks.length) * 100)

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/60">Artist Profile</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">{artist.artistName}</h2>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">@{artist.handle}</p>
              <div className="mt-3 flex items-center gap-3">
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
                <span className="rounded-full border border-white/[0.06] bg-secondary/30 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {artist.plan}
                </span>
              </div>
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent/70 transition-colors duration-150 hover:text-accent"
              >
                {APP_DISPLAY_HOST}{publicProfileUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {artist.featuredRelease?.artworkUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.featuredRelease.artworkUrl}
                alt={artist.featuredRelease.title}
                className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover opacity-80 ring-1 ring-white/[0.08]"
                loading="lazy"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Releases", value: releaseCount },
            { label: "Gigs", value: artist.upcomingGigs.length },
            { label: "DJ Sets", value: artist.djSets.length },
            { label: "Videos", value: artist.videos.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-card/30 p-3 text-center transition-colors duration-150 hover:border-white/[0.09]">
              <p className="text-xl font-bold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-card/30 p-3 transition-colors duration-150 hover:border-white/[0.09]">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">Last updated</p>
            <p className="mt-0.5 text-xs text-foreground/70">
              {new Date(artist.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-card/30 p-3 transition-colors duration-150 hover:border-white/[0.09]">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">Visibility</p>
            <p className="mt-0.5 text-xs text-foreground/70">
              {artist.isPublished ? "Public · visible to anyone" : "Draft · not publicly visible"}
            </p>
          </div>
          {(artist.featuredRelease || artist.selectedReleases[0]) && (
            <div className="rounded-xl border border-white/[0.06] bg-card/30 p-3 transition-colors duration-150 hover:border-white/[0.09]">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">Featured release</p>
              <p className="mt-0.5 truncate text-xs text-foreground/70">
                {artist.featuredRelease?.title ?? artist.selectedReleases[0]?.title}
              </p>
            </div>
          )}
          {artist.videos[0] && (
            <div className="rounded-xl border border-white/[0.06] bg-card/30 p-3 transition-colors duration-150 hover:border-white/[0.09]">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">Latest video</p>
              <p className="mt-0.5 truncate text-xs text-foreground/70">{artist.videos[0].title}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-card/30 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/60">Profile completeness</p>
              {completionPct === 100 && (
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent/70">
                  <Check className="h-2.5 w-2.5" />
                  Complete
                </span>
              )}
            </div>
            <p className="text-sm font-bold tabular-nums text-foreground">{completionPct}%</p>
          </div>
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionPct === 100
                  ? "bg-accent/70 shadow-[0_0_8px_1px_hsl(var(--accent)/0.25)]"
                  : "bg-accent/50"
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {completionChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-1.5">
                {check.done ? (
                  <Check className="h-3 w-3 shrink-0 text-accent/60" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/[0.08]" />
                )}
                <span className={`text-xs ${check.done ? "text-foreground/55" : "text-muted-foreground/35"}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function renderProfile() {
    const previewName = artistName.trim() || artist.artistName
    const showLogoInPreview = artist.plan === "pro" && !!heroLogoUrl && (heroIdentityMode === "logo" || heroIdentityMode === "both")
    const showTextInPreview = artist.plan !== "pro" || !heroLogoUrl || heroIdentityMode === "text" || heroIdentityMode === "both"
    const previewNameClass = (() => {
      switch (heroTextStyle) {
        case "condensed": return "text-2xl font-black uppercase leading-none tracking-tight"
        case "cinematic": return "text-lg font-bold uppercase tracking-[0.14em]"
        case "editorial": return "text-xl font-extrabold leading-tight"
        default: return "text-2xl font-black uppercase leading-tight tracking-tight"
      }
    })()

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Core identity shown on your public artist page.</p>
        </div>

        {/* Core fields */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="artistName" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Artist Name
              </label>
              <Input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="handle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Handle
              </label>
              <Input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="genres" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Genres
              </label>
              <Input id="genres" value={genres} onChange={(event) => setGenres(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Location
              </label>
              <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="heroTagline" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Hero Tagline
                </label>
                <span className={cn(
                  "text-[10px] tabular-nums transition-colors duration-150",
                  heroTagline.length > 90 ? "text-amber-400/60" : "text-muted-foreground/30",
                )}>
                  {heroTagline.length}/100
                </span>
              </div>
              <Input
                id="heroTagline"
                value={heroTagline}
                maxLength={100}
                placeholder="Peak-time house music for underground dance floors."
                onChange={(event) => setHeroTagline(event.target.value)}
              />
              <p className="text-[10px] text-muted-foreground/38">
                Rendered above the bio in the public hero. Leave blank to omit.
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="shortBio" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Short Bio
              </label>
              <Textarea id="shortBio" value={shortBio} onChange={(event) => setShortBio(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="heroImageUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Hero Image URL
              </label>
              <Input id="heroImageUrl" value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="heroImageFile" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Upload Hero Image
              </label>
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
                {heroUploadStatus === "compressing"
                  ? "Compressing..."
                  : heroUploadStatus === "uploading"
                    ? "Uploading..."
                    : "Upload hero image"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: high-quality landscape image. Large images are automatically optimized before upload.
              </p>
            </div>
          </div>
        </div>

        {/* Hero Identity — directly below hero image fields */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Hero Identity
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/45">
                {artist.plan === "pro"
                  ? "Control how your name and visual identity appear inside the public hero section."
                  : "Upgrade to Pro to upload a custom logo, choose your identity mode, and refine hero typography."}
              </p>
            </div>
            {artist.plan !== "pro" && (
              <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/28">
                Pro only
              </span>
            )}
          </div>

          {/* Live hero preview */}
          <div className="relative mb-5 aspect-[16/7] overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0a]">
            {heroImageUrl ? (
              <Image
                src={heroImageUrl}
                alt="Hero preview"
                fill
                className="object-cover"
                sizes="600px"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_30%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
            )}
            {/* Gradient overlay to replicate public hero feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
            {/* Identity content */}
            <div className="absolute inset-0 flex flex-col items-start justify-end gap-1.5 p-4 sm:p-5">
              {showLogoInPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroLogoUrl}
                  alt="Logo preview"
                  className="max-h-8 max-w-[140px] object-contain drop-shadow-md sm:max-h-10"
                />
              )}
              {showTextInPreview && (
                <p className={cn(previewNameClass, "text-white drop-shadow-md max-w-[85%]")}>
                  {previewName}
                </p>
              )}
              {heroTagline && (
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 drop-shadow-sm">
                  {heroTagline}
                </p>
              )}
            </div>
            <div className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/40">
              Preview
            </div>
          </div>

          <div className="space-y-5">
            {/* Identity mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                  Identity Mode
                </p>
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                {(["text", "logo", "both"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => artist.plan === "pro" && setHeroIdentityMode(mode)}
                    disabled={artist.plan !== "pro"}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                      heroIdentityMode === mode
                        ? "bg-white/[0.07] text-foreground/75"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50",
                      artist.plan !== "pro" && "pointer-events-none",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/35">
                Text shows your artist name. Logo shows your uploaded lockup. Both shows logo above name.
              </p>
            </div>

            {/* Typography style */}
            <div className="space-y-2 border-t border-white/[0.04] pt-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                Typography Style
              </p>
              <div className="flex flex-wrap gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-0.5 w-fit">
                {(["default", "condensed", "cinematic", "editorial"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => artist.plan === "pro" && setHeroTextStyle(style)}
                    disabled={artist.plan !== "pro"}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-100",
                      heroTextStyle === style
                        ? "bg-white/[0.07] text-foreground/75"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50",
                      artist.plan !== "pro" && "pointer-events-none",
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/35">
                Controls weight, size, and tracking of your name. Only visible when text is shown in the hero.
              </p>
            </div>

            {/* Custom Hero Logo */}
            {artist.plan === "pro" && (
              <div className="space-y-2 border-t border-white/[0.04] pt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                  Custom Logo
                </p>
                {heroLogoUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex h-10 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-[#0a0a0a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroLogoUrl} alt="Hero logo" className="max-h-8 max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-foreground/55">{heroLogoUrl.split("/").pop()}</p>
                      <button
                        type="button"
                        onClick={() => setHeroLogoUrl("")}
                        className="mt-0.5 text-[10px] text-destructive/50 transition-colors hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
                <Input
                  id="heroLogoFile"
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  onChange={(event) => setHeroLogoFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  onClick={handleUploadHeroLogo}
                  disabled={!heroLogoFile || isUploadingHeroLogo || isSaving || isPublishing}
                  className="bg-secondary text-foreground hover:bg-secondary/80"
                >
                  {isUploadingHeroLogo ? "Uploading..." : "Upload logo"}
                </Button>
                <p className="text-[10px] text-muted-foreground/38">
                  PNG, SVG, or WEBP. Transparent background recommended. Max height 56–88px on public profile.
                </p>
              </div>
            )}
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

  function renderFeaturedRelease() {
    if (!featuredRelease) {
      return null
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Featured Release</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">The primary release shown at the top of your profile.</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="releaseTitle" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Title
              </label>
              <Input
                id="releaseTitle"
                value={featuredRelease.title}
                onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, title: event.target.value } : current))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="releaseLabel" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Label
              </label>
              <Input
                id="releaseLabel"
                value={featuredRelease.label}
                onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, label: event.target.value } : current))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="releaseCredits" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Artists
              </label>
              <Input
                id="releaseCredits"
                value={featuredRelease.credits}
                placeholder="e.g. Artist 1, Artist 2"
                onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, credits: event.target.value } : current))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="releaseDate" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Release Date
              </label>
              <Input
                id="releaseDate"
                type="date"
                value={featuredRelease.releaseDate}
                onChange={(event) =>
                  setFeaturedRelease((current) => (current ? { ...current, releaseDate: event.target.value } : current))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="releaseType" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Type
              </label>
              <Input
                id="releaseType"
                value={featuredRelease.type}
                onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, type: event.target.value } : current))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="releasePlatformUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                Platform URL
              </label>
              <Input
                id="releasePlatformUrl"
                value={featuredRelease.platformUrl}
                onChange={(event) =>
                  setFeaturedRelease((current) => (current ? { ...current, platformUrl: event.target.value } : current))
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImportReleaseMetadata}
                disabled={isImportingReleaseMetadata || isSaving || isPublishing}
                className="border-border bg-background/70"
              >
                {isImportingReleaseMetadata ? "Fetching..." : "Import metadata"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Paste an open.spotify.com track or album link. Title, artwork, and platform URL are filled from public
                Spotify data when available; Label, date, and type usually need manual entry.
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="releaseArtworkUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
                Artwork URL
              </label>
              <Input
                id="releaseArtworkUrl"
                value={featuredRelease.artworkUrl}
                onChange={(event) =>
                  setFeaturedRelease((current) => (current ? { ...current, artworkUrl: event.target.value } : current))
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderSelectedReleases() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Selected Releases</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Catalog releases shown in the public profile carousel. Featured Release stays separate.</p>
        </div>
        <div className="space-y-3">
          {selectedReleases.map((release, index) => (
            <div key={release.id} className="rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-colors duration-150 hover:border-white/[0.09] sm:p-5">
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
                    onClick={() => handleMoveSelectedRelease(index, "up")}
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
                    onClick={() => handleMoveSelectedRelease(index, "down")}
                    disabled={index === selectedReleases.length - 1 || isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    title="Move down"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSelectedRelease(index)}
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
                      setSelectedReleases((current) =>
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
                      setSelectedReleases((current) =>
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
                      setSelectedReleases((current) =>
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
                  <Input
                    id={`selected-release-date-${index}`}
                    type="date"
                    value={release.releaseDate}
                    onChange={(event) =>
                      setSelectedReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, releaseDate: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-type-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Type
                  </label>
                  <Input
                    id={`selected-release-type-${index}`}
                    value={release.type}
                    onChange={(event) =>
                      setSelectedReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, type: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`selected-release-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Platform URL
                  </label>
                  <Input
                    id={`selected-release-platform-${index}`}
                    value={release.platformUrl}
                    onChange={(event) =>
                      setSelectedReleases((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, platformUrl: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImportSelectedReleaseMetadata(index)}
                    disabled={
                      importingSelectedReleaseIndex === index ||
                      isSaving ||
                      isPublishing ||
                      isImportingReleaseMetadata
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
                      setSelectedReleases((current) =>
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
                      Shown as small badges on your profile. Leave blank to omit. If none are set, the primary URL above is used.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { key: "spotifyUrl", label: "Spotify" },
                        { key: "beatportUrl", label: "Beatport" },
                        { key: "appleMusicUrl", label: "Apple Music" },
                        { key: "soundcloudUrl", label: "SoundCloud" },
                        { key: "youtubeMusicUrl", label: "YouTube Music" },
                        { key: "bandcampUrl", label: "Bandcamp" },
                        { key: "otherUrl", label: "Other" },
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
                            setSelectedReleases((current) =>
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
          {selectedReleases.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Music className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No releases in catalog</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Add releases to showcase your discography on your profile.</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddSelectedRelease}
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

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">DJ Sets</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Recorded or broadcast sets. First set is featured on your public profile.</p>
        </div>
        <div className="space-y-3">
          {djSets.map((set, index) => {
            const previewMeta = [set.event, set.venue, formatDjSetDate(set.setDate)].filter(Boolean).join(" · ")
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
                      <p className="truncate text-xs font-medium leading-none text-foreground">
                        {set.title || <span className="text-muted-foreground/30">Untitled</span>}
                      </p>
                      {previewMeta ? (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/40">{previewMeta}</p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/30">
                          Set {index + 1}{index === 0 ? " · Featured" : ""}
                        </p>
                      )}
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
                  {/* Row 1: Title */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`djset-title-${index}`}
                      className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                    >
                      Title
                    </label>
                    <Input
                      id={`djset-title-${index}`}
                      value={set.title}
                      placeholder="Live from Fabric"
                      onChange={(e) =>
                        setDjSets((current) =>
                          current.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)),
                        )
                      }
                    />
                  </div>

                  {/* Row 2: Date · Venue · Event */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`djset-date-${index}`}
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Date
                      </label>
                      <input
                        id={`djset-date-${index}`}
                        type="date"
                        value={set.setDate}
                        onChange={(e) =>
                          setDjSets((current) =>
                            current.map((item, i) => (i === index ? { ...item, setDate: e.target.value } : item)),
                          )
                        }
                        className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-sm font-medium text-foreground [color-scheme:dark] outline-none transition-colors duration-150 focus:border-white/[0.14] focus:bg-white/[0.04]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        Venue
                      </label>
                      <VenueAutocomplete
                        value={set.venue}
                        onChange={(v) =>
                          setDjSets((current) =>
                            current.map((item, i) => (i === index ? { ...item, venue: v } : item)),
                          )
                        }
                        onSelect={(entry) =>
                          setDjSets((current) =>
                            current.map((item, i) => (i === index ? { ...item, venue: entry.name } : item)),
                          )
                        }
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
                        onChange={(e) =>
                          setDjSets((current) =>
                            current.map((item, i) => (i === index ? { ...item, event: e.target.value } : item)),
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Row 3: Platform URL · Thumbnail URL */}
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
                          onChange={(e) =>
                            setDjSets((current) =>
                              current.map((item, i) => (i === index ? { ...item, platformUrl: e.target.value } : item)),
                            )
                          }
                          className="min-w-0 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImportDjSetMetadata(index)}
                          disabled={importingDjSetIndex === index || isSaving || isPublishing}
                          className="shrink-0 border-border bg-background/70 text-xs"
                          title="Import title and thumbnail from SoundCloud or YouTube"
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
                        onChange={(e) =>
                          setDjSets((current) =>
                            current.map((item, i) => (i === index ? { ...item, imageUrl: e.target.value } : item)),
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Show on profile */}
                  <div className="flex items-center gap-2">
                    <input
                      id={`djset-published-${index}`}
                      type="checkbox"
                      checked={set.isPublished}
                      onChange={(e) =>
                        setDjSets((current) =>
                          current.map((item, i) => (i === index ? { ...item, isPublished: e.target.checked } : item)),
                        )
                      }
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
              <p className="mt-1 text-xs text-muted-foreground/30">Paste a SoundCloud or YouTube link and click Import to fill metadata.</p>
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
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Videos</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">YouTube performance videos shown on your public profile. First video is featured.</p>
        </div>
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div key={video.id} className="rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-colors duration-150 hover:border-white/[0.09] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(video.customThumbnailUrl ?? video.thumbnailUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(video.customThumbnailUrl ?? video.thumbnailUrl)!} alt="" className="h-9 w-16 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
                  ) : (
                    <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted-foreground/30">
                      <Play className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-none text-foreground">{video.title || <span className="text-muted-foreground/30">Untitled</span>}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/40">Video {index + 1}{index === 0 ? " · Featured" : ""}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
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
              <div className="grid gap-4 border-t border-white/[0.04] pt-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-title-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Title
                  </label>
                  <Input
                    id={`video-title-${index}`}
                    value={video.title}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-venue-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Venue / Event
                  </label>
                  <Input
                    id={`video-venue-${index}`}
                    value={video.venue}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, venue: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-date-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Date
                  </label>
                  <Input
                    id={`video-date-${index}`}
                    type="date"
                    value={video.videoDate}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, videoDate: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`video-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Platform URL
                  </label>
                  <Input
                    id={`video-platform-${index}`}
                    value={video.platformUrl}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, platformUrl: event.target.value } : item)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImportVideoMetadata(index)}
                    disabled={importingVideoIndex === index || isSaving || isPublishing}
                    className="border-border bg-background/70"
                  >
                    {importingVideoIndex === index ? "Fetching..." : "Import metadata"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Paste a youtube.com link. Title and thumbnail are filled from public YouTube data when available.
                  </p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`video-thumbnail-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                  >
                    Thumbnail URL
                  </label>
                  <Input
                    id={`video-thumbnail-${index}`}
                    value={video.thumbnailUrl}
                    onChange={(event) =>
                      setVideos((current) =>
                        current.map((item, i) => (i === index ? { ...item, thumbnailUrl: event.target.value } : item)),
                      )
                    }
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
          ))}
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
                      setGalleryImageFile(null)
                      event.target.value = ""
                      return
                    }
                    setGalleryFileError("")
                    setGalleryImageFile(file)
                  }}
                />
                {galleryFileError && (
                  <p className="text-xs text-destructive/80">{galleryFileError}</p>
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
                Accepted formats: JPG, PNG, WEBP. Recommended size: up to 20 MB. Images are compressed and resized to max 2000 × 2000 px before upload.
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
    const pressKitUrlInvalid = Boolean(pressKitEnabled && pressKitUrl && !pressKitUrl.startsWith("http"))

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

        {/* Press Kit */}
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="space-y-5">

            {/* Header + toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Press Kit</p>
                <p className="mt-0.5 text-xs text-muted-foreground/45">
                  Make your EPK available to media and promoters.
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

            {/* Press kit URL + assets — dimmed when off */}
            <div className={cn("space-y-5 transition-opacity duration-200", !pressKitEnabled && "pointer-events-none opacity-35")}>
              <div className="space-y-1.5">
                <label htmlFor="pressKitUrl" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Press Kit URL
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
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
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
      case "overview":
        return renderOverview()
      case "profile":
        return renderProfile()
      case "links":
        return renderLinks()
      case "featured-release":
        return renderFeaturedRelease()
      case "selected-releases":
        return renderSelectedReleases()
      case "gigs":
        return renderGigs()
      case "dj-sets":
        return renderDjSets()
      case "videos":
        return renderVideos()
      case "gallery":
        return renderGallery()
      case "booking":
        return renderBooking()
      case "custom-domain":
        return renderCustomDomain()
      case "publish":
        return renderPublish()
      default:
        return renderOverview()
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
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <span className="text-xs font-bold text-accent-foreground">DJ</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">DJHQ</span>
          </Link>
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
              isImportingReleaseMetadata ||
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
