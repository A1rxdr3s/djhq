import { redirect } from "next/navigation"
import DashboardClient from "./dashboard-client"
import OnboardingForm from "./onboarding-form"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Artist, CustomDomainStatus, PerformanceType, ReleaseType, SocialPlatform, SubscriptionPlan, Video } from "@/types/djhq"

const mvpArtistHandle = "andresherrera"

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
  press_kit_root_url: string | null
  press_kit_bio_folder_url: string | null
  press_kit_logos_folder_url: string | null
  press_kit_media_folder_url: string | null
  press_kit_rider_folder_url: string | null
  press_kit_pdf_en_url: string | null
  press_kit_pdf_es_url: string | null
  press_kit_pdf_en_size: string | null
  press_kit_pdf_es_size: string | null
  press_kit_use_gallery_photos: boolean
  plan: string
  show_header_branding: boolean
  browser_title: string | null
  favicon_url: string | null
  hero_logo_url: string | null
  hero_identity_mode: string
  hero_text_style: string
  hero_logo_scale: number
  hero_logo_layout: string
  hero_logo_alignment: string
  hero_logo_offset_x: number
  hero_logo_offset_y: number
  hero_logo_style: string
  hero_logo_readability: string
  hero_content_surface: string
  hero_logo_placement: string
  hero_content_width: string
  artist_accent_theme: string
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
  beatport_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  youtube_music_url: string | null
  bandcamp_url: string | null
  traxsource_url: string | null
  other_url: string | null
  release_type: string | null
  version_type: string | null
  remixer: string | null
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
  fee_amount: string | null
  fee_currency: string | null
  payment_status: string | null
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
  focal_x: number
  focal_y: number
}

type DjSetRow = {
  id: string
  title: string
  performance_type: string
  performance_artists: string[]
  custom_performance_type: string | null
  title_override: string | null
  venue: string | null
  event: string | null
  set_date: string | null
  city: string | null
  image_url: string | null
  platform_url: string
  sort_order: number
  is_published: boolean
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
  is_published: boolean
}

type CustomDomainRow = {
  id: string
  domain: string
  status: string
  verification_token: string | null
  error_message: string | null
  verified_at: string | null
  added_to_vercel_at: string | null
  removed_at: string | null
  created_at: string
  verification_attempts: number
  last_verification_attempt_at: string | null
  dns_target: string | null
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

const customDomainStatuses = new Set<string>([
  "pending",
  "verifying",
  "verified",
  "active",
  "error",
  "suspended",
  "removed",
])

function normalizeCustomDomainStatus(status: string): CustomDomainStatus {
  return customDomainStatuses.has(status) ? (status as CustomDomainStatus) : "pending"
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

async function getOwnedArtist(supabase: SupabaseAdminClient, userId: string) {
  // TODO: Add multi-artist switching when DJHQ supports multiple artists per user.
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ArtistRow>()

  if (error) {
    throw error
  }

  return data
}

async function getClaimableSeededArtist(supabase: SupabaseAdminClient) {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("handle", mvpArtistHandle)
    .is("owner_user_id", null)
    .maybeSingle<ArtistRow>()

  if (error) {
    throw error
  }

  return data
}

async function claimSeededArtist(supabase: SupabaseAdminClient, artistId: string, userId: string) {
  const { data, error } = await supabase
    .from("artists")
    .update({ owner_user_id: userId })
    .eq("id", artistId)
    .is("owner_user_id", null)
    .select("*")
    .maybeSingle<ArtistRow>()

  if (error) {
    throw error
  }

  return data
}

async function mapArtistWithRelatedData(supabase: SupabaseAdminClient, artistRow: ArtistRow): Promise<Artist> {
  const [socialLinksResult, releasesResult, gigsResult, galleryImagesResult, djSetsResult, videosResult, customDomainsResult] = await Promise.all([
    supabase
      .from("social_links")
      .select("platform, label, url")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<SocialLinkRow[]>(),
    supabase
      .from("releases")
      .select("id, title, label, credits, release_date, artwork_url, platform_url, type, is_featured, spotify_url, beatport_url, apple_music_url, soundcloud_url, youtube_music_url, bandcamp_url, traxsource_url, other_url, release_type, version_type, remixer")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .order("release_date", { ascending: false })
      .returns<ReleaseRow[]>(),
    supabase
      .from("gigs")
      .select("id, date, venue, city, country, club_venue, event_status, ticket_url, flyer_url, instagram_url, fee_amount, fee_currency, payment_status")
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
      .select("id, title, performance_type, performance_artists, custom_performance_type, title_override, venue, event, set_date, city, image_url, platform_url, sort_order, is_published")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<DjSetRow[]>(),
    supabase
      .from("videos")
      .select("id, title, venue, video_date, thumbnail_url, custom_thumbnail_url, platform_url, sort_order, is_published")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<VideoRow[]>(),
    supabase
      .from("custom_domains")
      .select("id, domain, status, verification_token, error_message, verified_at, added_to_vercel_at, removed_at, created_at, verification_attempts, last_verification_attempt_at, dns_target")
      .eq("artist_id", artistRow.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .returns<CustomDomainRow[]>(),
  ])

  if (socialLinksResult.error || releasesResult.error || gigsResult.error || galleryImagesResult.error || djSetsResult.error || videosResult.error || customDomainsResult.error) {
    throw socialLinksResult.error ?? releasesResult.error ?? gigsResult.error ?? galleryImagesResult.error ?? djSetsResult.error ?? videosResult.error ?? customDomainsResult.error
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
    releases: releaseRows.map((release) => ({
      id: release.id,
      title: release.title,
      label: release.label,
      credits: release.credits ?? undefined,
      releaseDate: release.release_date,
      artworkUrl: release.artwork_url,
      platformUrl: release.platform_url,
      type: normalizeReleaseType(release.type),
      isFeatured: release.is_featured,
      spotifyUrl: release.spotify_url ?? undefined,
      beatportUrl: release.beatport_url ?? undefined,
      appleMusicUrl: release.apple_music_url ?? undefined,
      soundcloudUrl: release.soundcloud_url ?? undefined,
      youtubeMusicUrl: release.youtube_music_url ?? undefined,
      bandcampUrl: release.bandcamp_url ?? undefined,
      traxsourceUrl: release.traxsource_url ?? undefined,
      otherUrl: release.other_url ?? undefined,
      releaseType: release.release_type ?? undefined,
      versionType: release.version_type ?? undefined,
      remixer: release.remixer ?? undefined,
    })),
    upcomingGigs: (gigsResult.data ?? []).map((gig) => ({
      id: gig.id,
      date: gig.date,
      venue: gig.venue,
      city: gig.city,
      country: gig.country,
      clubVenue: gig.club_venue ?? undefined,
      eventStatus: (gig.event_status ?? undefined) as "upcoming" | "sold_out" | "cancelled" | undefined,
      ticketUrl: gig.ticket_url ?? undefined,
      flyerUrl: gig.flyer_url ?? undefined,
      instagramUrl: gig.instagram_url ?? undefined,
      feeAmount: gig.fee_amount != null ? parseFloat(gig.fee_amount) : null,
      feeCurrency: gig.fee_currency ?? null,
      paymentStatus: (gig.payment_status ?? null) as "pending" | "partial" | "paid" | "cancelled" | null,
    })),
    djSets: (djSetsResult.data ?? []).map((set) => ({
      id: set.id,
      title: set.title,
      performanceType: (set.performance_type || "dj_set") as PerformanceType,
      performanceArtists: set.performance_artists ?? [],
      customPerformanceType: set.custom_performance_type ?? undefined,
      titleOverride: set.title_override ?? undefined,
      venue: set.venue ?? undefined,
      event: set.event ?? undefined,
      setDate: set.set_date ?? undefined,
      imageUrl: set.image_url ?? undefined,
      platformUrl: set.platform_url,
      sortOrder: set.sort_order,
      isPublished: set.is_published,
    })),
    videos: (videosResult.data ?? []).map((video): Video => ({
      id: video.id,
      title: video.title,
      venue: video.venue ?? undefined,
      videoDate: video.video_date ?? undefined,
      thumbnailUrl: video.thumbnail_url ?? undefined,
      customThumbnailUrl: video.custom_thumbnail_url ?? null,
      platformUrl: video.platform_url,
      sortOrder: video.sort_order,
      isPublished: video.is_published,
    })),
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
      rootUrl: artistRow.press_kit_root_url ?? undefined,
      bioFolderUrl: artistRow.press_kit_bio_folder_url ?? undefined,
      logosFolderUrl: artistRow.press_kit_logos_folder_url ?? undefined,
      mediaFolderUrl: artistRow.press_kit_media_folder_url ?? undefined,
      riderFolderUrl: artistRow.press_kit_rider_folder_url ?? undefined,
      pdfEnUrl: artistRow.press_kit_pdf_en_url ?? undefined,
      pdfEsUrl: artistRow.press_kit_pdf_es_url ?? undefined,
      pdfEnSize: artistRow.press_kit_pdf_en_size ?? undefined,
      pdfEsSize: artistRow.press_kit_pdf_es_size ?? undefined,
      useGalleryPhotos: artistRow.press_kit_use_gallery_photos ?? true,
    },
    plan: normalizePlan(artistRow.plan),
    customDomains: (customDomainsResult.data ?? []).map((d) => ({
      id: d.id,
      domain: d.domain,
      status: normalizeCustomDomainStatus(d.status),
      errorMessage: d.error_message ?? undefined,
      verifiedAt: d.verified_at ?? undefined,
      addedToVercelAt: d.added_to_vercel_at ?? undefined,
      removedAt: d.removed_at ?? undefined,
      createdAt: d.created_at,
      verificationAttempts: d.verification_attempts,
      lastVerificationAttemptAt: d.last_verification_attempt_at ?? undefined,
      verificationRecord: d.verification_token
        ? {
            type: "TXT" as const,
            name: `_djhq.${d.domain}`,
            value: `djhq-verify=${d.verification_token}`,
          }
        : undefined,
      routingRecord: {
        type: "CNAME" as const,
        name: "@",
        value: d.dns_target ?? "cname.vercel-dns.com",
      },
    })),
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
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const adminClient = createSupabaseAdminClient()
  const ownedArtist = await getOwnedArtist(adminClient, user.id)

  if (ownedArtist) {
    return <DashboardClient initialArtist={await mapArtistWithRelatedData(adminClient, ownedArtist)} />
  }

  const claimableArtist = await getClaimableSeededArtist(adminClient)

  if (!claimableArtist) {
    return <OnboardingForm defaultBookingEmail={user.email ?? "booking@example.com"} />
  }

  const claimedArtist = await claimSeededArtist(adminClient, claimableArtist.id, user.id)

  if (!claimedArtist?.owner_user_id || claimedArtist.owner_user_id !== user.id) {
    return <OnboardingForm defaultBookingEmail={user.email ?? "booking@example.com"} />
  }

  return (
    <DashboardClient
      initialArtist={await mapArtistWithRelatedData(adminClient, claimedArtist)}
      statusMessage="Artist profile assigned to your account."
    />
  )
}
