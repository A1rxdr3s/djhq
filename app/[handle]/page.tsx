import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import {
  Download,
  ExternalLink,
  Globe,
  Instagram,
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
import type { Artist, DjSet, GigEventStatus, PerformanceType, Release, ReleaseType, SocialLink, SocialPlatform, SubscriptionPlan, Video } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { SelectedReleasesCarousel } from "@/components/djhq/selected-releases-carousel"
import { formatPerformanceMetadata } from "@/lib/dj-set-title"
import { getAccentTheme } from "@/lib/accent-themes"
import { Button } from "@/components/ui/button"
import { GigsSection } from "@/components/djhq/gigs-section"
import { GallerySection } from "@/components/djhq/gallery-section"
import { SelectedTracksSection } from "@/components/djhq/selected-tracks-section"
import { JoinTheFamily } from "@/components/djhq/join-the-family"
import { SectionHeader } from "@/components/djhq/section-header"
import { HeroIdentity } from "@/components/djhq/hero-identity"
import { HeroLogoElement } from "@/components/djhq/hero-logo-element"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"

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
  hero_logo_style: string | null
  hero_logo_readability: string | null
  hero_content_surface: string | null
  hero_logo_placement: string | null
  hero_content_width: string | null
  artist_accent_theme: string | null
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
  performance_artists: string[]
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
  club_venue: string | null
  event_status: string | null
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

function buildPerformanceArtist(
  performanceType: PerformanceType,
  performanceArtists: string[],
  fallback: string,
): string {
  const artists = performanceArtists.filter(Boolean)
  if (artists.length === 0) return fallback
  if (performanceType === "b2b") return artists.join(" B2B ")
  if (performanceType === "b3b") return artists.join(" B3B ")
  return artists[0] || fallback
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
    isFeatured: row.is_featured,
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
        .select("id, date, venue, city, country, club_venue, event_status, ticket_url, flyer_url, instagram_url")
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
        .select("id, title, performance_type, performance_artists, venue, event, set_date, image_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("set_date", { ascending: false })
        .limit(6)
        .returns<DjSetRow[]>(),
      supabase
        .from("videos")
        .select("id, title, venue, video_date, thumbnail_url, custom_thumbnail_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("video_date", { ascending: false })
        .limit(6)
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
      releases: releaseRows.map(mapReleaseRow),
      upcomingGigs: (gigsResult.data ?? []).map((gig) => ({
        id: gig.id,
        date: gig.date,
        venue: gig.venue,
        city: gig.city,
        country: gig.country,
        clubVenue: gig.club_venue ?? undefined,
        eventStatus: (gig.event_status ?? undefined) as GigEventStatus | undefined,
        ticketUrl: gig.ticket_url ?? undefined,
        flyerUrl: gig.flyer_url ?? undefined,
        instagramUrl: gig.instagram_url ?? undefined,
      })),
      djSets: (djSetsResult.data ?? []).map(
        (row): DjSet => ({
          id: row.id,
          title: row.title,
          performanceType: (row.performance_type || "dj_set") as PerformanceType,
          performanceArtists: row.performance_artists ?? [],
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
        useGalleryPhotos: true,
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
      heroLogoStyle: (artistRow.hero_logo_style || "solid") as "solid" | "soft" | "cinematic",
      heroLogoReadability: (artistRow.hero_logo_readability || "subtle") as "none" | "subtle" | "strong",
      heroContentSurface: (artistRow.hero_content_surface || "soft") as "none" | "soft" | "strong",
      heroLogoPlacement: (artistRow.hero_logo_placement || "editorial") as "editorial" | "top_center" | "center" | "custom",
      heroContentWidth: (artistRow.hero_content_width || "standard") as "compact" | "standard" | "wide",
      accentTheme: (artistRow.artist_accent_theme || "matrix") as "matrix" | "electric_blue" | "signal_red",
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


function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      title={link.label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-accent backdrop-blur-sm transition-all duration-150 hover:scale-[1.05] hover:border-accent/40 hover:bg-accent/[0.10]"
    >
      <Icon className="h-5 w-5" />
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

  const featuredRelease = artist.releases.find((r) => r.isFeatured) ?? null
  // Carousel: all non-featured releases, sorted by date descending
  const selectedReleasesForDisplay = artist.releases
    .filter((r) => !r.isFeatured)
    .sort((a, b) => {
      const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : null
      const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : null
      if (timeA === null && timeB === null) return 0
      if (timeA === null) return 1
      if (timeB === null) return -1
      return timeB - timeA
    })
  const upcomingGigs = artist.upcomingGigs
  const galleryImages = artist.galleryImages
  const featuredSet = artist.djSets[0] ?? null
  const recentSets = artist.djSets.slice(1, 6)
  const featuredVideo = artist.videos[0] ?? null
  const secondaryVideos = artist.videos.slice(1, 6)
  const featuredReleaseYear = featuredRelease ? new Date(featuredRelease.releaseDate).getUTCFullYear() : null
  const releaseTagline =
    artist.tagline && artist.tagline.trim() !== artist.shortBio.trim() ? artist.tagline : null
  // heroTagline takes priority; falls back to the legacy tagline field for existing artists.
  const displayHeroTagline = artist.heroTagline?.trim() || releaseTagline
  const hasFeaturedArtwork = !!featuredRelease?.artworkUrl.trim()

  // Hero Identity System — Pro artists can use logo, text, or both.
  // Free artists always use text mode. Logo mode requires an uploaded logo.
  const isPro = artist.plan === "pro"
  const logoScale = isPro ? (artist.heroLogoScale ?? 100) : 100
  const logoLayout = (isPro ? (artist.heroLogoLayout ?? "replace_text") : "replace_text") as "replace_text" | "above_text" | "below_text" | "left_text" | "right_text"
  const logoAlignment = isPro ? (artist.heroLogoAlignment ?? "left") : "left"
  const logoOffsetX = isPro ? (artist.heroLogoOffsetX ?? 0) : 0
  const logoOffsetY = isPro ? (artist.heroLogoOffsetY ?? 0) : 0
  const logoStyle = isPro ? (artist.heroLogoStyle ?? "solid") : "solid"
  const logoReadability = isPro ? (artist.heroLogoReadability ?? "subtle") : "subtle"
  const contentSurface = isPro ? (artist.heroContentSurface ?? "soft") : "soft"
  const contentWidth = isPro ? (artist.heroContentWidth ?? "standard") : "standard"
  const contentWidthClass = contentWidth === "compact" ? "max-w-2xl" : contentWidth === "wide" ? "max-w-5xl" : "max-w-4xl"
  const logoPlacement = isPro ? (artist.heroLogoPlacement ?? "editorial") : "editorial"
  // Floating placements render the logo as an independent absolutely-positioned layer.
  const isFloatingPlacement = logoPlacement !== "editorial"
  const hasFloatingLogo = isFloatingPlacement && !!artist.heroLogoUrl?.trim() &&
    (artist.heroIdentityMode === "logo" || artist.heroIdentityMode === "both")
  // Logo width formula — shared with HeroLogoElement for floating layer
  const logoWidth = `min(80vw, ${Math.min(logoScale * 3, 720)}px)`
  // Floating logo transform: center the logo at its anchor point, then apply offsets
  const floatingTransform = logoPlacement === "top_center"
    ? `translate(calc(-50% + ${logoOffsetX}px), ${logoOffsetY}px)`
    : `translate(calc(-50% + ${logoOffsetX}px), calc(-50% + ${logoOffsetY}px))`
  const heroTextStyle = isPro ? (artist.heroTextStyle ?? "default") : "default"
  const hasPressKit = artist.pressKit.enabled
  const pressKitHref = `/${artist.handle}/presskit`
  const accentThemeConfig = getAccentTheme(isPro ? artist.accentTheme : "matrix")
  const linkPriority: SocialPlatform[] = ["beatport", "spotify", "soundcloud", "youtube", "instagram"]
  const prioritizedLinks = artist.socialLinks.filter((link) => link.url.trim().length > 0).sort((a, b) => {
    const priorityA = linkPriority.indexOf(a.platform)
    const priorityB = linkPriority.indexOf(b.platform)
    const safePriorityA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA
    const safePriorityB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB

    return safePriorityA - safePriorityB
  })

  return (
    <>
      <style>{`:root{--accent:${accentThemeConfig.accent};--accent-foreground:${accentThemeConfig.accentForeground}}.genre-chip{box-shadow:0 0 16px color-mix(in srgb,var(--accent) 12%,transparent);transition:box-shadow 150ms ease}.genre-chip:hover{box-shadow:0 0 28px color-mix(in srgb,var(--accent) 24%,transparent)}`}</style>
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
            <div className="absolute inset-y-0 left-0 w-3/4 bg-[linear-gradient(92deg,_hsl(var(--background)/0.52),_transparent_72%)]" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_90%,_hsl(var(--accent)/0.10),_transparent_38%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_hsl(var(--background)/0.30)_100%)]" />
            {/* Photo vignette — subtle edge darkening for text contrast */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(92deg,_rgba(0,0,0,0.20)_0%,_transparent_50%),linear-gradient(0deg,_rgba(0,0,0,0.18)_0%,_transparent_32%)]" />

            {/* Floating logo layer — renders before content area in DOM so it sits between
                gradients and editorial content without requiring explicit z-index changes. */}
            {hasFloatingLogo && (
              <div
                className="pointer-events-none absolute"
                style={{
                  top: logoPlacement === "top_center" ? "18%" : "50%",
                  left: "50%",
                  transform: floatingTransform,
                }}
              >
                <HeroLogoElement
                  logoUrl={artist.heroLogoUrl!}
                  artistName={artist.artistName}
                  logoWidth={logoWidth}
                  heroLogoStyle={logoStyle}
                  heroLogoReadability={logoReadability}
                />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8 lg:pb-14 lg:pt-8">
              {/* Cinematic content fade — stronger bottom lift */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(78%,460px)] bg-[linear-gradient(0deg,_hsl(var(--background)/0.95)_0%,_hsl(var(--background)/0.62)_38%,_hsl(var(--background)/0.10)_72%,_transparent_100%)]" />

              <div className={cn(
                "relative",
                contentSurface === "soft" && "rounded-[1.5rem] border border-white/[0.07] bg-black/[0.14] px-4 py-3 backdrop-blur-[1.5px] [box-shadow:inset_0_0_60px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-5 sm:py-4",
                contentSurface === "strong" && "rounded-[1.5rem] border border-white/[0.09] bg-black/[0.22] px-4 py-3 backdrop-blur-[1.5px] [box-shadow:inset_0_0_60px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-5 sm:py-4",
              )}>
                {/* Subtle vertical gradient inside the surface — improves readability without a card look */}
                {contentSurface !== "none" && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-b from-white/[0.05] to-transparent" />
                )}

                {/* Genre chips — above logo, photo-safe overlay style */}
                {artist.genres.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2 sm:mb-6">
                    {artist.genres.map((genre) => (
                      <span
                        key={genre}
                        className="genre-chip rounded-full border border-accent/70 bg-black/35 px-3.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/90 backdrop-blur-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Hero identity — skipped for floating placements (logo rendered in floating layer above) */}
                {!isFloatingPlacement && (
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
                    heroLogoStyle={logoStyle}
                    heroLogoReadability={logoReadability}
                    isPro={isPro}
                  />
                )}

                {/* Text content block — width controlled by heroContentWidth */}
                <div className={cn("relative", contentWidthClass)}>
                  {/* Tagline — primary artistic proposition */}
                  {displayHeroTagline ? (
                    <p
                      className="mt-2 text-base font-medium uppercase tracking-[0.07em] text-accent/90 sm:mt-3 sm:text-lg"
                      style={{ textShadow: `0 0 12px rgba(0,0,0,0.45), 0 0 10px rgba(${accentThemeConfig.glowRgb}, 0.15)` }}
                    >
                      {displayHeroTagline}
                    </p>
                  ) : null}

                  {/* Location — supporting metadata */}
                  <p className={cn("flex items-center gap-2 text-sm text-white/70", displayHeroTagline ? "mt-2" : "mt-2.5")}>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-white/70 sm:h-4 sm:w-4" />
                    {artist.location.replace(/\s*\/\s*/g, ' • ')}
                  </p>

                  <p className="mt-3 max-w-[700px] text-base font-medium leading-[1.7] tracking-[0.02em] text-white/92 sm:mt-4">
                    {artist.shortBio}
                  </p>

                  {/* CTA row — BOOKINGS and/or PRESS KIT; hidden if neither is configured */}
                  {(artist.bookingInfo.email.trim() || hasPressKit) ? (
                    <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                      {artist.bookingInfo.email.trim() ? (
                        <div className="transition-transform duration-150 hover:-translate-y-0.5">
                          <BookingInquiryModal
                            artistHandle={artist.handle}
                            artistName={artist.artistName}
                            pressKitUrl={hasPressKit ? pressKitHref : undefined}
                          />
                        </div>
                      ) : null}
                      {hasPressKit ? (
                        <a
                          href={pressKitHref}
                          className="flex h-11 w-fit items-center gap-2.5 rounded-full border border-accent/50 bg-transparent px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/80 hover:bg-accent/10 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_18%,transparent)] sm:h-12"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Press Kit
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {prioritizedLinks.length > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5">
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
        <div className="relative grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] lg:items-stretch lg:gap-x-10 lg:gap-y-8">
          {featuredRelease && (
          <section className="rounded-[1.75rem] border border-white/[0.06] bg-gradient-to-b from-card/50 to-background/40 p-4 shadow-lg shadow-black/20 sm:p-5 lg:col-start-2 lg:row-start-1 lg:p-4">
            <SectionHeader>Featured Release</SectionHeader>
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
          )}

          {upcomingGigs.length > 0 ? <GigsSection gigs={upcomingGigs} /> : null}

          <section className="flex flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <SectionHeader variant="primary">Moments</SectionHeader>
            <GallerySection images={galleryImages} />
          </section>

        </div>
        </div>

        {selectedReleasesForDisplay.length > 0 ? (
          <section className="mt-10 lg:mt-12">
            <SectionHeader variant="primary">Releases</SectionHeader>
            <div className="mt-4">
              <SelectedReleasesCarousel releases={selectedReleasesForDisplay} />
            </div>
          </section>
        ) : null}

        {(featuredVideo ?? featuredSet) ? (
          <section className="mt-10 lg:mt-14">
            <SectionHeader>Performance</SectionHeader>
            <div
              className={cn(
                "mt-4 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]",
                featuredVideo && featuredSet &&
                  "lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]",
              )}
            >
              {/* ── Left: Featured Video ── */}
              {featuredVideo ? (
                <div className="flex flex-col">
                  <a
                    href={featuredVideo.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-5 sm:p-6"
                  >
                    {/* Cinematic thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-[20px] bg-secondary shadow-lg shadow-black/40">
                      {(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl)!}
                          alt={`${featuredVideo.title} thumbnail`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                          <Play className="h-10 w-10 text-accent/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Play className="h-12 w-12 fill-white/75 text-white/75" />
                      </div>
                    </div>
                    {/* Text block */}
                    <div className="mt-4 sm:mt-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">Featured Performance</p>
                      <h3 className="mt-2 text-balance text-xl font-black uppercase leading-tight tracking-[-0.02em] text-foreground sm:text-2xl">
                        {artist.artistName} × {featuredVideo.title}
                      </h3>
                      {featuredVideo.venue ? (
                        <p className="mt-1.5 text-sm text-white/40">{featuredVideo.venue}</p>
                      ) : null}
                      <span className="mt-4 inline-flex h-8 items-center rounded-full border border-accent/20 bg-transparent px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                        WATCH VIDEO ↗
                      </span>
                    </div>
                  </a>

                  {/* Secondary videos — compact media rows */}
                  {secondaryVideos.length > 0 ? (
                    <div className="border-t border-white/[0.04] px-4 pb-4 sm:px-6 sm:pb-5">
                      <p className="pb-1.5 pt-3.5 text-[8px] font-semibold uppercase tracking-[0.3em] text-foreground/18">Archive</p>
                      <div className="space-y-0.5">
                        {secondaryVideos.map((video, index) => (
                          <a
                            key={video.id}
                            href={video.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
                          >
                            <span className="w-5 shrink-0 text-right font-mono text-[10px] text-foreground/20 transition-colors duration-150 group-hover:text-accent/35">
                              {String(index + 2).padStart(2, "0")}
                            </span>
                            <div className="relative aspect-video w-[72px] shrink-0 overflow-hidden rounded-lg bg-secondary">
                              {(video.customThumbnailUrl ?? video.thumbnailUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={(video.customThumbnailUrl ?? video.thumbnailUrl)!}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
                                  <Play className="h-3 w-3 text-accent/50" />
                                </div>
                              )}
                              <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground/85 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-foreground">
                                {video.title}
                              </p>
                              {(video.venue ?? video.videoDate) ? (
                                <p className="mt-0.5 truncate text-[11px] text-white/32">
                                  {[video.venue, formatReleaseDate(video.videoDate ?? "")].filter(Boolean).join(" · ")}
                                </p>
                              ) : null}
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-accent/35 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent/65" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ── Right: Featured Show ── */}
              {featuredSet ? (
                <div
                  className={cn(
                    "flex flex-col",
                    featuredVideo && "border-t border-white/[0.04] lg:border-t-0 lg:border-l lg:border-white/[0.04]",
                  )}
                >
                  <a
                    href={featuredSet.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-5 sm:p-6"
                  >
                    {/* Square artwork — stacked, fills column width */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-secondary shadow-md shadow-black/30 sm:max-w-[220px]">
                      {featuredSet.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featuredSet.imageUrl}
                          alt={`${featuredSet.title} artwork`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                          <Play className="h-10 w-10 text-accent/70" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-black/[0.06]" />
                    </div>
                    <div className="mt-4 sm:mt-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                        Featured Set
                      </p>
                      {/* Event name — editorial primary title */}
                      <h3 className="mt-2 text-balance text-4xl font-black uppercase leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
                        {featuredSet.event?.trim() || featuredSet.venue?.trim() || cleanDjSetTitle(featuredSet.title, artist.artistName)}
                      </h3>
                      {/* Artist attribution */}
                      <p className="mt-2 text-sm font-bold uppercase tracking-[0.1em] text-accent/55">
                        {buildPerformanceArtist(featuredSet.performanceType, featuredSet.performanceArtists, artist.artistName)}
                      </p>
                      {/* Venue · Date — merged into one editorial line */}
                      {(() => {
                        const venuePart = (featuredSet.venue?.trim() && featuredSet.event?.trim()) ? featuredSet.venue.trim() : null
                        const datePart = featuredSet.setDate ? (formatReleaseDate(featuredSet.setDate)?.replace(",", "").toUpperCase() ?? null) : null
                        const combined = [venuePart, datePart].filter(Boolean).join(" · ")
                        return combined ? (
                          <p className="mt-1 text-sm uppercase tracking-[0.16em] text-white/38">
                            {combined}
                          </p>
                        ) : null
                      })()}
                      <span className="mt-5 inline-flex h-8 w-fit items-center rounded-full border border-accent/20 bg-transparent px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                        LISTEN SET ↗
                      </span>
                    </div>
                  </a>

                  {/* Selected Sets — curated list */}
                  {recentSets.length > 0 ? (
                    <>
                      {/* Editorial divider */}
                      <div className="mx-4 border-t border-white/[0.05] sm:mx-6" />
                      <div className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6">
                        <p className="pb-2 text-[9px] font-medium uppercase tracking-[0.22em] text-foreground/22">
                          Selected Sets
                        </p>
                        <div className="space-y-0.5">
                          {recentSets.map((set, index) => {
                            const showTitle = set.event?.trim() || set.venue?.trim() || cleanDjSetTitle(set.title, artist.artistName)
                            const showMeta = formatPerformanceMetadata(set.event, set.venue, formatReleaseDate(set.setDate ?? "")?.replace(",", "") ?? null)
                            const performanceArtist = buildPerformanceArtist(set.performanceType, set.performanceArtists, artist.artistName)
                            return (
                              <a
                                key={set.id}
                                href={set.platformUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.03]"
                              >
                                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-foreground/20 transition-colors duration-150 group-hover:text-accent/35">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                                  {set.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={set.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]">
                                      <Play className="h-3 w-3 text-accent/50" />
                                    </div>
                                  )}
                                  <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold uppercase tracking-[-0.01em] text-white transition-all duration-150 group-hover:translate-x-[2px]">
                                    {showTitle}
                                  </p>
                                  <p className="mt-[2px] truncate text-[11px] font-bold uppercase tracking-[0.18em] text-accent/50 transition-colors duration-150 group-hover:text-accent/70">
                                    {performanceArtist}
                                  </p>
                                  {showMeta ? (
                                    <p className="mt-[2px] truncate text-[11px] uppercase tracking-[0.18em] text-white/35">{showMeta}</p>
                                  ) : null}
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-accent/35 opacity-35 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-[2px] group-hover:opacity-80 group-hover:text-accent/65" />
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {artist.playlist && (
          <section className="mt-10 lg:mt-14">
            <SectionHeader>Selected Tracks</SectionHeader>
            <div className="mt-4">
              <SelectedTracksSection playlist={artist.playlist} />
            </div>
          </section>
        )}

        <section className="mt-10 lg:mt-14">
          <SectionHeader>Join the Family</SectionHeader>
          <div className="mt-4">
            <JoinTheFamily />
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
    </>
  )
}
