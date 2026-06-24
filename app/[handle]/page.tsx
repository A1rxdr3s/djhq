import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import {
  Calendar,
  ChevronDown,
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
import { resolveArtistFavicon } from "@/lib/artist-favicon"
import type { Artist, CareerTimelineCategory, CareerTimelineItem, DjSet, GigEventStatus, PerformanceType, Release, ReleaseType, SocialLink, SocialPlatform, SubscriptionPlan, Video } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { isSafeInternalPath, resolveSafeHref } from "@/lib/safe-url"
import { SelectedReleasesCarousel } from "@/components/djhq/selected-releases-carousel"
import { CollapsibleMobileReleases } from "@/components/djhq/collapsible-mobile-releases"
import { formatPerformanceMetadata, PERFORMANCE_TYPE_LABELS } from "@/lib/dj-set-title"
import { computeVideoTitle } from "@/lib/performance-title"
import { getAccentTheme } from "@/lib/accent-themes"
import { Button } from "@/components/ui/button"
import { GigsSection } from "@/components/djhq/gigs-section"
import { GallerySection } from "@/components/djhq/gallery-section"
import { SelectedTracksSection } from "@/components/djhq/selected-tracks-section"
import { ProfileClosing } from "@/components/djhq/profile-closing"
import { CareerUpdatesSection } from "@/components/djhq/career-updates-section"
import { MobileTabManager, MobileSection } from "@/components/profile/mobile-tab-manager"
import { MobileScrollNav } from "@/components/profile/mobile-scroll-nav"
import { SectionHeader } from "@/components/djhq/section-header"
import { HeroIdentity } from "@/components/djhq/hero-identity"
import { HeroLogoElement } from "@/components/djhq/hero-logo-element"
import { HeroSocialLinks, HeroMobileSocialRow } from "@/components/djhq/hero-social-links"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"
import { PUBLIC_SECTION_NAV } from "@/lib/public-nav"

type PublicProfilePageProps = {
  params: Promise<{ handle: string }>
}

export const dynamic = "force-dynamic"

const socialIcons: Record<SocialPlatform, LucideIcon> = {
  instagram:        Instagram,
  beatport:         Music2,
  spotify:          Radio,
  soundcloud:       Play,
  youtube:          Youtube,
  tiktok:           Music,
  "resident-advisor": Globe,
  bandsintown:      Calendar,
  website:          Globe,
  other:            Link2,
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
  press_kit_public_url: string | null
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
  footer_logo_url: string | null
  footer_logo_mode: string | null
  footer_logo_width: number | null
  footer_booking_email: string | null
  footer_contact_email: string | null
  footer_demos_email: string | null
  footer_newsletter_enabled: boolean | null
  footer_socials_enabled: boolean | null
  footer_copyright: string | null
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
  city: string | null
  image_url: string | null
  platform_url: string
  sort_order: number
}

type VideoRow = {
  id: string
  title: string
  video_artists: string[]
  video_event: string | null
  video_city: string | null
  video_country: string | null
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
  event_name: string | null
  venue: string
  city: string
  country: string
  club_venue: string | null
  event_status: string | null
  ticket_url: string | null
  flyer_url: string | null
  instagram_url: string | null
  visibility_status: string | null
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
  focal_x: number
  focal_y: number
}

type CareerTimelineRow = {
  id: string
  title: string
  category: string
  event_date: string
  location: string | null
  description: string | null
  link: string | null
  image_url: string | null
  is_featured: boolean
  is_published: boolean
  sort_order: number | null
  layout_size: string | null
  story_slot: string | null
  show_in_collapsed: boolean
}

const VALID_TIMELINE_CATEGORIES = new Set<string>([
  "residency", "festival", "club_show", "international",
  "release", "press", "chart", "tour", "other",
])

function normalizeTimelineCategory(c: string): CareerTimelineCategory {
  return VALID_TIMELINE_CATEGORIES.has(c) ? (c as CareerTimelineCategory) : "other"
}

const socialPlatforms: SocialPlatform[] = [
  "beatport",
  "spotify",
  "soundcloud",
  "youtube",
  "instagram",
  "tiktok",
  "resident-advisor",
  "bandsintown",
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

// Formats genre tags for editorial display with natural language conjunctions.
// Handles both string[] and raw comma-separated strings defensively.
// ["House", "Tech House"] → "House & Tech House"
// ["House", "Tech House", "Melodic House"] → "House, Tech House & Melodic House"
function formatGenres(raw: string | string[] | null | undefined): string {
  if (!raw) return ""
  const tags = (Array.isArray(raw) ? raw : raw.split(",").map((s) => s.trim())).filter(Boolean)
  if (tags.length === 0) return ""
  if (tags.length === 1) return tags[0]
  return `${tags.slice(0, -1).join(", ")} & ${tags[tags.length - 1]}`
}

function buildCredibilityLine(shortBio: string, genres: string[]): string {
  const bio = shortBio.trim()
  const genreStr = formatGenres(genres)
  if (bio && genreStr) return `${bio} · ${genreStr}`
  return bio || genreStr
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

// Parses scraped video titles that may contain the artist name as a prefix.
// e.g. "ARTIST X EVENT NAME" → { displayTitle: "EVENT NAME", attribution: "ARTIST" }
//      "ARTIST b2b OTHER" → { displayTitle: "B2B OTHER", attribution: "ARTIST B2B OTHER" }
//      "VENUE NAME" → { displayTitle: "VENUE NAME", attribution: "ARTIST" }
function parseVideoTitle(
  title: string,
  artistName: string,
): { displayTitle: string; attribution: string } {
  const t = title.trim()
  if (!t) return { displayTitle: t, attribution: artistName }

  const looseArtist = artistName
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[: ]+/g, "[: ]+")

  const b2bMatch = t.match(new RegExp(`^${looseArtist}\\s+b2b\\s+(.+)$`, "i"))
  if (b2bMatch) {
    const other = b2bMatch[1].trim()
    return { displayTitle: `B2B ${other}`, attribution: `${artistName} B2B ${other}` }
  }

  const b3bMatch = t.match(new RegExp(`^${looseArtist}\\s+b3b\\s+(.+)$`, "i"))
  if (b3bMatch) {
    const other = b3bMatch[1].trim()
    return { displayTitle: `B3B ${other}`, attribution: `${artistName} B3B ${other}` }
  }

  // Standard separators: X / x / × / — / – / @ / --
  const sepMatch = t.match(new RegExp(`^${looseArtist}\\s*(?:[Xx×–—@]|-{1,2})\\s+(.+)$`))
  if (sepMatch) {
    return { displayTitle: sepMatch[1].trim(), attribution: artistName }
  }

  return { displayTitle: t, attribution: artistName }
}

// Resolves the display title and attribution for a video, preferring structured
// metadata (videoArtists + videoEvent) over the legacy parseVideoTitle regex.
function getVideoDisplayInfo(
  video: Video,
  fallbackArtistName: string,
): { displayTitle: string; attribution: string } {
  const hasStructured = video.videoArtists.length > 0 || !!video.videoEvent
  if (hasStructured) {
    const generated = computeVideoTitle(
      video.videoArtists,
      video.videoEvent,
      video.venue,
      fallbackArtistName,
    )
    const displayTitle = generated || video.title
    const attribution =
      video.videoArtists.filter(Boolean).join(" b2b ") || fallbackArtistName
    return { displayTitle, attribution }
  }
  return parseVideoTitle(video.title, fallbackArtistName)
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

    const [socialLinksResult, releasesResult, gigsResult, galleryImagesResult, djSetsResult, videosResult, careerTimelineResult] = await Promise.all([
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
        .select("id, date, event_name, venue, city, country, club_venue, event_status, ticket_url, flyer_url, instagram_url, visibility_status")
        .eq("artist_id", artistRow.id)
        .is("deleted_at", null)
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
        .select("id, title, performance_type, performance_artists, venue, event, set_date, city, image_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("set_date", { ascending: false })
        .limit(6)
        .returns<DjSetRow[]>(),
      supabase
        .from("videos")
        .select("id, title, video_artists, video_event, video_city, video_country, venue, video_date, thumbnail_url, custom_thumbnail_url, platform_url, sort_order")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("video_date", { ascending: false })
        .limit(6)
        .returns<VideoRow[]>(),
      supabase
        .from("artist_career_timeline")
        .select("id, title, category, event_date, location, description, link, image_url, is_featured, is_published, sort_order, layout_size, story_slot, show_in_collapsed")
        .eq("artist_id", artistRow.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("event_date", { ascending: false })
        .returns<CareerTimelineRow[]>(),
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
        eventName: gig.event_name ?? undefined,
        venue: gig.venue,
        city: gig.city,
        country: gig.country,
        clubVenue: gig.club_venue ?? undefined,
        eventStatus: (gig.event_status ?? undefined) as GigEventStatus | undefined,
        ticketUrl: gig.ticket_url ?? undefined,
        flyerUrl: gig.flyer_url ?? undefined,
        instagramUrl: gig.instagram_url ?? undefined,
        visibilityStatus: (gig.visibility_status ?? "announced") as "announced" | "tba" | "tbc" | "cancelled",
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
          city: row.city ?? undefined,
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
          videoArtists: row.video_artists ?? [],
          videoEvent: row.video_event ?? undefined,
          videoCity: row.video_city ?? undefined,
          videoCountry: row.video_country ?? undefined,
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
        publicUrl: artistRow.press_kit_public_url ?? undefined,
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
      footerLogoUrl: artistRow.footer_logo_url ?? null,
      footerLogoMode: (artistRow.footer_logo_mode || 'auto') as 'auto' | 'light' | 'dark',
      footerLogoWidth: artistRow.footer_logo_width ?? 220,
      footerBookingEmail: artistRow.footer_booking_email ?? null,
      footerContactEmail: artistRow.footer_contact_email ?? null,
      footerDemosEmail: artistRow.footer_demos_email ?? null,
      footerNewsletterEnabled: artistRow.footer_newsletter_enabled ?? true,
      footerSocialsEnabled: artistRow.footer_socials_enabled ?? true,
      footerCopyright: artistRow.footer_copyright ?? null,
      careerTimeline: (careerTimelineResult.data ?? []).map((r): CareerTimelineItem => ({
        id: r.id,
        title: r.title,
        category: normalizeTimelineCategory(r.category),
        eventDate: r.event_date,
        location: r.location ?? undefined,
        description: r.description ?? undefined,
        link: r.link ?? undefined,
        imageUrl: r.image_url ?? undefined,
        isFeatured: r.is_featured,
        isPublished: r.is_published,
        sortOrder: r.sort_order,
        layoutSize: (r.layout_size as CareerTimelineItem['layoutSize']) ?? null,
        storySlot: (r.story_slot as CareerTimelineItem['storySlot']) ?? null,
        showInCollapsed: r.show_in_collapsed,
      })),
      createdAt: artistRow.created_at,
      updatedAt: artistRow.updated_at,
    }
  } catch {
    return getMockArtistFallback(normalizedHandle)
  }
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

  // Resolve favicon — query brand_asset_assignments directly for ground truth and a stable
  // cache key. This bypasses any lag in the artists.favicon_url sync column and ensures
  // the browser gets a versioned URL that changes only when the assignment changes.
  let faviconUrl = artist.faviconUrl
  let faviconCacheKey: string | null = null
  if (isPro && artist.id) {
    const supabase = createSupabaseReadClient()
    if (supabase) {
      const { data: faviconAssignment } = await supabase
        .from("brand_asset_assignments")
        .select("id, variant_url")
        .eq("artist_id", artist.id)
        .eq("assignment_type", "favicon")
        .maybeSingle()
      if (faviconAssignment?.variant_url) {
        faviconUrl = faviconAssignment.variant_url
        faviconCacheKey = faviconAssignment.id.slice(0, 8)
      }
    }
  }

  const faviconHref = resolveArtistFavicon({
    isPro,
    faviconUrl,
    artistName: artist.artistName,
    cacheKey: faviconCacheKey,
  })

  return {
    metadataBase: new URL("https://djhq.com"),
    title,
    description: artist.shortBio,
    icons: {
      icon: faviconHref,
      shortcut: faviconHref,
      apple: faviconHref,
    },
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
  const href = resolveSafeHref(link.url)
  if (!href) return null
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={href}
      aria-label={`${link.label} for this artist`}
      title={link.label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-accent backdrop-blur-sm transition-all duration-150 hover:scale-[1.05] hover:border-accent/40 hover:bg-accent/[0.10]"
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
  // Mobile carousel includes the featured release as first item (its standalone card is hidden on mobile)
  const mobileReleasesForDisplay = featuredRelease
    ? [featuredRelease, ...selectedReleasesForDisplay]
    : selectedReleasesForDisplay
  const upcomingGigs = artist.upcomingGigs
  const today = new Date().toISOString().slice(0, 10)
  const futureGigs = upcomingGigs.filter((g) => g.date.slice(0, 10) >= today && g.visibilityStatus !== "cancelled")
  const pastGigs = [...upcomingGigs.filter((g) => g.date.slice(0, 10) < today && g.visibilityStatus !== "cancelled")].reverse()
  const galleryImages = artist.galleryImages
  const featuredSet = artist.djSets[0] ?? null
  const recentSets = artist.djSets.slice(1, 5)
  const featuredVideo = artist.videos[0] ?? null
  const secondaryVideos = artist.videos.slice(1, 5)
  const featuredReleaseYear = featuredRelease ? new Date(featuredRelease.releaseDate).getUTCFullYear() : null
  const releaseTagline =
    artist.tagline && artist.tagline.trim() !== artist.shortBio.trim() ? artist.tagline : null
  // heroTagline takes priority; falls back to the legacy tagline field for existing artists.
  const displayHeroTagline = artist.heroTagline?.trim() || releaseTagline
  const credibilityLine = artist.shortBio.trim()
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
  const logoWidth = `min(80vw, ${Math.min(Math.round(logoScale * 3.45), 828)}px)`
  // Floating logo transform: center the logo at its anchor point, then apply offsets
  const floatingTransform = logoPlacement === "top_center"
    ? `translate(calc(-50% + ${logoOffsetX}px), ${logoOffsetY}px)`
    : `translate(calc(-50% + ${logoOffsetX}px), calc(-50% + ${logoOffsetY}px))`
  const heroTextStyle = isPro ? (artist.heroTextStyle ?? "default") : "default"
  const hasPressKit = artist.pressKit.enabled

  // Resolve the Press Kit button URL:
  //   1. Artist-configured custom URL (e.g. /press or https://drive.google.com/...)
  //   2. /presskit — correct default for custom domains (artist-domain.com/presskit)
  //   3. /[handle]/presskit — fallback for DJHQ-hosted profiles on djhq.co
  const _reqHeaders = await headers()
  const _reqHost = _reqHeaders.get("host") ?? ""
  const _appHost = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.com").host
  const _isCustomDomain = Boolean(_reqHost) && _reqHost !== _appHost && !_reqHost.startsWith("localhost")
  const pressKitHref = artist.pressKit.publicUrl?.trim()
    || (_isCustomDomain ? "/presskit" : `/${artist.handle}/presskit`)
  const safePressKitHref = resolveSafeHref(pressKitHref)
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
      <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
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

      {/* ── Full-bleed cinematic hero — edge-to-edge, no card container ── */}
      <section id="hero" className="relative overflow-hidden" style={{ minHeight: "100dvh" }}>
        {/* Top readability gradient — supports nav contrast without visible overlay */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[160px]"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.24) 55%, rgba(0,0,0,0) 100%)" }}
        />

        {/* Artist-website navigation — integrated into hero */}
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 pt-3 sm:px-10 sm:pt-7 lg:px-12">
          {/* Left: section navigation — 4 items on mobile (Performance hidden), all 5 on desktop */}
          <nav className="flex items-center gap-4 sm:gap-12">
            {PUBLIC_SECTION_NAV
              .filter(({ label }) => label !== "Contact" || !!artist.bookingInfo.email.trim())
              .map(({ label, href: navHref }) => (
                <a
                  key={label}
                  href={navHref}
                  className={cn(
                    "text-[13px] font-semibold uppercase tracking-[0.12em] text-white/88 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-white sm:text-[14px] sm:tracking-[0.18em]",
                    label === "Performance" && "hidden sm:block",
                  )}
                >
                  {label}
                </a>
              ))}
          </nav>
          {/* Right: social platform links */}
          <div className="flex items-center gap-3">
            <HeroSocialLinks links={prioritizedLinks} />
            {/* DJHQ attribution — subtle, non-pro only */}
            {(artist.plan !== "pro" || artist.showHeaderBranding) && (
              <Link href="/" className="ml-1 flex items-center gap-1.5 text-white/22 transition-colors duration-300 hover:text-white/45">
                <span className="inline-block h-1 w-1 rounded-full bg-accent/40" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.24em]">DJHQ</span>
              </Link>
            )}
          </div>
        </header>

        <div className="relative min-h-[100dvh]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="100vw"
              className="object-cover saturate-[0.92] contrast-[1.10] brightness-[0.86]"
            />
            {/* ── Cinematic gradient composition — poster / editorial style ─────────
                Zone 1 (top):    Soft vignette — logo readable, crowd/lights above breathe.
                Zone 2 (edges):  Light elliptical frame — subtle, does not crush center.
                Zone 3 (bottom): Bottom lift — text readable, fast falloff into the scene.
                Zone 3b (corner): Radial ellipse at bottom-left — behind text only.
                Zone 4 (accent): Brand glow at lower-left.
                Zone 5 (grade):  Very light film grade — tonal unity without crushing energy.
                ─────────────────────────────────────────────────────────────────────── */}
            {/* Zone 1 — top vignette: logo readability without crushing the upper scene */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.55)_0%,_hsl(var(--background)/0.14)_26%,_transparent_48%)]" />
            {/* Zone 2 — edge vignette: subtle periphery framing */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_130%_100%_at_50%_0%,_transparent_42%,_hsl(var(--background)/0.22)_100%)]" />
            {/* Zone 3 — cinematic bottom lift: extended reach for smooth hero-to-content transition */}
            <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 22%, rgba(0,0,0,0.30) 48%, rgba(0,0,0,0.08) 66%, rgba(0,0,0,0) 82%)" }} />
            {/* Zone 3b — bottom-left corner ellipse: readability behind text, image open above */}
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 0% 100%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.40) 38%, rgba(0,0,0,0) 68%)" }} />
            {/* Zone 4 — accent atmosphere: warm accent glow for brand character */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_90%,_hsl(var(--accent)/0.09),_transparent_42%)]" />
            {/* Zone 5 — film grade: very light tonal unity — reduced to preserve image energy */}
            <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(0,0,0,0.08)" }} />

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

            {/* ── Unified identity block ──────────────────────────────────────
                Mobile: logo lives in a separate upper brand block (sm:hidden, top-[22%]).
                        CTA stack (tagline → CTAs → social → scroll) sits independently below.
                Tablet/desktop (sm+): logo + CTA stack unified in one editorial block.
                Floating placement: independent floating logo layer, CTAs anchor to bottom. */}
            {/* Mobile-only logo — upper brand zone, brand header over photo */}
            {!isFloatingPlacement && (
              <div className="absolute inset-x-0 top-[23%] z-10 flex flex-col items-center px-4 text-center sm:hidden">
                <div className="relative">
                  <div
                    className="pointer-events-none absolute -inset-8"
                    aria-hidden
                    style={{ background: "radial-gradient(ellipse 90% 70% at center, rgba(0,0,0,0.28) 0%, transparent 68%)" }}
                  />
                  <div className="relative" style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 32px rgba(0,0,0,0.18))" }}>
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
                  </div>
                </div>
              </div>
            )}
            {/* Mobile CTA stack — tagline → CTAs → social → scroll (sm:hidden, editorial placement only) */}
            {!isFloatingPlacement && (
              <div className="absolute inset-x-0 bottom-[28%] z-10 flex flex-col items-center px-6 text-center sm:hidden">
                {(displayHeroTagline || credibilityLine) && (
                  <div className="mb-7 flex flex-col items-center gap-3">
                    {displayHeroTagline && (
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/68">
                        {displayHeroTagline.split(/\. /).map((part, i, arr) => (
                          <span key={i} className="block">{part}{i < arr.length - 1 ? "." : ""}</span>
                        ))}
                      </p>
                    )}
                    {credibilityLine && (
                      <p className="max-w-[260px] text-balance text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                        {credibilityLine}
                      </p>
                    )}
                  </div>
                )}
                {(artist.bookingInfo.email.trim() || hasPressKit) && (
                  <div className="flex flex-wrap items-center justify-center gap-[10px]">
                    {artist.bookingInfo.email.trim() && (
                      <div className="transition-transform duration-150 hover:-translate-y-0.5">
                        <BookingInquiryModal
                          artistHandle={artist.handle}
                          artistName={artist.artistName}
                          pressKitUrl={hasPressKit && safePressKitHref ? safePressKitHref : undefined}
                        />
                      </div>
                    )}
                    {hasPressKit && safePressKitHref && (
                      <a
                        href={safePressKitHref}
                        {...(!isSafeInternalPath(safePressKitHref) && { target: "_blank", rel: "noopener noreferrer" })}
                        className="flex h-12 w-fit items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.04] px-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/65 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[0.08]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Press Kit
                      </a>
                    )}
                  </div>
                )}
                {prioritizedLinks.length > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-7">
                    {prioritizedLinks.map((link) => {
                      const href = resolveSafeHref(link.url)
                      if (!href) return null
                      const Icon = socialIcons[link.platform]
                      return (
                        <a
                          key={link.platform}
                          href={href}
                          aria-label={link.label}
                          title={link.label}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="-m-2 p-2 text-white/75 transition-colors duration-200 hover:text-white"
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </a>
                      )
                    })}
                  </div>
                )}
                <a
                  href="#shows"
                  aria-label="Scroll to content"
                  className="mt-3 flex flex-col items-center gap-[5px] opacity-[0.32] transition-all duration-150 active:translate-y-0.5 active:opacity-90"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.20em] text-white">Scroll to explore</span>
                  <ChevronDown className="h-[11px] w-[11px] text-white" />
                </a>
              </div>
            )}
            {!isFloatingPlacement ? (
              /* Editorial: tablet/desktop only (sm+) — logo + CTA stack unified */
              <div className="absolute inset-x-0 top-[47%] z-10 hidden flex-col items-center px-4 text-center sm:flex sm:top-[38%]">

                {/* Logo — tablet/desktop only (sm+); mobile logo is the separate upper brand block */}
                <div className="relative hidden sm:block">
                  <div
                    className="pointer-events-none absolute -inset-8 sm:-inset-12"
                    aria-hidden
                    style={{ background: "radial-gradient(ellipse 90% 70% at center, rgba(0,0,0,0.28) 0%, transparent 68%)" }}
                  />
                  <div className="relative" style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 32px rgba(0,0,0,0.18))" }}>
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
                  </div>
                </div>

                {/* Tagline + short bio — artist statement cluster */}
                {(displayHeroTagline || credibilityLine) && (
                  <div className="mt-4 flex flex-col items-center gap-4 sm:mt-11">
                    {displayHeroTagline && (
                      <p
                        className="max-w-[80vw] text-[14px] font-bold uppercase tracking-[0.12em] text-white/90 line-clamp-2 sm:max-w-none sm:text-[17px] sm:tracking-[0.22em] sm:line-clamp-none"
                        style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
                      >
                        {displayHeroTagline}
                      </p>
                    )}
                    {credibilityLine && (
                      <p
                        className="max-w-2xl text-pretty text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[14px] sm:tracking-[0.20em]"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
                      >
                        {credibilityLine}
                      </p>
                    )}
                  </div>
                )}

                {/* CTAs */}
                {(artist.bookingInfo.email.trim() || hasPressKit) ? (
                  <div className="mt-[17px] flex flex-wrap items-center justify-center gap-[10px] sm:mt-9 sm:flex-nowrap sm:gap-3">
                    {artist.bookingInfo.email.trim() ? (
                      <div className="transition-transform duration-150 hover:-translate-y-0.5">
                        <BookingInquiryModal
                          artistHandle={artist.handle}
                          artistName={artist.artistName}
                          pressKitUrl={hasPressKit && safePressKitHref ? safePressKitHref : undefined}
                        />
                      </div>
                    ) : null}
                    {hasPressKit && safePressKitHref ? (
                      <a
                        href={safePressKitHref}
                        {...(!isSafeInternalPath(safePressKitHref) && { target: "_blank", rel: "noopener noreferrer" })}
                        className="flex h-12 w-fit items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.04] px-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/65 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[0.08] sm:px-8 sm:text-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Press Kit
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <HeroMobileSocialRow links={prioritizedLinks} />
                {/* Scroll cue — flows inline 48px below social icons, mobile only */}
                <a
                  href="#shows"
                  aria-label="Scroll to content"
                  className="mt-12 flex flex-col items-center gap-[5px] opacity-[0.36] transition-all duration-150 active:translate-y-0.5 active:opacity-90 md:hidden"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.20em] text-white">
                    Scroll to explore
                  </span>
                  <ChevronDown className="h-[11px] w-[11px] text-white" />
                </a>
              </div>
            ) : (
              /* Floating logo placement: logo is separate, tagline + CTAs centered below */
              <div className="absolute inset-x-0 bottom-[14%] z-10 flex flex-col items-center px-4 text-center sm:bottom-[16%]">
                {(displayHeroTagline || credibilityLine) && (
                  <div className="mb-5 flex flex-col items-center gap-3">
                    {displayHeroTagline && (
                      <p
                        className="max-w-[80vw] text-[13px] font-semibold uppercase tracking-[0.12em] text-white/78 line-clamp-2 sm:max-w-none sm:text-[14px] sm:tracking-[0.22em] sm:line-clamp-none"
                        style={{ textShadow: "0 1px 10px rgba(0,0,0,0.50)" }}
                      >
                        {displayHeroTagline}
                      </p>
                    )}
                    {credibilityLine && (
                      <p
                        className="max-w-[260px] text-pretty text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:max-w-2xl sm:text-[12px] sm:tracking-[0.20em]"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.40)" }}
                      >
                        {credibilityLine}
                      </p>
                    )}
                  </div>
                )}
                {(artist.bookingInfo.email.trim() || hasPressKit) ? (
                  <div className="flex flex-wrap items-center justify-center gap-[10px] sm:flex-nowrap sm:gap-3">
                    {artist.bookingInfo.email.trim() ? (
                      <div className="transition-transform duration-150 hover:-translate-y-0.5">
                        <BookingInquiryModal
                          artistHandle={artist.handle}
                          artistName={artist.artistName}
                          pressKitUrl={hasPressKit && safePressKitHref ? safePressKitHref : undefined}
                        />
                      </div>
                    ) : null}
                    {hasPressKit && safePressKitHref ? (
                      <a
                        href={safePressKitHref}
                        {...(!isSafeInternalPath(safePressKitHref) && { target: "_blank", rel: "noopener noreferrer" })}
                        className="flex h-12 w-fit items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] sm:px-8 sm:text-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Press Kit
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <HeroMobileSocialRow links={prioritizedLinks} />
              </div>
            )}
            {/* Mobile — extended bottom vignette: hero dissolves into content darkness */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] md:hidden"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 55%, transparent 100%)" }}
            />
            {/* Mobile scroll cue — absolutely anchored to hero bottom, scrolls to first content section */}
            <a
              href="#shows"
              aria-label="Scroll to content"
              className="absolute left-1/2 z-10 -translate-x-1/2 opacity-[0.36] transition-all duration-150 active:translate-y-0.5 active:opacity-90 hidden"
              style={{ bottom: "clamp(44px, 7vh, 68px)" }}
            >
              <div className="hero-scroll-cue flex flex-col items-center gap-[5px]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.20em] text-white">
                  Scroll to explore
                </span>
                <ChevronDown className="h-[11px] w-[11px] text-white" />
              </div>
            </a>
        </div>
      </section>

      {/* ── Sticky mobile scroll nav — outside padded wrapper so it spans the full viewport ── */}
      <MobileScrollNav />

      {/* ── Content sections ── */}
      <div className="mx-auto max-w-[1600px]" style={{ paddingInline: "clamp(24px, 3vw, 48px)" }}>
        <MobileTabManager>

        {/* ── Mobile Home Overview: removed — content available in main sections ── */}
        <MobileSection tab="home" className="hidden">
          <div className="space-y-3">

            {/* Compact Featured Release */}
            {featuredRelease && (
              <a
                href={resolveSafeHref(featuredRelease.platformUrl) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors duration-200 active:bg-white/[0.04]"
              >
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md shadow-black/30">
                  {hasFeaturedArtwork ? (
                    <Image
                      src={featuredRelease.artworkUrl}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music2 className="h-5 w-5 text-accent/50" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between py-0.5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent/60">
                      {featuredRelease.type}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-black tracking-[-0.01em] text-white">
                      {featuredRelease.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      {featuredRelease.label} · {featuredReleaseYear}
                    </p>
                  </div>
                  <span className="mt-2 inline-flex h-6 w-fit items-center rounded-full border border-accent/20 px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                    Listen ↗
                  </span>
                </div>
              </a>
            )}

            {/* Compact Next Upcoming Show */}
            {futureGigs[0] && (() => {
              const gig = futureGigs[0]
              const d = new Date(gig.date)
              const MONTHS_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
              const dayStr = String(d.getUTCDate())
              const monthStr = MONTHS_SHORT[d.getUTCMonth()]
              return (
                <div className="flex gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 min-w-[52px]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent/70">{monthStr}</span>
                    <span className="text-xl font-black tabular-nums leading-none text-foreground">{dayStr}</span>
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent/60">Next Show</p>
                    <p className="mt-0.5 truncate text-sm font-bold tracking-[-0.01em] text-white">{gig.eventName || gig.venue}</p>
                    {(gig.eventName || gig.clubVenue) && (
                      <p className="mt-0.5 truncate text-[11px] text-white/40">
                        {[gig.eventName ? gig.venue : null, gig.clubVenue, gig.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Compact Featured Set */}
            {featuredSet && (
              <a
                href={resolveSafeHref(featuredSet.platformUrl) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors duration-200 active:bg-white/[0.04]"
              >
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md shadow-black/30">
                  {featuredSet.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredSet.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-5 w-5 text-accent/50" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between py-0.5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent/60">Featured Set</p>
                    <p className="mt-0.5 truncate text-sm font-black tracking-[-0.01em] text-white">
                      {featuredSet.event?.trim() || featuredSet.venue?.trim() || cleanDjSetTitle(featuredSet.title, artist.artistName)}
                      {featuredSet.city?.trim() && <span className="opacity-55"> · {featuredSet.city.trim()}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-accent/55">
                      {buildPerformanceArtist(featuredSet.performanceType, featuredSet.performanceArtists, artist.artistName)}
                    </p>
                  </div>
                  <span className="mt-2 inline-flex h-6 w-fit items-center rounded-full border border-accent/20 px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                    Listen ↗
                  </span>
                </div>
              </a>
            )}

            {/* Latest 3 Moments */}
            {galleryImages.length > 0 && (
              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/25">Moments</p>
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.slice(0, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded-xl bg-secondary"
                    >
                      <Image
                        src={img.imageUrl}
                        alt={img.altText}
                        fill
                        sizes="33vw"
                        className="object-cover"
                        style={{ objectPosition: `${img.focalX ?? 50}% ${img.focalY ?? 50}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </MobileSection>

        {/* Atmospheric lamina — unifies Press Photos / Featured Release / Gigs visually */}
        <div className="relative mt-3 lg:mt-14 xl:mt-18">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-[radial-gradient(ellipse_85%_65%_at_14%_10%,rgba(255,255,255,0.016)_0%,transparent_62%)] sm:-inset-8"
          />
        {/* ── New 1-row × 2-col grid: Moments left, nested Release+Shows right ──
            The outer grid has ONE row. Moments (left) defines the section height.
            The right wrapper uses its own fr-based nested grid to divide that
            height proportionally between Featured Release (42%) and Shows (58%). */}
        <div className="relative flex flex-col gap-y-6 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.95fr)] lg:items-stretch lg:gap-x-10 xl:gap-x-14">

          {/* ── LEFT: Moments — the height anchor for this entire section ─────── */}
          <MobileSection tab="media" className="max-lg:hidden">
            <section className="flex h-full flex-col">
              <SectionHeader variant="primary">Moments</SectionHeader>
              <GallerySection images={galleryImages} />
            </section>
          </MobileSection>

          {/* ── RIGHT: flex-col stack; each card is its natural height ─ */}
          {/* Decoupled from Moments height so Shows expansion does not affect Releases. */}
          <div className="flex flex-col gap-y-6 lg:flex lg:flex-col lg:h-full lg:gap-y-3 xl:gap-y-4">

            {/* Featured Release — top 42% of right column height */}
            {featuredRelease && (
            <MobileSection tab="music" className="max-lg:hidden">
            <div className="flex flex-col">
              <SectionHeader>Featured Release</SectionHeader>
              <section className="mt-4 flex flex-col rounded-[1.75rem] border border-white/[0.06] bg-gradient-to-b from-card/50 to-background/40 p-5 shadow-lg shadow-black/20 sm:mt-5 sm:p-6 lg:mt-5 lg:px-6 lg:py-4 xl:px-8 xl:py-6">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,44%)_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[minmax(0,48%)_minmax(0,1fr)] lg:items-stretch lg:gap-6 xl:gap-8">
                <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-secondary shadow-lg shadow-black/35 sm:mx-0 sm:max-w-none sm:w-full lg:aspect-auto lg:self-stretch">
                  {!hasFeaturedArtwork ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                      <Music2 className="h-10 w-10 text-accent/80" />
                    </div>
                  ) : (
                    <Image
                      src={featuredRelease.artworkUrl}
                      alt={`${featuredRelease.title} artwork`}
                      fill
                      sizes="(min-width: 1280px) 280px, (min-width: 1024px) 200px, (min-width: 640px) 42vw, 200px"
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
                <div className="flex min-w-0 flex-col justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent/90 lg:text-[12px]">
                    {featuredRelease.type}
                  </p>
                  <h2 className="mt-1 text-balance text-xl font-black leading-[1.05] tracking-[-0.015em] text-foreground sm:mt-1.5 sm:text-2xl lg:text-[2rem] xl:text-[2.25rem]">
                    {featuredRelease.title}
                  </h2>
                  {featuredRelease.credits ? (
                    <p className="mt-1 text-xs text-muted-foreground/85 sm:mt-1.5">
                      {featuredRelease.credits}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:mt-2">
                    {featuredRelease.label} · {featuredReleaseYear}
                  </p>
                  <Button
                    asChild
                    className="mt-3 h-11 w-full rounded-full bg-accent px-6 text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:mt-3 sm:w-auto lg:mt-4 lg:h-12 lg:px-7 xl:h-12 xl:px-8"
                  >
                    <a href={resolveSafeHref(featuredRelease.platformUrl) ?? "#"} target="_blank" rel="noopener noreferrer">
                      Listen / Buy
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              </section>
            </div>
            </MobileSection>
            )}

            {/* Shows — bottom 58% of right column height */}
            {(futureGigs.length > 0 || pastGigs.length > 0) && (
              <MobileSection tab="live" id="shows" className="lg:flex-1 lg:flex lg:flex-col">
                <GigsSection futureGigs={futureGigs} pastGigs={pastGigs} className="lg:h-full" />
              </MobileSection>
            )}

          </div>

        </div>
        </div>

        {/* Releases → Music tab */}
        {/* Moments → mobile only, appears before Releases (desktop uses grid column) */}
        {galleryImages.length > 0 && (
          <section id="media" className="mt-10 scroll-mt-16 lg:hidden">
            <SectionHeader variant="primary">Moments</SectionHeader>
            <GallerySection images={galleryImages} />
          </section>
        )}

        {artist.releases.length > 0 && (
          <MobileSection tab="music" id="music">
          <section className="mt-10 lg:mt-14 xl:mt-20">
            <SectionHeader variant="primary">Releases</SectionHeader>
            <div className="mt-4">
              {/* Mobile: featured card + collapsible full catalog */}
              <div className="lg:hidden">
                <CollapsibleMobileReleases
                  featured={featuredRelease}
                  all={mobileReleasesForDisplay}
                />
              </div>
              {/* Desktop: featured release shown in the separate card above */}
              <div className="hidden lg:block">
                {selectedReleasesForDisplay.length > 0 && (
                  <SelectedReleasesCarousel releases={selectedReleasesForDisplay} />
                )}
              </div>
            </div>
          </section>
          </MobileSection>
        )}

        {/* Performance & Sets → Live tab */}
        {(featuredVideo ?? featuredSet) ? (
          <MobileSection tab="live" id="performance">
          <section className="mt-10 lg:mt-14 xl:mt-20">
            <SectionHeader>Performance & Sets</SectionHeader>
            {/* Two explicit columns so each stacks independently at its natural height.
                Performance column: Featured Performance → Recent Performances
                Set column:         Featured Set (vertical hero) → Recent Sets        */}
            <div
              className={cn(
                "mt-3 grid grid-cols-1 gap-6",
                featuredVideo && featuredSet ? "lg:grid-cols-2 lg:gap-x-6" : "",
              )}
            >

              {/* ── Performance column ── */}
              {featuredVideo ? (
                <div className="flex flex-col gap-4">

                  {/* Featured Performance */}
                  {(() => {
                    const { displayTitle } = getVideoDisplayInfo(featuredVideo, artist.artistName)
                    const metaParts = [
                      featuredVideo.venue?.trim() || null,
                      featuredVideo.videoCity?.trim() || null,
                      featuredVideo.videoDate ? (formatReleaseDate(featuredVideo.videoDate)?.replace(",", "") ?? null) : null,
                    ].filter(Boolean)
                    return (
                      <a
                        href={resolveSafeHref(featuredVideo.platformUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-[16px]"
                      >
                        <div className="relative aspect-[19/9] w-full bg-secondary">
                          {(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={(featuredVideo.customThumbnailUrl ?? featuredVideo.thumbnailUrl)!}
                              alt={`${featuredVideo.title} thumbnail`}
                              className="absolute inset-0 h-full w-full object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.22),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]" />
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/[0.88] via-black/[0.45] to-transparent px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
                            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-accent/85">
                              VIDEO PERFORMANCE
                            </p>
                            <h3 className="text-balance text-[20px] font-black uppercase leading-[0.88] tracking-[-0.02em] text-white sm:text-[24px] xl:text-[28px]">
                              {displayTitle}
                            </h3>
                            {metaParts.length > 0 ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/55">
                                {metaParts.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                              <Play className="h-6 w-6 fill-white text-white" />
                            </div>
                          </div>
                        </div>
                      </a>
                    )
                  })()}

                  {/* Recent Performances */}
                  {secondaryVideos.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/30">
                        More Video Performances
                      </p>
                      <div className="space-y-px">
                        {secondaryVideos.map((video) => {
                          const videoHref = resolveSafeHref(video.platformUrl)
                          if (!videoHref) return null
                          const { displayTitle } = getVideoDisplayInfo(video, artist.artistName)
                          const metaParts = [
                            video.venue?.trim() || null,
                            video.videoDate ? (formatReleaseDate(video.videoDate)?.replace(",", "") ?? null) : null,
                          ].filter(Boolean)
                          return (
                            <a
                              key={video.id}
                              href={videoHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors duration-150 hover:bg-white/[0.04]"
                            >
                              <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                                {(video.customThumbnailUrl ?? video.thumbnailUrl) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={(video.customThumbnailUrl ?? video.thumbnailUrl)!}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
                                    <Play className="h-3.5 w-3.5 text-accent/50" />
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-0 bg-black/[0.06]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold uppercase tracking-[-0.005em] text-white/70 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-white">
                                  {displayTitle}
                                </p>
                                {metaParts.length > 0 ? (
                                  <p className="mt-[2px] truncate text-[10px] uppercase tracking-[0.12em] text-white/28">
                                    {metaParts.join(" · ")}
                                  </p>
                                ) : null}
                              </div>
                              <span className="-m-2 shrink-0 p-2">
                                <ExternalLink className="h-3.5 w-3.5 text-foreground/20 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent/50" />
                              </span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                </div>
              ) : null}

              {/* ── Set column ── */}
              {featuredSet ? (
                <div className="flex flex-col gap-4">

                  {/* Featured Set */}
                  {(() => {
                    const setTitle = featuredSet.event?.trim() || featuredSet.venue?.trim() || cleanDjSetTitle(featuredSet.title, artist.artistName)
                    const venuePart = featuredSet.venue?.trim() || null
                    const cityPart = featuredSet.city?.trim() || null
                    const datePart = featuredSet.setDate ? (formatReleaseDate(featuredSet.setDate)?.replace(",", "") ?? null) : null
                    const metaParts = [venuePart, cityPart, datePart].filter(Boolean)
                    return (
                      <a
                        href={resolveSafeHref(featuredSet.platformUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-[16px]"
                      >
                        <div className="relative aspect-[19/9] w-full bg-secondary">
                          {featuredSet.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={featuredSet.imageUrl}
                              alt={`${featuredSet.title} artwork`}
                              className="absolute inset-0 h-full w-full object-cover brightness-[0.78] transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.22),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]" />
                          )}
                          {featuredSet.imageUrl && (
                            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.05] to-black/[0.48]" aria-hidden />
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/[0.88] via-black/[0.45] to-transparent px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
                            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-accent/85">
                              DJ SET
                            </p>
                            <h3 className="text-balance text-[20px] font-black uppercase leading-[0.88] tracking-[-0.02em] text-white sm:text-[24px] xl:text-[28px]">
                              {setTitle}
                            </h3>
                            {metaParts.length > 0 ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/55">
                                {metaParts.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                              <Play className="h-6 w-6 fill-white text-white" />
                            </div>
                          </div>
                        </div>
                      </a>
                    )
                  })()}

                  {/* Recent Sets */}
                  {recentSets.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/30">
                        More DJ Sets
                      </p>
                      <div className="space-y-px">
                        {recentSets.map((set) => {
                          const setHref = resolveSafeHref(set.platformUrl)
                          if (!setHref) return null
                          const showTitle = set.event?.trim() || set.venue?.trim() || cleanDjSetTitle(set.title, artist.artistName)
                          const showMeta = formatPerformanceMetadata(set.event, set.venue, formatReleaseDate(set.setDate ?? "")?.replace(",", "") ?? null)
                          return (
                            <a
                              key={set.id}
                              href={setHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-3 rounded-xl px-1 py-2 transition-colors duration-150 hover:bg-white/[0.04]"
                            >
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                                {set.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={set.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]">
                                    <Play className="h-3.5 w-3.5 text-accent/50" />
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-0 bg-black/[0.06]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold uppercase text-white/70 transition-all duration-150 group-hover:translate-x-[2px] group-hover:text-white">
                                  {showTitle}
                                </p>
                                {showMeta ? (
                                  <p className="mt-[2px] truncate text-[10px] uppercase tracking-[0.14em] text-white/28">
                                    {showMeta}
                                  </p>
                                ) : null}
                              </div>
                              <span className="-m-2 shrink-0 p-2">
                                <ExternalLink className="h-3.5 w-3.5 text-foreground/18 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-[2px] group-hover:text-accent/45" />
                              </span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                </div>
              ) : null}

            </div>
          </section>
          </MobileSection>
        ) : null}

        {/* Playlist → Community tab */}
        {artist.playlist && (
          <MobileSection tab="community">
          <section className="mt-10 lg:mt-14">
            <div className="mx-auto max-w-5xl">
              <SectionHeader>Selected Tracks</SectionHeader>
              <div className="mt-4">
                <SelectedTracksSection playlist={artist.playlist} />
              </div>
            </div>
          </section>
          </MobileSection>
        )}

        {/* ── Career Updates ────────────────────────────────────────────── */}
        {/* Data: artist.careerTimeline — published items ordered by sort_order asc (DB query). */}
        <CareerUpdatesSection
          items={artist.careerTimeline ?? []}
          headline="Career updates from Chile to international stages."
          intro="Selected public milestones from the artist’s residencies, releases, and international appearances."
        />

        <div id="contact" className="scroll-mt-16">
          <ProfileClosing
            artistName={artist.artistName}
            location={artist.location}
            bookingEmail={artist.bookingInfo.email}
            isPro={isPro}
            genres={artist.genres}
            socialLinks={prioritizedLinks}
            hasPressKit={hasPressKit}
            pressKitHref={safePressKitHref}
            artistHandle={artist.handle}
            heroLogoUrl={artist.heroLogoUrl}
            heroIdentityMode={artist.heroIdentityMode}
            footerLogoUrl={artist.footerLogoUrl}
            footerLogoMode={artist.footerLogoMode}
            footerLogoWidth={artist.footerLogoWidth}
            footerBookingEmail={artist.footerBookingEmail}
            footerContactEmail={artist.footerContactEmail}
            footerDemosEmail={artist.footerDemosEmail}
            footerNewsletterEnabled={artist.footerNewsletterEnabled}
            footerSocialsEnabled={artist.footerSocialsEnabled}
            footerCopyright={artist.footerCopyright}
          />
        </div>

        </MobileTabManager>
      </div>
    </main>
    </>
  )
}
