import { redirect } from "next/navigation"
import DashboardClient from "./dashboard-client"
import OnboardingForm from "./onboarding-form"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Artist, ReleaseType, SocialPlatform, SubscriptionPlan, Video } from "@/types/djhq"

const mvpArtistHandle = "andresherrera"

type ArtistRow = {
  id: string
  tenant_id: string | null
  owner_user_id: string | null
  handle: string
  artist_name: string
  real_name: string | null
  tagline: string | null
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
}

type GigRow = {
  id: string
  date: string
  venue: string
  city: string
  country: string
  ticket_url: string | null
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
}

type DjSetRow = {
  id: string
  title: string
  venue: string | null
  set_date: string | null
  image_url: string | null
  platform_url: string
  sort_order: number
  is_published: boolean
}

type VideoRow = {
  id: string
  title: string
  venue: string | null
  video_date: string | null
  thumbnail_url: string | null
  platform_url: string
  sort_order: number
  is_published: boolean
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

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
  const [socialLinksResult, releasesResult, gigsResult, galleryImagesResult, djSetsResult, videosResult] = await Promise.all([
    supabase
      .from("social_links")
      .select("platform, label, url")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<SocialLinkRow[]>(),
    supabase
      .from("releases")
      .select("id, title, label, credits, release_date, artwork_url, platform_url, type, is_featured")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .order("release_date", { ascending: false })
      .returns<ReleaseRow[]>(),
    supabase
      .from("gigs")
      .select("id, date, venue, city, country, ticket_url")
      .eq("artist_id", artistRow.id)
      .order("date", { ascending: true })
      .returns<GigRow[]>(),
    supabase
      .from("gallery_images")
      .select("id, image_url, alt_text, sort_order")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<GalleryImageRow[]>(),
    supabase
      .from("dj_sets")
      .select("id, title, venue, set_date, image_url, platform_url, sort_order, is_published")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<DjSetRow[]>(),
    supabase
      .from("videos")
      .select("id, title, venue, video_date, thumbnail_url, platform_url, sort_order, is_published")
      .eq("artist_id", artistRow.id)
      .order("sort_order", { ascending: true })
      .returns<VideoRow[]>(),
  ])

  if (socialLinksResult.error || releasesResult.error || gigsResult.error || galleryImagesResult.error || djSetsResult.error || videosResult.error) {
    throw socialLinksResult.error ?? releasesResult.error ?? gigsResult.error ?? galleryImagesResult.error ?? djSetsResult.error ?? videosResult.error
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
    featuredRelease: featuredReleaseRow
      ? {
          id: featuredReleaseRow.id,
          title: featuredReleaseRow.title,
          label: featuredReleaseRow.label,
          credits: featuredReleaseRow.credits ?? undefined,
          releaseDate: featuredReleaseRow.release_date,
          artworkUrl: featuredReleaseRow.artwork_url,
          platformUrl: featuredReleaseRow.platform_url,
          type: normalizeReleaseType(featuredReleaseRow.type),
        }
      : undefined,
    selectedReleases: selectedReleaseRows.map((release) => ({
      id: release.id,
      title: release.title,
      label: release.label,
      credits: release.credits ?? undefined,
      releaseDate: release.release_date,
      artworkUrl: release.artwork_url,
      platformUrl: release.platform_url,
      type: normalizeReleaseType(release.type),
    })),
    upcomingGigs: (gigsResult.data ?? []).map((gig) => ({
      id: gig.id,
      date: gig.date,
      venue: gig.venue,
      city: gig.city,
      country: gig.country,
      ticketUrl: gig.ticket_url ?? undefined,
    })),
    djSets: (djSetsResult.data ?? []).map((set) => ({
      id: set.id,
      title: set.title,
      venue: set.venue ?? undefined,
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
      platformUrl: video.platform_url,
      sortOrder: video.sort_order,
      isPublished: video.is_published,
    })),
    galleryImages: (galleryImagesResult.data ?? []).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text,
      sortOrder: image.sort_order,
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
