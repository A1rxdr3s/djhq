"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUp, Calendar, Check, ExternalLink, Globe, Headphones, LogOut, Mail, Music, Play, Plus, Save, Trash2 } from "lucide-react"
import type { Artist, DjSet, GalleryImage, ReleaseType, SocialPlatform, Video } from "@/types/djhq"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">{label}</p>
      <p className="mt-1 text-sm text-foreground/80">{value || "—"}</p>
    </div>
  )
}

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
}

type GigFormState = {
  id: string
  venue: string
  date: string
  city: string
  country: string
  ticketUrl?: string
}

type DjSetFormState = {
  id: string
  title: string
  venue: string
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
    setDate: result.releaseDate ?? current.setDate,
  }
}

function getGigFormState(artist: Artist): GigFormState[] {
  return artist.upcomingGigs.map((gig) => ({
    id: gig.id,
    venue: gig.venue,
    date: toDateInputValue(gig.date),
    city: gig.city,
    country: gig.country,
    ticketUrl: gig.ticketUrl,
  }))
}

function getDjSetFormState(artist: Artist): DjSetFormState[] {
  return artist.djSets.map((set) => ({
    id: set.id,
    title: set.title,
    venue: set.venue ?? "",
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
    platformUrl: "",
    isPublished: true,
  }
}

function mergeVideoMetadata(current: VideoFormState, result: ImportedVideoMetadata): VideoFormState {
  return {
    ...current,
    title: result.title?.trim() || current.title,
    thumbnailUrl: result.thumbnailUrl?.trim() || current.thumbnailUrl,
    platformUrl: result.platformUrl || current.platformUrl,
  }
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
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks)
  const [featuredRelease, setFeaturedRelease] = useState(initialFeaturedRelease)
  const [selectedReleases, setSelectedReleases] = useState(initialSelectedReleases)
  const [upcomingGigs, setUpcomingGigs] = useState(initialUpcomingGigs)
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
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false)
  const [galleryImages, setGalleryImages] = useState(initialArtist.galleryImages)
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null)
  const [galleryImageAltText, setGalleryImageAltText] = useState("")
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false)
  const [deletingGalleryImageId, setDeletingGalleryImageId] = useState<string | null>(null)
  const [isReorderingGallery, setIsReorderingGallery] = useState(false)
  const [savedRecently, setSavedRecently] = useState(false)
  const [customDomains, setCustomDomains] = useState(initialArtist.customDomains)
  const [domainInput, setDomainInput] = useState("")
  const [isAddingDomain, setIsAddingDomain] = useState(false)
  const [addDomainError, setAddDomainError] = useState("")
  const [isVerifyingDomainId, setIsVerifyingDomainId] = useState<string | null>(null)
  const [isRemovingDomainId, setIsRemovingDomainId] = useState<string | null>(null)
  const publicProfileUrl = `/${artist.handle}`
  const isProfileDirty =
    artistName !== artist.artistName ||
    handle !== artist.handle ||
    genres !== artist.genres.join(", ") ||
    location !== artist.location ||
    shortBio !== artist.shortBio ||
    heroImageUrl !== artist.heroImageUrl
  const isLinksDirty = JSON.stringify(socialLinks) !== JSON.stringify(initialSocialLinks)
  const isFeaturedReleaseDirty = JSON.stringify(featuredRelease) !== JSON.stringify(initialFeaturedRelease)
  const isSelectedReleasesDirty = JSON.stringify(selectedReleases) !== JSON.stringify(initialSelectedReleases)
  const isGigsDirty = JSON.stringify(upcomingGigs) !== JSON.stringify(initialUpcomingGigs)
  const isDjSetsDirty = JSON.stringify(djSets) !== JSON.stringify(initialDjSets)
  const isVideosDirty = JSON.stringify(videos) !== JSON.stringify(initialVideos)
  const isSaveDirty = isProfileDirty || isLinksDirty || isFeaturedReleaseDirty || isSelectedReleasesDirty || isGigsDirty || isDjSetsDirty || isVideosDirty

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
        },
        socialLinks,
        featuredRelease,
        selectedReleases,
        gigs: upcomingGigs,
        djSets,
        videos,
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
      })),
      upcomingGigs: upcomingGigs.map((gig) => ({
        id: gig.id,
        date: gig.date,
        venue: gig.venue.trim(),
        city: gig.city.trim(),
        country: gig.country.trim(),
        ticketUrl: gig.ticketUrl?.trim() || undefined,
      })),
      djSets: djSets.map((set, index): DjSet => ({
        id: set.id,
        title: set.title.trim(),
        venue: set.venue.trim() || undefined,
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
        platformUrl: video.platformUrl.trim(),
        sortOrder: index + 1,
        isPublished: video.isPublished,
      })),
      updatedAt: new Date().toISOString(),
    }

    setArtist(savedArtist)
    setArtistName(savedArtist.artistName)
    setHandle(savedArtist.handle)
    setGenres(savedArtist.genres.join(", "))
    setLocation(savedArtist.location)
    setShortBio(savedArtist.shortBio)
    setHeroImageUrl(savedArtist.heroImageUrl)
    setSocialLinks(getSocialLinkFormState(savedArtist))
    setFeaturedRelease(getFeaturedReleaseFormState(savedArtist))
    setSelectedReleases(getSelectedReleaseFormState(savedArtist))
    setUpcomingGigs(getGigFormState(savedArtist))
    setDjSets(getDjSetFormState(savedArtist))
    setVideos(getVideoFormState(savedArtist))
    setGalleryImages(savedArtist.galleryImages)
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

    setIsUploadingHeroImage(true)
    setSaveMessage("")

    try {
      const formData = new FormData()
      formData.append("artistId", artist.id)
      formData.append("file", heroImageFile)

      const response = await fetch("/api/artists/hero-image", {
        method: "POST",
        body: formData,
      })

      const result = (await response.json()) as { error?: string; heroImageUrl?: string }

      if (!response.ok || !result.heroImageUrl) {
        throw new Error(result.error ?? "Unable to upload hero image.")
      }

      setHeroImageUrl(result.heroImageUrl)
      setArtist((current) => ({
        ...current,
        heroImageUrl: result.heroImageUrl ?? current.heroImageUrl,
        updatedAt: new Date().toISOString(),
      }))
      setHeroImageFile(null)
      setSaveMessage("Hero image uploaded.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload hero image."
      setSaveMessage(message)
    } finally {
      setIsUploadingHeroImage(false)
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
      const formData = new FormData()
      formData.append("artistId", artist.id)
      formData.append("file", galleryImageFile)
      formData.append("altText", galleryImageAltText)

      const response = await fetch("/api/artists/gallery-image", {
        method: "POST",
        body: formData,
      })

      const result = (await response.json()) as { error?: string; galleryImage?: GalleryImage }

      if (!response.ok || !result.galleryImage) {
        throw new Error(result.error ?? "Unable to upload gallery image.")
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
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Core identity shown on your public artist page.</p>
        </div>
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
                {isUploadingHeroImage ? "Uploading..." : "Upload hero image"}
              </Button>
              <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, WEBP. Max size: 5MB.</p>
              {heroImageUrl ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">Hero Preview</p>
                  <div className="relative aspect-[16/7] overflow-hidden rounded-lg border border-white/[0.06] bg-secondary/40">
                    <Image src={heroImageUrl} alt={`${artistName || "Artist"} hero preview`} fill className="object-cover" />
                  </div>
                </div>
              ) : null}
            </div>
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

  function renderGigs() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Gigs</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Upcoming shows displayed on your public profile.</p>
        </div>
        <div className="space-y-3">
          {upcomingGigs.map((gig, index) => (
            <div key={gig.id} className="rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-colors duration-150 hover:border-white/[0.09] sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-accent/60" />
                <Input
                  id={`gig-venue-${index}`}
                  value={gig.venue}
                  placeholder="Venue name"
                  onChange={(event) =>
                    setUpcomingGigs((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, venue: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor={`gig-date-${index}`} className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                    Date
                  </label>
                  <Input
                    id={`gig-date-${index}`}
                    type="date"
                    value={gig.date}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, date: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`gig-city-${index}`} className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                    City
                  </label>
                  <Input
                    id={`gig-city-${index}`}
                    value={gig.city}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, city: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`gig-country-${index}`} className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                    Country
                  </label>
                  <Input
                    id={`gig-country-${index}`}
                    value={gig.country}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, country: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <label htmlFor={`gig-ticket-${index}`} className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  Ticket URL
                </label>
                <Input
                  id={`gig-ticket-${index}`}
                  value={gig.ticketUrl ?? ""}
                  onChange={(event) =>
                    setUpcomingGigs((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ticketUrl: event.target.value || undefined } : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
          {upcomingGigs.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Calendar className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No upcoming gigs</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Your confirmed shows will appear here.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderDjSets() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">DJ Sets</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Recorded or broadcast sets shown on your public profile. First set is featured.</p>
        </div>
        <div className="space-y-3">
          {djSets.map((set, index) => (
            <div key={set.id} className="rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-colors duration-150 hover:border-white/[0.09] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {set.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={set.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted-foreground/30">
                      <Headphones className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-none text-foreground">{set.title || <span className="text-muted-foreground/30">Untitled</span>}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/40">Set {index + 1}{index === 0 ? " · Featured" : ""}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
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
              <div className="grid gap-4 border-t border-white/[0.04] pt-4 md:grid-cols-2">
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
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`djset-venue-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Venue / Event
                  </label>
                  <Input
                    id={`djset-venue-${index}`}
                    value={set.venue}
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, venue: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`djset-date-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Date
                  </label>
                  <Input
                    id={`djset-date-${index}`}
                    type="date"
                    value={set.setDate}
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, setDate: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`djset-platform-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70"
                  >
                    Platform URL
                  </label>
                  <Input
                    id={`djset-platform-${index}`}
                    value={set.platformUrl}
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, platformUrl: event.target.value } : item)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImportDjSetMetadata(index)}
                    disabled={importingDjSetIndex === index || isSaving || isPublishing}
                    className="border-border bg-background/70"
                  >
                    {importingDjSetIndex === index ? "Fetching..." : "Import metadata"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Paste a soundcloud.com link. Title, artwork, and platform URL are filled from public SoundCloud data when available.
                  </p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor={`djset-image-${index}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50"
                  >
                    Thumbnail URL
                  </label>
                  <Input
                    id={`djset-image-${index}`}
                    value={set.imageUrl}
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, imageUrl: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id={`djset-published-${index}`}
                    type="checkbox"
                    checked={set.isPublished}
                    onChange={(event) =>
                      setDjSets((current) =>
                        current.map((item, i) => (i === index ? { ...item, isPublished: event.target.checked } : item)),
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
          ))}
          {djSets.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] px-6 py-8 text-center">
              <Headphones className="mx-auto mb-2.5 h-5 w-5 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground/50">No sets added</p>
              <p className="mt-1 text-xs text-muted-foreground/30">Paste a SoundCloud link to import your recorded sets.</p>
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
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt="" className="h-9 w-16 shrink-0 rounded bg-secondary/40 object-cover opacity-90" loading="lazy" />
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
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Gallery</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Press and event photography shown on your public profile.</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {galleryImages.map((image, index) => (
              <div key={image.id} className="space-y-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/[0.06] bg-secondary/40">
                  <Image src={image.imageUrl} alt={image.altText} fill sizes="200px" className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs text-muted-foreground">{image.altText}</p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorderGalleryImage(index, "up")}
                      disabled={
                        index === 0 ||
                        isReorderingGallery ||
                        !!deletingGalleryImageId ||
                        isUploadingGalleryImage ||
                        isSaving ||
                        isPublishing
                      }
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
                      disabled={
                        index === galleryImages.length - 1 ||
                        isReorderingGallery ||
                        !!deletingGalleryImageId ||
                        isUploadingGalleryImage ||
                        isSaving ||
                        isPublishing
                      }
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
                      disabled={
                        deletingGalleryImageId === image.id ||
                        isReorderingGallery ||
                        isUploadingGalleryImage ||
                        isSaving ||
                        isPublishing
                      }
                      title="Delete"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                  onChange={(event) => setGalleryImageFile(event.target.files?.[0] ?? null)}
                />
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
                disabled={
                  !galleryImageFile ||
                  isUploadingGalleryImage ||
                  isReorderingGallery ||
                  isSaving ||
                  isPublishing ||
                  !!deletingGalleryImageId
                }
                className="bg-secondary text-foreground hover:bg-secondary/80"
              >
                {isUploadingGalleryImage ? "Uploading..." : "Upload gallery image"}
              </Button>
              <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, WEBP. Max size: 5MB.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderBooking() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Booking</h2>
          <p className="mt-1 text-sm text-muted-foreground/60">Contact details shown to promoters and venues.</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-colors duration-150 hover:border-white/[0.09] sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <ReadOnlyField label="Booking Email" value={artist.bookingInfo.email} />
            <ReadOnlyField label="Booking URL" value={artist.bookingInfo.bookingUrl ?? "Not set"} />
            <ReadOnlyField label="Press Kit Enabled" value={artist.pressKit.enabled ? "Yes" : "No"} />
            <ReadOnlyField label="Press Kit URL" value={artist.pressKit.downloadUrl || "Not set"} />
            <div className="md:col-span-2">
              <ReadOnlyField label="Assets Included" value={artist.pressKit.assetsIncluded.join(", ") || "—"} />
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

            {/* pending / error — show TXT instructions + verify button */}
            {(activeDomain.status === "pending" || activeDomain.status === "error") && activeDomain.verificationRecord && (
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

            {/* verified — show routing DNS instructions, no activate button */}
            {activeDomain.status === "verified" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  Ownership verified. DJHQ will activate this domain after final configuration (typically 24–48 hours).
                </p>
                {activeDomain.routingRecord && (
                  <>
                    <p className="text-xs text-muted-foreground/60">
                      While you wait, point your domain to DJHQ:
                    </p>
                    {dnsTable([
                      { label: "Type", value: activeDomain.routingRecord.type },
                      { label: "Name", value: activeDomain.routingRecord.name },
                      { label: "Value", value: activeDomain.routingRecord.value },
                    ])}
                    <p className="text-[11px] text-muted-foreground/40">
                      If using Cloudflare, keep the record set to DNS-only (grey cloud) while your domain is being validated.
                    </p>
                  </>
                )}
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
