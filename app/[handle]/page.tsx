import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import {
  ChevronRight,
  Download,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Play,
  Radio,
  Link2,
  Music,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import type { Artist, DjSet, PerformanceType, Release, ReleaseType, SocialLink, SocialPlatform, SubscriptionPlan, Video } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { getReleasePlatformLinks } from "@/lib/release-platforms"
import { PERFORMANCE_TYPE_LABELS } from "@/lib/dj-set-title"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GigsSection } from "@/components/djhq/gigs-section"
import { HeroIdentity } from "@/components/djhq/hero-identity"
import { ReleaseListenPanel } from "@/components/release-listen-panel"

type PublicProfilePageProps = {
  params: Promise<{
    handle: string
  }>
}

export const dynamic = "force-dynamic"

const socialIcons: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  beatport: Music2,
  spotify: Radio,
  soundcloud: Play,
  youtube: Youtube,
  tiktok: Music,
  website: Globe,
  other: Link2,
}

type ArtistRow = {
  id: string
  tenant_id: string | null
  owner_user_id: string | null
  handle: string
  artist_name: string
  real_name: string | null
  tagline: string | null
  hero_tagline: string | null
  genres: string[] | null
  location: string
  short_bio: string
  hero_image_url: string
  avatar_url: string | null
  booking_email: string
  booking_url: string | null
  press_kit_enabled: boolean
  press_kit_download_url: string | null
  press_kit_assets: string[] | null
  plan: string
  show_header_branding: boolean
  browser_title: string | null
  favicon_url: string | null
  hero_logo_url: string | null
  hero_identity_mode: string
  hero_text_style: string
  hero_logo_scale: number | null
  hero_logo_layout: string | null
  hero_logo_alignment: string | null
  hero_logo_offset_x: number | null
  hero_logo_offset_y: number | null
  is_published: boolean
  created_at: string
  updated_at: string
}

type SocialLinkRow = {
  platform: string
  label: string
  url: string
}

type ReleaseRow = {
  id: string
  title: string
  label: string
  credits: string | null
  release_date: string
  artwork_url: string
  platform_url: string
  type: string
  is_featured: boolean
  spotify_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  youtube_music_url: string | null
  beatport_url: string | null
  traxsource_url: string | null
  bandcamp_url: string | null
  other_url: string | null
  release_type: string | null
  version_type: string | null
  remixer: string | null
}

type DjSetRow = {
  id: string
  title: string
  performance_type: string
  venue: string | null
  event: string | null
  set_date: string | null
  image_url: string | null
  platform_url: string
  sort_order: number
}

type VideoRow = {
  id: string
  title: string
  venue: string | null
  video_date: string | null
  thumbnail_url: string | null
  custom_thumbnail_url: string | null
  platform_url: string
  sort_order: number
}

type GigRow = {
  id: string
  date: string
  venue: string
  city: string
  country: string
  ticket_url: string | null
  flyer_url: string | null
  instagram_url: string | null
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
  focal_x: number
  focal_y: number
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

function createSupabaseReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "pro" ? "pro" : "free"
}

function normalizeSocialPlatform(platform: string): SocialPlatform {
  return socialPlatforms.includes(platform as SocialPlatform) ? (platform as SocialPlatform) : "other"
}

function normalizeReleaseType(type: string): ReleaseType {
  if (type === "ep" || type === "EP") {
    return "EP"
  }

  return type === "album" ? "album" : "single"
}


function formatReleaseDate(releaseDate: string): string | null {
  if (!releaseDate) return null
  const date = new Date(releaseDate)
  if (isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

// Strips raw scraped noise from SoundCloud/platform titles for editorial display.
// Removes leading "ARTIST –/—/- " prefix and trailing " by ARTIST" or " –/—/- ARTIST".
// Deterministic regex only — no AI, no heuristics.
function cleanDjSetTitle(title: string, artistName: string): string {
  if (!title.trim()) return title
  const escaped = artistName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  let cleaned = title.trim()
  cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[–—-]\\s+`, "i"), "").trim()
  cleaned = cleaned.replace(new RegExp(`\\s+by\\s+${escaped}\\s*$`, "i"), "").trim()
  cleaned = cleaned.replace(new RegExp(`\\s*[–—-]\\s*${escaped}\\s*$`, "i"), "").trim()
  return cleaned || title.trim()
}

function mapReleaseRow(row: ReleaseRow): Release {
  return {
    id: row.id,
    title: row.title,
    label: row.label,
    credits: row.credits ?? undefined,
    releaseDate: row.release_date,
    artworkUrl: row.artwork_url,
    platformUrl: row.platform_url,
    type: normalizeReleaseType(row.type),
    spotifyUrl: row.spotify_url ?? undefined,
    appleMusicUrl: row.apple_music_url ?? undefined,
    soundcloudUrl: row.soundcloud_url ?? undefined,
    youtubeMusicUrl: row.youtube_music_url ?? undefined,
    beatportUrl: row.beatport_url ?? undefined,
    traxsourceUrl: row.traxsource_url ?? undefined,
    bandcampUrl: row.bandcamp_url ?? undefined,
    otherUrl: row.other_url ?? undefined,
    releaseType: row.release_type ?? undefined,
    versionType: row.version_type ?? undefined,
    remixer: row.remixer ?? undefined,
  }
}

function formatReleaseDateCatalog(releaseDate: string): string | null {
  if (!releaseDate) return null
  const date = new Date(releaseDate)
  if (isNaN(date.getTime())) return null
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase()
}

const VERSION_TYPE_LABELS: Record<string, string> = {
  original_mix: "Original Mix",
  extended_mix: "Extended Mix",
  radio_edit:   "Radio Edit",
  remix:        "Remix",
  club_mix:     "Club Mix",
  dub_mix:      "Dub Mix",
  instrumental: "Instrumental",
  vip_mix:      "VIP Mix",
  edit:         "Edit",
  mashup:       "Mashup",
  bootleg:      "Bootleg",
  rework:       "Rework",
  acapella:     "Acapella",
  tool:         "Tool",
}

const RELEASE_TYPE_LABELS: Record<string, string> = {
  single:      "Single",
  ep:          "EP",
  album:       "Album",
  compilation: "Compilation",
  va:          "VA",
}

function isReleaseRemix(release: Release): boolean {
  if (release.versionType === "remix") return true
  return /remix/i.test(release.title) || /remix/i.test(release.credits ?? "")
}


// Editorial de-duplication: determines whether two Release objects represent the
// same content. Used to prevent the featured release from also appearing in the
// Selected Releases carousel. Presentation-layer only — no data is mutated.
function isSameRelease(a: Release, b: Release | undefined): boolean {
  if (!b) return false
  // Primary: platform URL is the most stable cross-system identifier
  const aUrl = a.platformUrl.trim()
  const bUrl = b.platformUrl.trim()
  if (aUrl && bUrl) return aUrl === bUrl
  // Secondary: title + label
  const aTitle = a.title.trim().toLowerCase()
  const bTitle = b.title.trim().toLowerCase()
  const aLabel = a.label.trim().toLowerCase()
  const bLabel = b.label.trim().toLowerCase()
  if (aTitle && bTitle && aLabel && bLabel) return aTitle === bTitle && aLabel === bLabel
  // Last resort: title only
  return aTitle.length > 0 && aTitle === bTitle
}

function getMockArtistFallback(handle: string) {
  return handle === mockArtist.handle ? mockArtist : null
}

async function getArtistProfile(handle: string): Promise<Artist | null> {
  const normalizedHandle = handle.toLowerCase()
  const supabase = createSupabaseReadClient()

  if (!supabase) {
    return getMockArtistFallback(normalizedHandle)
  }

  try {
    const { data: artistRow, error: artistError } = await supabase
      .from("artists")
      .select("*")
      .eq("handle", normalizedHandle)
      .eq("is_published", true)
      .maybeSingle<ArtistRow>()

    if (artistError) {
      throw artistError
    }

    if (!artistRow) {
      return null
    }

    const [socialLinksResult, releasesResult, gigsResult, galleryImagesResult, djSetsResult, videosResult] = await Promise.all([
      supabase
        .from("social_links")
        .select("platform, label, url")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .returns<SocialLinkRow[]>(),
      supabase
        .from("releases")
        .select("id, title, label, credits, release_date, artwork_url, platform_url, type, is_featured, spotify_url, apple_music_url, soundcloud_url, youtube_music_url, beatport_url, traxsource_url, bandcamp_url, other_url, release_type, version_type, remixer")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .order("release_date", { ascending: false })
        .returns<ReleaseRow[]>(),
      supabase
        .from("gigs")
        .select("id, date, venue, city, country, ticket_url, flyer_url, instagram_url")
        .eq("artist_id", artistRow.id)
        .order("date", { ascending: true })
        .returns<GigRow[]>(),
      supabase
        .from("gallery_images")
        .select("id, image_url, alt_text, sort_order, focal_x, focal_y")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .returns<GalleryImageRow[]>(),
      supabase
        .from("dj_sets")
        .select("id, title, performance_type, venue, event, set_date, image_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("set_date", { ascending: false })
        .limit(4)
        .returns<DjSetRow[]>(),
      supabase
        .from("videos")
        .select("id, title, venue, video_date, thumbnail_url, custom_thumbnail_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("video_date", { ascending: false })
        .limit(3)
        .returns<VideoRow[]>(),
    ])

    if (
      socialLinksResult.error ||
      releasesResult.error ||
      gigsResult.error ||
      galleryImagesResult.error ||
      djSetsResult.error ||
      videosResult.error
    ) {
      throw (
        socialLinksResult.error ??
        releasesResult.error ??
        gigsResult.error ??
        galleryImagesResult.error ??
        djSetsResult.error ??
        videosResult.error
      )
    }

    const releaseRows = releasesResult.data ?? []
    const featuredReleaseRow = releaseRows.find((release) => release.is_featured)
    const selectedReleaseRows = releaseRows.filter((release) => !release.is_featured)

    return {
      id: artistRow.id,
      tenantId: artistRow.tenant_id ?? "",
      ownerUserId: artistRow.owner_user_id ?? "",
      handle: artistRow.handle,
      artistName: artistRow.artist_name,
      realName: artistRow.real_name ?? undefined,
      tagline: artistRow.tagline ?? undefined,
      heroTagline: artistRow.hero_tagline ?? undefined,
      genres: artistRow.genres ?? [],
      location: artistRow.location,
      shortBio: artistRow.short_bio,
      heroImageUrl: artistRow.hero_image_url,
      avatarUrl: artistRow.avatar_url ?? undefined,
      socialLinks: (socialLinksResult.data ?? []).map((link) => ({
        platform: normalizeSocialPlatform(link.platform),
        label: link.label,
        url: link.url,
      })),
      featuredRelease: featuredReleaseRow ? mapReleaseRow(featuredReleaseRow) : undefined,
      selectedReleases: selectedReleaseRows.map(mapReleaseRow),
      upcomingGigs: (gigsResult.data ?? []).map((gig) => ({
        id: gig.id,
        date: gig.date,
        venue: gig.venue,
        city: gig.city,
        country: gig.country,
        ticketUrl: gig.ticket_url ?? undefined,
        flyerUrl: gig.flyer_url ?? undefined,
        instagramUrl: gig.instagram_url ?? undefined,
      })),
      djSets: (djSetsResult.data ?? []).map(
        (row): DjSet => ({
          id: row.id,
          title: row.title,
          performanceType: (row.performance_type || "dj_set") as PerformanceType,
          performanceArtists: [],
          venue: row.venue ?? undefined,
          event: row.event ?? undefined,
          setDate: row.set_date ?? undefined,
          imageUrl: row.image_url ?? undefined,
          platformUrl: row.platform_url,
          sortOrder: row.sort_order,
          isPublished: true,
        }),
      ),
      videos: (videosResult.data ?? []).map(
        (row): Video => ({
          id: row.id,
          title: row.title,
          venue: row.venue ?? undefined,
          videoDate: row.video_date ?? undefined,
          thumbnailUrl: row.thumbnail_url ?? undefined,
          customThumbnailUrl: row.custom_thumbnail_url ?? null,
          platformUrl: row.platform_url,
          sortOrder: row.sort_order,
          isPublished: true,
        }),
      ),
      galleryImages: (galleryImagesResult.data ?? []).map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        focalX: image.focal_x ?? 50,
        focalY: image.focal_y ?? 50,
      })),
      bookingInfo: {
        email: artistRow.booking_email,
        bookingUrl: artistRow.booking_url ?? undefined,
      },
      pressKit: {
        enabled: artistRow.press_kit_enabled,
        downloadUrl: artistRow.press_kit_download_url ?? "",
        assetsIncluded: artistRow.press_kit_assets ?? [],
      },
      plan: normalizePlan(artistRow.plan),
      customDomains: [],
      showHeaderBranding: artistRow.show_header_branding,
      browserTitle: artistRow.browser_title ?? undefined,
      faviconUrl: artistRow.favicon_url ?? undefined,
      heroLogoUrl: artistRow.hero_logo_url ?? null,
      heroIdentityMode: (artistRow.hero_identity_mode || "text") as "text" | "logo" | "both",
      heroTextStyle: (artistRow.hero_text_style || "default") as "default" | "condensed" | "cinematic" | "editorial",
      heroLogoScale: artistRow.hero_logo_scale ?? 100,
      heroLogoLayout: (artistRow.hero_logo_layout || "replace_text") as "replace_text" | "above_text" | "below_text" | "left_text" | "right_text",
      heroLogoAlignment: (artistRow.hero_logo_alignment || "left") as "left" | "center" | "right",
      heroLogoOffsetX: artistRow.hero_logo_offset_x ?? 0,
      heroLogoOffsetY: artistRow.hero_logo_offset_y ?? 0,
      isPublished: artistRow.is_published,
      createdAt: artistRow.created_at,
      updatedAt: artistRow.updated_at,
    }
  } catch {
    return getMockArtistFallback(normalizedHandle)
  }
}

function getArtistInitials(artistName: string): string {
  const parts = artistName.trim().split(/[\s:_-]+/).filter(Boolean)
  if (!parts.length) return "DJ"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function generateStaticParams() {
  return [{ handle: mockArtist.handle }]
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = await getArtistProfile(handle)

  if (!artist) {
    return {
      title: "Artist not found - DJHQ",
    }
  }

  const isPro = artist.plan === "pro"
  const title = isPro
    ? (artist.browserTitle?.trim() || artist.artistName)
    : `${artist.artistName} — DJHQ`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.com"
  const faviconHref = isPro
    ? (artist.faviconUrl?.trim() || `${appUrl}/api/favicon/${encodeURIComponent(getArtistInitials(artist.artistName))}`)
    : "/favicon.ico"

  return {
    metadataBase: new URL("https://djhq.com"),
    title,
    description: artist.shortBio,
    icons: { icon: faviconHref },
    openGraph: {
      title,
      description: artist.shortBio,
      images: [
        {
          url: artist.heroImageUrl,
          alt: `${artist.artistName} press photo`,
        },
      ],
    },
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">{children}</h2>
  )
}

function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      title={link.label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-accent backdrop-blur-sm transition-colors hover:border-accent/35 hover:bg-accent/[0.08]"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{link.label}</span>
    </a>
  )
}

export default async function PublicArtistProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params
  const artist = await getArtistProfile(handle)

  if (!artist) {
    notFound()
  }

  const featuredRelease = artist.featuredRelease
  if (!featuredRelease) {
    notFound()
  }
  const selectedReleases = [...artist.selectedReleases].sort((a, b) => {
    const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : null
    const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : null
    if (timeA === null && timeB === null) return 0
    if (timeA === null) return 1
    if (timeB === null) return -1
    return timeB - timeA
  })
  // Exclude the current featured release from the carousel to avoid showing the
  // same content twice. Presentation-layer filter — underlying data is unchanged.
  const selectedReleasesForDisplay = selectedReleases.filter(
    (release) => !isSameRelease(release, featuredRelease),
  )
  const upcomingGigs = artist.upcomingGigs
  const photoPreview = artist.galleryImages.slice(0, 3)
  const featuredSet = artist.djSets[0] ?? null
  const recentSets = artist.djSets.slice(1, 4)
  const featuredVideo = artist.videos[0] ?? null
  const secondaryVideos = artist.videos.slice(1, 3)
  const featuredReleaseYear = new Date(featuredRelease.releaseDate).getUTCFullYear()
  const releaseTagline =
    artist.tagline && artist.tagline.trim() !== artist.shortBio.trim() ? artist.tagline : null
  // heroTagline takes priority; falls back to the legacy tagline field for existing artists.
  const displayHeroTagline = artist.heroTagline?.trim() || releaseTagline
  const hasFeaturedArtwork = featuredRelease.artworkUrl.trim().length > 0

  // Hero Identity System — Pro artists can use logo, text, or both.
  // Free artists always use text mode. Logo mode requires an uploaded logo.
  const isPro = artist.plan === "pro"
  const logoScale = isPro ? (artist.heroLogoScale ?? 100) : 100
  const logoLayout = (isPro ? (artist.heroLogoLayout ?? "replace_text") : "replace_text") as "replace_text" | "above_text" | "below_text" | "left_text" | "right_text"
  const logoAlignment = isPro ? (artist.heroLogoAlignment ?? "left") : "left"
  const logoOffsetX = isPro ? (artist.heroLogoOffsetX ?? 0) : 0
  const logoOffsetY = isPro ? (artist.heroLogoOffsetY ?? 0) : 0
  const heroTextStyle = isPro ? (artist.heroTextStyle ?? "default") : "default"
  const hasPressKit =
    artist.pressKit.enabled && artist.pressKit.downloadUrl.trim().length > 0
  const linkPriority: SocialPlatform[] = ["beatport", "spotify", "soundcloud", "youtube", "instagram"]
  const prioritizedLinks = artist.socialLinks.filter((link) => link.url.trim().length > 0).sort((a, b) => {
    const priorityA = linkPriority.indexOf(a.platform)
    const priorityB = linkPriority.indexOf(b.platform)
    const safePriorityA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA
    const safePriorityB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB

    return safePriorityA - safePriorityB
  })

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src={artist.heroImageUrl}
          alt=""
          fill
          aria-hidden="true"
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-[0.18] blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_4%,_hsl(var(--accent)/0.20),_transparent_30%),radial-gradient(circle_at_84%_16%,_hsl(var(--accent)/0.08),_transparent_28%),radial-gradient(circle_at_48%_84%,_hsl(var(--foreground)/0.06),_transparent_40%),linear-gradient(180deg,_hsl(var(--background)/0.46),_hsl(var(--background))_68%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.014]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_hsl(var(--background))_0%,_transparent_12%,_transparent_88%,_hsl(var(--background))_100%)]" />
        <div className="absolute left-1/2 top-0 h-[720px] w-[min(1280px,98vw)] -translate-x-1/2 rounded-full bg-accent/[0.025] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
        {(artist.plan !== "pro" || artist.showHeaderBranding) && (
          <header className="mb-4 flex items-center justify-between sm:mb-5">
            <Link
              href="/"
              className="group flex items-center gap-2 text-foreground/28 transition-colors duration-200 hover:text-foreground/55"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent/45 transition-colors duration-200 group-hover:bg-accent/70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">DJHQ</span>
            </Link>
            <span className="text-[11px] font-medium tracking-[0.05em] text-foreground/32">
              @{artist.handle}
            </span>
          </header>
        )}

        <section className="group overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-card/20 shadow-xl shadow-black/30">
          <div className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[680px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 1120px, (min-width: 768px) 640px, 100vw"
              className="object-cover saturate-[0.93] contrast-[1.08] brightness-[0.82] transition-transform duration-[1800ms] ease-out group-hover:scale-[1.02]"
            />
            {/* Multi-layer gradient system — cinematic depth and separation */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.32),_hsl(var(--background)/0.04)_28%,_hsl(var(--background)/0.52)_66%,_hsl(var(--background)/0.98))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_transparent_18%,_hsl(var(--background)/0.24)_55%,_hsl(var(--background)/0.72)_100%)]" />
            <div className="absolute inset-y-0 left-0 w-3/4 bg-[linear-gradient(92deg,_hsl(var(--background)/0.42),_transparent_72%)]" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_90%,_hsl(var(--accent)/0.10),_transparent_38%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_hsl(var(--background)/0.30)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
              {/* Cinematic content fade — stronger bottom lift */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(78%,460px)] bg-[linear-gradient(0deg,_hsl(var(--background)/0.95)_0%,_hsl(var(--background)/0.62)_38%,_hsl(var(--background)/0.10)_72%,_transparent_100%)]" />

              <div className="relative max-w-3xl">
                {/* Genre pills — premium editorial */}
                {artist.genres.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4">
                    {artist.genres.map((genre) => (
                      <Badge
                        key={genre}
                        className="border-white/[0.14] bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-[6px]"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Hero identity — shared component, same logic as dashboard preview */}
                <HeroIdentity
                  artistName={artist.artistName}
                  heroLogoUrl={artist.heroLogoUrl}
                  heroIdentityMode={artist.heroIdentityMode ?? "text"}
                  heroTextStyle={heroTextStyle}
                  heroLogoScale={logoScale}
                  heroLogoLayout={logoLayout}
                  heroLogoAlignment={logoAlignment}
                  heroLogoOffsetX={logoOffsetX}
                  heroLogoOffsetY={logoOffsetY}
                  isPro={isPro}
                />

                {displayHeroTagline ? (
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.15em] text-accent/90 sm:mt-2.5 sm:text-base">
                    {displayHeroTagline}
                  </p>
                ) : null}

                <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-white/65 sm:mt-3 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/80 sm:h-4 sm:w-4" />
                  {artist.location}
                </p>

                <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-[1.65] text-white/60 sm:mt-2.5 sm:text-sm lg:max-w-2xl lg:text-[0.9375rem]">
                  {artist.shortBio}
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:mt-5">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 w-fit rounded-full bg-accent px-6 text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:h-12"
                  >
                    <a href={`mailto:${artist.bookingInfo.email}`}>
                      <Mail className="h-4 w-4" />
                      Book this artist
                    </a>
                  </Button>
                  {prioritizedLinks.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {prioritizedLinks.map((link) => (
                        <MainLink key={`${link.platform}-${link.url}`} link={link} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Atmospheric lamina — unifies Press Photos / Featured Release / Gigs visually */}
        <div className="relative mt-8 lg:mt-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-[radial-gradient(ellipse_85%_65%_at_14%_10%,rgba(255,255,255,0.016)_0%,transparent_62%)] sm:-inset-8"
          />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] lg:items-start lg:gap-10">
          <section className="rounded-[1.75rem] border border-white/[0.06] bg-gradient-to-b from-card/50 to-background/40 p-4 shadow-lg shadow-black/20 sm:p-5 lg:col-start-2 lg:row-start-1 lg:p-4">
            <SectionTitle>Featured Release</SectionTitle>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)] sm:items-center sm:gap-5 lg:mt-4 lg:grid-cols-2 lg:gap-3.5">
              <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-secondary shadow-lg shadow-black/35 sm:mx-0 sm:max-w-none sm:w-full">
                {!hasFeaturedArtwork ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                    <Music2 className="h-10 w-10 text-accent/80" />
                  </div>
                ) : (
                  <Image
                    src={featuredRelease.artworkUrl}
                    alt={`${featuredRelease.title} artwork`}
                    fill
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 42vw, 200px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
              <div className="flex min-w-0 flex-col justify-center sm:py-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent/90">
                  {featuredRelease.type}
                </p>
                <h2 className="mt-1.5 text-balance text-2xl font-black leading-[1.05] tracking-[-0.01em] text-foreground sm:mt-2 sm:text-[1.65rem] lg:text-[1.5rem] lg:leading-[1.08] xl:text-[1.625rem]">
                  {featuredRelease.title}
                </h2>
                {featuredRelease.credits ? (
                  <p className="mt-1 text-xs text-muted-foreground/85 sm:mt-1.5">
                    {featuredRelease.credits}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:mt-2">
                  {featuredRelease.label} · {featuredReleaseYear}
                </p>
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-full bg-accent px-6 text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:mt-4 sm:w-auto lg:mt-3.5"
                >
                  <a href={featuredRelease.platformUrl}>
                    Listen / Buy
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {upcomingGigs.length > 0 ? <GigsSection gigs={upcomingGigs} /> : null}

          <section className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <SectionTitle>Press Photos</SectionTitle>
            <div className="mt-4 grid grid-cols-5 grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:h-[480px]">
              {photoPreview.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative overflow-hidden bg-secondary transition-transform duration-300 ease-out hover:-translate-y-0.5",
                    index === 0
                      ? "col-span-3 row-span-2 aspect-[4/5] rounded-2xl shadow-md shadow-black/25 hover:shadow-lg hover:shadow-black/35 lg:aspect-auto lg:rounded-[1.5rem]"
                      : "col-span-2 aspect-[4/3] rounded-xl shadow-sm shadow-black/20 hover:shadow-md hover:shadow-black/30 lg:aspect-auto",
                  )}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={photo.altText}
                    fill
                    loading="eager"
                    sizes={
                      index === 0
                        ? "(min-width: 1024px) 660px, (min-width: 768px) 45vw, 60vw"
                        : "(min-width: 1024px) 390px, (min-width: 768px) 37vw, 40vw"
                    }
                    className="object-cover saturate-[0.97] transition-transform duration-500 ease-out group-hover:scale-[1.018]"
                    style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-80" />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/[0.10]" />
                </div>
              ))}
            </div>
          </section>

        </div>
        </div>

        {selectedReleasesForDisplay.length > 0 ? (
          <section className="mt-10 lg:mt-12">
            <SectionTitle>Selected Releases</SectionTitle>
            <div className="relative mt-4">
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                {selectedReleasesForDisplay.map((release) => {
                  const catalogDate = formatReleaseDateCatalog(release.releaseDate)
                  const hasArtwork = !!(release.artworkUrl?.trim())
                  const isRemix = isReleaseRemix(release)
                  const platformLinks = getReleasePlatformLinks(release)

                  return (
                    <article
                      key={release.id}
                      className="w-[min(72vw,220px)] shrink-0 snap-start sm:w-[200px] lg:w-[220px]"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary shadow-md shadow-black/30">
                        {hasArtwork ? (
                          <Image
                            src={release.artworkUrl}
                            alt={`${release.title} artwork`}
                            fill
                            sizes="220px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.24),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                            <Music2 className="h-8 w-8 text-accent/75" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      </div>
                      <div className="mt-3 min-w-0">
                        {/* Title */}
                        <h3 className="text-balance text-base font-bold leading-tight text-foreground">
                          {release.title}
                        </h3>
                        {/* Artists / credits */}
                        {release.credits ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground/75">
                            {release.credits}
                          </p>
                        ) : null}
                        {/* Editorial metadata: release type · version */}
                        {(() => {
                          const typeLabel = release.releaseType
                            ? (RELEASE_TYPE_LABELS[release.releaseType] ?? null)
                            : null
                          const isRemixVersion = release.versionType === "remix" || (!release.versionType && isRemix)
                          const versionLabel = release.versionType
                            ? (VERSION_TYPE_LABELS[release.versionType] ?? release.versionType)
                            : (isRemix ? "Remix" : null)
                          const versionDisplay = isRemixVersion && release.remixer
                            ? `Remix by ${release.remixer}`
                            : versionLabel
                          const parts = [typeLabel, versionDisplay].filter(Boolean)
                          if (parts.length === 0) return null
                          return (
                            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
                              {parts.join(" · ")}
                            </p>
                          )
                        })()}
                        {/* Label — own line */}
                        <p className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
                          {release.label}
                        </p>
                        {/* Date — own line, quieter */}
                        {catalogDate ? (
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.10em] text-foreground/30">
                            {catalogDate}
                          </p>
                        ) : null}
                        <ReleaseListenPanel release={release} platformLinks={platformLinks} />
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-end bg-gradient-to-r from-transparent to-background/85 pr-2 sm:w-28 sm:pr-3">
                <ChevronRight className="h-4 w-4 text-foreground/20" />
              </div>
            </div>
          </section>
        ) : null}

        {(featuredVideo ?? featuredSet) ? (
          <section className="mt-10 lg:mt-14">
            <SectionTitle>Live Performance</SectionTitle>
            <div
              className={cn(
                "mt-4 overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-card/25",
                featuredVideo && featuredSet &&
                  "lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)] lg:divide-x lg:divide-white/[0.06]",
              )}
            >
              {featuredVideo ? (
                <div>
                  <a
                    href={featuredVideo.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:gap-5 sm:p-5"
                  >
                    <div className="relative aspect-video w-[140px] shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md shadow-black/30 sm:w-[180px]">
                      {(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl)!}
                          alt={`${featuredVideo.title} thumbnail`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                          <Play className="h-8 w-8 text-accent/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-8 w-8 text-white/80" />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col justify-center gap-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">Featured Video</p>
                      <h3 className="mt-0.5 text-balance text-base font-bold leading-tight text-foreground">
                        {featuredVideo.title}
                      </h3>
                      {(featuredVideo.venue ?? featuredVideo.videoDate) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[featuredVideo.venue, formatReleaseDate(featuredVideo.videoDate ?? "")].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors group-hover:text-accent/80">
                        Watch
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </a>
                  {secondaryVideos.length > 0 ? (
                    <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                      {secondaryVideos.map((video) => (
                        <a
                          key={video.id}
                          href={video.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 p-4 transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="relative aspect-video w-[88px] shrink-0 overflow-hidden rounded-lg bg-secondary shadow-sm shadow-black/25 sm:w-[96px]">
                            {(video.customThumbnailUrl ?? video.thumbnailUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={(video.customThumbnailUrl ?? video.thumbnailUrl)!}
                                alt={`${video.title} thumbnail`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                                <Play className="h-4 w-4 text-accent/60" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                              <Play className="h-4 w-4 text-white/80" />
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-col justify-center gap-0.5">
                            <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground/85 group-hover:text-foreground">
                              {video.title}
                            </p>
                            {(video.venue ?? video.videoDate) ? (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {[video.venue, formatReleaseDate(video.videoDate ?? "")].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent/70">
                              Watch
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {featuredSet ? (
                <div className={cn(featuredVideo && "border-t border-white/[0.06] lg:border-t-0")}>
                  <a
                    href={featuredSet.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-4 p-4 transition-colors hover:bg-white/[0.03] sm:gap-5 sm:p-5"
                  >
                    <div className="relative aspect-square w-[100px] shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md shadow-black/30 sm:w-[120px]">
                      {featuredSet.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featuredSet.imageUrl}
                          alt={`${featuredSet.title} thumbnail`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                          <Play className="h-7 w-7 text-accent/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col justify-center gap-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">
                        Latest {PERFORMANCE_TYPE_LABELS[featuredSet.performanceType] ?? "DJ Set"}
                      </p>
                      <h3 className="mt-0.5 text-balance text-base font-bold leading-tight text-foreground">
                        {cleanDjSetTitle(featuredSet.title, artist.artistName)}
                      </h3>
                      {(featuredSet.event ?? featuredSet.venue ?? featuredSet.setDate) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[featuredSet.event, featuredSet.venue, formatReleaseDate(featuredSet.setDate ?? "")].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors group-hover:text-accent/80">
                        Play
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </a>
                  {recentSets.length > 0 ? (
                    <div className="border-t border-white/[0.06] px-4 pb-2 sm:px-5">
                      <p className="pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/35">
                        Recent
                      </p>
                      <div className="divide-y divide-white/[0.04]">
                        {recentSets.map((set, index) => (
                          <a
                            key={set.id}
                            href={set.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 py-2.5 transition-colors hover:text-foreground"
                          >
                            <span className="w-5 shrink-0 text-right font-mono text-[10px] text-foreground/25">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground/85">{cleanDjSetTitle(set.title, artist.artistName)}</p>
                              {(set.event ?? set.venue ?? set.setDate) ? (
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {[set.event, set.venue, formatReleaseDate(set.setDate ?? "")].filter(Boolean).join(" · ")}
                                </p>
                              ) : null}
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-accent/50" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="relative mt-12 overflow-hidden rounded-[1.75rem] border border-accent/15 bg-[radial-gradient(circle_at_12%_0%,_hsl(var(--accent)/0.14),_transparent_48%),linear-gradient(160deg,_hsl(var(--accent)/0.06),_hsl(var(--card)/0.35))] p-6 shadow-lg shadow-black/25 sm:p-8 lg:mt-16 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.012]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="lg:max-w-xl">
              <SectionTitle>Booking</SectionTitle>
              <p className="mt-4 text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-[1.75rem]">
                Bring {artist.artistName} to your next room.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground lg:mt-3">
                Press kit, photos, and booking contact for promoters and venues.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:shrink-0 lg:items-end">
              {hasPressKit ? (
                <Button asChild className="h-12 w-full rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:w-fit sm:px-8">
                  <a href={artist.pressKit.downloadUrl}>
                    <Download className="h-4 w-4" />
                    Download press kit
                  </a>
                </Button>
              ) : (
                <Button asChild className="h-12 w-full rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:w-fit sm:px-8">
                  <a href={`mailto:${artist.bookingInfo.email}`}>
                    <Mail className="h-4 w-4" />
                    Book this artist
                  </a>
                </Button>
              )}
              <a href={`mailto:${artist.bookingInfo.email}`} className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground lg:text-right">
                {artist.bookingInfo.email}
              </a>
            </div>
          </div>
        </section>

        <footer className="py-10 text-center sm:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            <span className="h-px w-8 bg-border" />
            DJHQ
            <span className="h-px w-8 bg-border" />
          </Link>
        </footer>
      </div>
    </main>
  )
}
