"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUp, Calendar, ExternalLink, Globe, LogOut, Mail, Plus, Save, Trash2 } from "lucide-react"
import type { Artist, DjSet, GalleryImage, ReleaseType, SocialPlatform } from "@/types/djhq"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "links", label: "Links" },
  { id: "featured-release", label: "Featured Release" },
  { id: "selected-releases", label: "Selected Releases" },
  { id: "gigs", label: "Gigs" },
  { id: "dj-sets", label: "DJ Sets" },
  { id: "gallery", label: "Gallery" },
  { id: "booking", label: "Booking" },
  { id: "publish", label: "Publish" },
] as const

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="min-h-10 rounded-md border border-border bg-secondary/35 px-3 py-2 text-sm text-foreground">
        {value}
      </div>
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
  const [saveMessage, setSaveMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isImportingReleaseMetadata, setIsImportingReleaseMetadata] = useState(false)
  const [importingSelectedReleaseIndex, setImportingSelectedReleaseIndex] = useState<number | null>(null)
  const [importingDjSetIndex, setImportingDjSetIndex] = useState<number | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false)
  const [galleryImages, setGalleryImages] = useState(initialArtist.galleryImages)
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null)
  const [galleryImageAltText, setGalleryImageAltText] = useState("")
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false)
  const [deletingGalleryImageId, setDeletingGalleryImageId] = useState<string | null>(null)
  const [isReorderingGallery, setIsReorderingGallery] = useState(false)
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
  const isSaveDirty = isProfileDirty || isLinksDirty || isFeaturedReleaseDirty || isSelectedReleasesDirty || isGigsDirty || isDjSetsDirty
  const completionItems = [
    "Core profile info",
    "Music and social links",
    "Featured release",
    "Selected releases",
    "Upcoming gigs",
    "Gallery preview",
    "Booking and press kit",
  ]

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
    setGalleryImages(savedArtist.galleryImages)
    setSaveMessage(successMessage)
  }

  async function handleSaveChanges() {
    setIsSaving(true)
    setSaveMessage("")

    try {
      await persistArtistChanges(artist.isPublished, "Changes saved to Supabase.")
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
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Private control panel preview for your public DJHQ profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Artist Name" value={artist.artistName} />
          <ReadOnlyField label="Handle" value={`@${artist.handle}`} />
          <ReadOnlyField label="Plan" value={artist.plan.toUpperCase()} />
          <ReadOnlyField label="Public URL" value={publicProfileUrl} />
          <ReadOnlyField label="Publish Status" value={artist.isPublished ? "Published" : "Draft"} />
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Completion Checklist</p>
            <div className="space-y-2 rounded-md border border-border bg-secondary/35 px-3 py-2">
              {completionItems.map((item) => (
                <p key={item} className="text-sm text-foreground">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderProfile() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="artistName" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Artist Name
            </label>
            <Input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="handle" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Handle
            </label>
            <Input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="genres" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Genres
            </label>
            <Input id="genres" value={genres} onChange={(event) => setGenres(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="location" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Location
            </label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="shortBio" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Short Bio
              </label>
              <Textarea id="shortBio" value={shortBio} onChange={(event) => setShortBio(event.target.value)} />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label
                htmlFor="heroImageUrl"
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
              >
                Hero Image URL
              </label>
              <Input id="heroImageUrl" value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-2">
              <label
                htmlFor="heroImageFile"
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
              >
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
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Hero Preview</p>
                  <div className="relative aspect-[16/7] overflow-hidden rounded-md border border-border bg-secondary/40">
                    <Image src={heroImageUrl} alt={`${artistName || "Artist"} hero preview`} fill className="object-cover" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderLinks() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {socialLinks.map((link, index) => (
            <div key={`${link.platform}-${index}`} className="grid gap-2 rounded-md border border-border bg-secondary/30 p-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor={`link-platform-${index}`}
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
          ))}
        </CardContent>
      </Card>
    )
  }

  function renderFeaturedRelease() {
    if (!featuredRelease) {
      return null
    }

    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Featured Release</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="releaseTitle" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Title
            </label>
            <Input
              id="releaseTitle"
              value={featuredRelease.title}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, title: event.target.value } : current))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="releaseLabel" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Label
            </label>
            <Input
              id="releaseLabel"
              value={featuredRelease.label}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, label: event.target.value } : current))}
            />
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="releaseCredits" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Artists
              </label>
              <Input
                id="releaseCredits"
                value={featuredRelease.credits}
                placeholder="e.g. Artist 1, Artist 2"
                onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, credits: event.target.value } : current))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="releaseDate" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
            <label htmlFor="releaseType" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Type
            </label>
            <Input
              id="releaseType"
              value={featuredRelease.type}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, type: event.target.value } : current))}
            />
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="releasePlatformUrl" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="releaseArtworkUrl" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
        </CardContent>
      </Card>
    )
  }

  function renderSelectedReleases() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Selected Releases</CardTitle>
          <CardDescription>Catalog releases shown in the public profile carousel. Featured Release stays separate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedReleases.map((release, index) => (
            <div key={release.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Release {index + 1}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveSelectedRelease(index, "up")}
                    disabled={index === 0 || isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    className="h-7 px-2"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveSelectedRelease(index, "down")}
                    disabled={
                      index === selectedReleases.length - 1 ||
                      isSaving ||
                      isPublishing ||
                      importingSelectedReleaseIndex !== null
                    }
                    className="h-7 px-2"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Move down
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveSelectedRelease(index)}
                    disabled={isSaving || isPublishing || importingSelectedReleaseIndex !== null}
                    className="h-7 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-title-${index}`}
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                <div className="md:col-span-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`selected-release-credits-${index}`}
                      className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`selected-release-date-${index}`}
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                <div className="md:col-span-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`selected-release-platform-${index}`}
                      className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                </div>
                <div className="md:col-span-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`selected-release-artwork-${index}`}
                      className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddSelectedRelease}
            disabled={isSaving || isPublishing || importingSelectedReleaseIndex !== null}
            className="border-border bg-background/70"
          >
            <Plus className="h-4 w-4" />
            Add release
          </Button>
        </CardContent>
      </Card>
    )
  }

  function renderGigs() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Gigs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingGigs.map((gig, index) => (
            <div key={gig.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <Input
                  id={`gig-venue-${index}`}
                  value={gig.venue}
                  onChange={(event) =>
                    setUpcomingGigs((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, venue: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor={`gig-date-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
                  <label htmlFor={`gig-city-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
                  <label
                    htmlFor={`gig-country-${index}`}
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                  >
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
              <div className="mt-2 space-y-1.5">
                <label htmlFor={`gig-ticket-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
        </CardContent>
      </Card>
    )
  }

  function renderDjSets() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>DJ Sets</CardTitle>
          <CardDescription>Recorded or broadcast sets shown on your public profile. First set is featured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {djSets.map((set, index) => (
            <div key={set.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Set {index + 1}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveDjSet(index, "up")}
                    disabled={index === 0 || isSaving || isPublishing || importingDjSetIndex !== null}
                    className="h-7 px-2"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveDjSet(index, "down")}
                    disabled={index === djSets.length - 1 || isSaving || isPublishing || importingDjSetIndex !== null}
                    className="h-7 px-2"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Move down
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDjSet(index)}
                    disabled={isSaving || isPublishing || importingDjSetIndex !== null}
                    className="h-7 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`djset-title-${index}`}
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                <div className="md:col-span-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`djset-image-${index}`}
                      className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
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
          <Button
            type="button"
            variant="outline"
            onClick={handleAddDjSet}
            disabled={isSaving || isPublishing || importingDjSetIndex !== null}
            className="border-border bg-background/70"
          >
            <Plus className="h-4 w-4" />
            Add set
          </Button>
        </CardContent>
      </Card>
    )
  }

  function renderGallery() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {galleryImages.map((image, index) => (
              <div key={image.id} className="space-y-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-secondary/40">
                  <Image src={image.imageUrl} alt={image.altText} fill sizes="200px" className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{image.altText}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
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
                      className="h-7 px-2"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
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
                      className="h-7 px-2"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Move down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGalleryImage(image.id)}
                      disabled={
                        deletingGalleryImageId === image.id ||
                        isReorderingGallery ||
                        isUploadingGalleryImage ||
                        isSaving ||
                        isPublishing
                      }
                      className="h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingGalleryImageId === image.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-3">
            <div className="space-y-1.5">
              <label
                htmlFor="galleryImageFile"
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
        </CardContent>
      </Card>
    )
  }

  function renderBooking() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <ReadOnlyField label="Booking Email" value={artist.bookingInfo.email} />
            <ReadOnlyField label="Booking URL" value={artist.bookingInfo.bookingUrl ?? "Not set"} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ReadOnlyField label="Press Kit Enabled" value={artist.pressKit.enabled ? "Yes" : "No"} />
            <ReadOnlyField label="Press Kit URL" value={artist.pressKit.downloadUrl} />
          </div>
          <ReadOnlyField label="Assets Included" value={artist.pressKit.assetsIncluded.join(", ")} />
        </CardContent>
      </Card>
    )
  }

  function renderPublish() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={artist.isPublished ? "default" : "secondary"}>
              {artist.isPublished ? "Published" : "Draft"}
            </Badge>
            <span className="text-sm text-muted-foreground">{publicProfileUrl}</span>
          </div>
          <div className="rounded-md border border-border bg-secondary/35 p-3 text-sm text-muted-foreground">
            Control whether your profile is visible at {publicProfileUrl}.
          </div>
          <Button
            type="button"
            disabled={isPublishing || isSaving}
            onClick={handleTogglePublish}
            className={artist.isPublished ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-accent text-accent-foreground hover:bg-accent/90"}
          >
            {isPublishing ? "Updating..." : artist.isPublished ? "Unpublish profile" : "Publish profile"}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            Profile visibility updates immediately after publishing changes.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            Only the profile owner can publish or unpublish this artist.
          </div>
        </CardContent>
      </Card>
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
      case "gallery":
        return renderGallery()
      case "booking":
        return renderBooking()
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
                <span className="text-sm font-bold text-accent-foreground">DJ</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <p className="text-sm font-semibold text-foreground">Dashboard</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={artist.isPublished ? "default" : "secondary"}>
              {artist.isPublished ? "Published" : "Draft"}
            </Badge>
            <Button asChild variant="outline" size="sm" className="border-border bg-background/70">
              <Link href={publicProfileUrl}>
                <ExternalLink className="h-4 w-4" />
                View profile
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-border bg-background/70"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            <Button
              size="sm"
              disabled={
                !isSaveDirty ||
                isSaving ||
                isPublishing ||
                isImportingReleaseMetadata ||
                importingSelectedReleaseIndex !== null ||
                isUploadingHeroImage ||
                isUploadingGalleryImage
              }
              onClick={handleSaveChanges}
              className="bg-accent text-accent-foreground"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
          {saveMessage ? <p className="text-xs text-muted-foreground">{saveMessage}</p> : null}
          {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="h-fit border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full rounded-md border border-border/50 bg-secondary/25 px-3 py-2 text-left text-sm text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">{renderActiveSection()}</div>
        </div>
      </div>
    </main>
  )
}
