import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { computeDjSetTitle, type PerformanceType } from "@/lib/dj-set-title"

type SaveProfilePayload = {
  artistName: string
  handle: string
  genres: string[]
  location: string
  shortBio: string
  heroImageUrl: string
  heroTagline: string
  showHeaderBranding: boolean
  browserTitle: string
  faviconUrl: string
  heroLogoUrl: string
  heroIdentityMode: string
  heroTextStyle: string
  heroLogoScale: number
  heroLogoLayout: string
  heroLogoAlignment: string
  heroLogoOffsetX: number
  heroLogoOffsetY: number
  heroLogoStyle: string
  heroLogoReadability: string
  heroContentSurface: string
  heroLogoPlacement: string
  heroContentWidth: string
  accentTheme: string
}

type SaveSocialLinkPayload = {
  platform: string
  label: string
  url: string
}

type SaveReleasePayload = {
  isFeatured: boolean
  title: string
  label: string
  credits?: string
  releaseDate: string
  type: string
  platformUrl: string
  artworkUrl: string
  spotifyUrl?: string
  beatportUrl?: string
  appleMusicUrl?: string
  soundcloudUrl?: string
  youtubeMusicUrl?: string
  bandcampUrl?: string
  traxsourceUrl?: string
  otherUrl?: string
  releaseType?: string
  versionType?: string
  remixer?: string
}

type SaveGigPayload = {
  venue: string
  date: string
  city: string
  country: string
  clubVenue?: string
  eventStatus?: "upcoming" | "sold_out" | "cancelled" | null
  ticketUrl?: string
  flyerUrl?: string
  instagramUrl?: string
  feeAmount?: number | null
  feeCurrency?: string | null
  paymentStatus?: "pending" | "partial" | "paid" | "cancelled" | null
}

type SaveDjSetPayload = {
  performanceType: PerformanceType
  performanceArtists: string[]
  customPerformanceType?: string
  titleOverride?: string
  venue?: string
  event?: string
  setDate?: string
  imageUrl?: string
  platformUrl: string
  isPublished: boolean
}

type SaveVideoPayload = {
  title: string
  venue?: string
  videoDate?: string
  thumbnailUrl?: string
  customThumbnailUrl?: string | null
  platformUrl: string
  isPublished: boolean
}

type SaveBookingPayload = {
  email: string
  bookingUrl?: string | null
  pressKitEnabled: boolean
  pressKitUrl?: string | null
  pressKitAssets: string[]
}

type SaveArtistPayload = {
  artistId: string
  isPublished: boolean
  profile: SaveProfilePayload
  socialLinks: SaveSocialLinkPayload[]
  releases: SaveReleasePayload[]
  gigs: SaveGigPayload[]
  djSets: SaveDjSetPayload[]
  videos: SaveVideoPayload[]
  booking: SaveBookingPayload
}

type CreateArtistPayload = {
  artistName?: string
  handle?: string
  genres?: string[]
  location?: string
  shortBio?: string
  bookingEmail?: string
}

type ArtistIdRow = {
  id: string
  owner_user_id: string | null
  artist_name: string
}

type ArtistHandleRow = {
  id: string
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

const validReleaseTypes = ["single", "ep", "album"] as const

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizeHandle(handle: string) {
  return handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeReleaseType(type: string) {
  const normalizedType = type.trim().toLowerCase()
  return validReleaseTypes.includes(normalizedType as (typeof validReleaseTypes)[number]) ? normalizedType : "single"
}

function validatePayload(payload: SaveArtistPayload) {
  if (!payload.artistId?.trim()) {
    return "Artist id is required."
  }

  if (typeof payload.isPublished !== "boolean") {
    return "Publish state is required."
  }

  if (!payload.profile.handle.trim()) {
    return "Handle is required."
  }

  if (!payload.profile.artistName.trim()) {
    return "Artist name is required."
  }

  const invalidLink = payload.socialLinks.find(
    (link) => !link.platform.trim() || !link.label.trim() || !link.url.trim(),
  )

  if (invalidLink) {
    return "Each social link must include platform, label, and url."
  }

  const invalidGig = payload.gigs.find(
    (gig) => !gig.venue.trim() || !gig.date.trim() || !gig.city.trim() || !gig.country.trim(),
  )

  if (invalidGig) {
    return "Each gig must include venue, date, city, and country."
  }

  const invalidDjSet = payload.djSets.find((set) => !set.platformUrl.trim())

  if (invalidDjSet) {
    return "Each DJ set must include a platform URL."
  }

  const invalidVideo = payload.videos.find((video) => !video.title.trim() || !video.platformUrl.trim())

  if (invalidVideo) {
    return "Each video must include a title and platform URL."
  }

  const invalidSelectedRelease = payload.selectedReleases.find(
    (release) =>
      !release.title.trim() ||
      !release.label.trim() ||
      !release.releaseDate.trim() ||
      !release.type.trim() ||
      !release.platformUrl.trim() ||
      !release.artworkUrl.trim(),
  )

  if (invalidSelectedRelease) {
    return "Each selected release must include title, label, date, type, platform URL, and artwork URL."
  }

  return null
}

function validateCreatePayload(payload: CreateArtistPayload, normalizedHandle: string) {
  if (!payload.artistName?.trim()) {
    return "Artist name is required."
  }

  if (!normalizedHandle) {
    return "Handle is required."
  }

  if (normalizedHandle.length < 3 || normalizedHandle.length > 50) {
    return "Handle must be between 3 and 50 characters."
  }

  if (!Array.isArray(payload.genres) || !payload.genres.map((genre) => genre.trim()).filter(Boolean).length) {
    return "At least one genre is required."
  }

  if (!payload.location?.trim()) {
    return "Location is required."
  }

  if (!payload.shortBio?.trim()) {
    return "Short bio is required."
  }

  return null
}

async function getArtistForWrite(supabase: SupabaseAdminClient, artistId: string) {
  const { data, error } = await supabase
    .from("artists")
    .select("id, owner_user_id, artist_name")
    .eq("id", artistId)
    .maybeSingle<ArtistIdRow>()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("Artist not found.")
  }

  return data
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: CreateArtistPayload

  try {
    payload = (await request.json()) as CreateArtistPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  const normalizedHandle = normalizeHandle(payload.handle ?? "")
  const validationError = validateCreatePayload(payload, normalizedHandle)

  if (validationError) {
    return badRequest(validationError)
  }

  try {
    const supabase = createSupabaseAdminClient()
    const artistName = payload.artistName?.trim() ?? ""
    const genres = (payload.genres ?? []).map((genre) => genre.trim()).filter(Boolean)
    const location = payload.location?.trim() ?? ""
    const shortBio = payload.shortBio?.trim() ?? ""
    const { data: existingArtist, error: existingArtistError } = await supabase
      .from("artists")
      .select("id")
      .eq("handle", normalizedHandle)
      .maybeSingle<ArtistHandleRow>()

    if (existingArtistError) {
      throw existingArtistError
    }

    if (existingArtist) {
      return NextResponse.json({ error: "This handle is already taken." }, { status: 409 })
    }

    const bookingEmail = payload.bookingEmail?.trim() || user.email || "booking@example.com"
    const { data: createdArtist, error: createArtistError } = await supabase
      .from("artists")
      .insert({
        tenant_id: null,
        owner_user_id: user.id,
        handle: normalizedHandle,
        artist_name: artistName,
        genres,
        location,
        short_bio: shortBio,
        hero_image_url: "/images/dj-hero.jpg",
        avatar_url: "/placeholder-user.jpg",
        booking_email: bookingEmail,
        booking_url: null,
        press_kit_enabled: false,
        press_kit_download_url: null,
        press_kit_assets: [],
        plan: "free",
        is_published: false,
      })
      .select("*")
      .single()

    if (createArtistError) {
      if (createArtistError.code === "23505") {
        return NextResponse.json({ error: "This handle is already taken." }, { status: 409 })
      }

      throw createArtistError
    }

    return NextResponse.json({ artist: createdArtist }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create artist profile."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: SaveArtistPayload

  try {
    payload = (await request.json()) as SaveArtistPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  const validationError = validatePayload(payload)

  if (validationError) {
    return badRequest(validationError)
  }

  try {
    const supabase = createSupabaseAdminClient()
    const writableArtist = await getArtistForWrite(supabase, payload.artistId)
    const artistId = writableArtist.id
    const artistName = writableArtist.artist_name || ""
    const normalizedHandle = normalizeHandle(payload.profile.handle)

    if (writableArtist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have permission to edit this artist." }, { status: 403 })
    }

    const { error: artistError } = await supabase
      .from("artists")
      .update({
        artist_name: payload.profile.artistName.trim(),
        handle: normalizedHandle,
        genres: payload.profile.genres.map((genre) => genre.trim()).filter(Boolean),
        location: payload.profile.location.trim(),
        short_bio: payload.profile.shortBio.trim(),
        hero_image_url: payload.profile.heroImageUrl.trim(),
        hero_tagline: payload.profile.heroTagline.trim() || null,
        show_header_branding: payload.profile.showHeaderBranding,
        browser_title: payload.profile.browserTitle.trim() || null,
        favicon_url: payload.profile.faviconUrl.trim() || null,
        hero_logo_url: payload.profile.heroLogoUrl.trim() || null,
        hero_identity_mode: payload.profile.heroIdentityMode || "text",
        hero_text_style: payload.profile.heroTextStyle || "default",
        hero_logo_scale: Math.max(40, Math.min(240, payload.profile.heroLogoScale ?? 100)),
        hero_logo_layout: payload.profile.heroLogoLayout || "replace_text",
        hero_logo_alignment: ["left", "center", "right"].includes(payload.profile.heroLogoAlignment) ? payload.profile.heroLogoAlignment : "left",
        hero_logo_offset_x: Math.max(-100, Math.min(100, payload.profile.heroLogoOffsetX ?? 0)),
        hero_logo_offset_y: Math.max(-100, Math.min(100, payload.profile.heroLogoOffsetY ?? 0)),
        hero_logo_style: ["solid", "soft", "cinematic"].includes(payload.profile.heroLogoStyle) ? payload.profile.heroLogoStyle : "solid",
        hero_logo_readability: ["none", "subtle", "strong"].includes(payload.profile.heroLogoReadability) ? payload.profile.heroLogoReadability : "subtle",
        hero_content_surface: ["none", "soft", "strong"].includes(payload.profile.heroContentSurface) ? payload.profile.heroContentSurface : "soft",
        hero_logo_placement: ["editorial", "top_center", "center", "custom"].includes(payload.profile.heroLogoPlacement) ? payload.profile.heroLogoPlacement : "editorial",
        hero_content_width: ["compact", "standard", "wide"].includes(payload.profile.heroContentWidth) ? payload.profile.heroContentWidth : "standard",
        artist_accent_theme: ["matrix", "electric_blue", "signal_red"].includes(payload.profile.accentTheme) ? payload.profile.accentTheme : "matrix",
        is_published: payload.isPublished,
        booking_email: payload.booking.email.trim(),
        booking_url: payload.booking.bookingUrl?.trim() || null,
        press_kit_enabled: payload.booking.pressKitEnabled,
        press_kit_download_url: payload.booking.pressKitUrl?.trim() || null,
        press_kit_assets: payload.booking.pressKitAssets,
      })
      .eq("id", artistId)

    if (artistError) {
      throw artistError
    }

    const { error: deleteSocialLinksError } = await supabase.from("social_links").delete().eq("artist_id", artistId)

    if (deleteSocialLinksError) {
      throw deleteSocialLinksError
    }

    if (payload.socialLinks.length > 0) {
      const { error: insertSocialLinksError } = await supabase.from("social_links").insert(
        payload.socialLinks.map((link, index) => ({
          artist_id: artistId,
          platform: link.platform.trim().toLowerCase(),
          label: link.label.trim(),
          url: link.url.trim(),
          sort_order: index + 1,
        })),
      )

      if (insertSocialLinksError) {
        throw insertSocialLinksError
      }
    }

    const { error: deleteReleasesError } = await supabase
      .from("releases")
      .delete()
      .eq("artist_id", artistId)

    if (deleteReleasesError) {
      throw deleteReleasesError
    }

    if (payload.releases.length > 0) {
      const { error: insertReleasesError } = await supabase.from("releases").insert(
        payload.releases.map((release, index) => ({
          artist_id: artistId,
          title: release.title.trim(),
          label: release.label.trim(),
          credits: release.credits?.trim() || null,
          release_date: release.releaseDate,
          artwork_url: release.artworkUrl.trim(),
          platform_url: release.platformUrl.trim(),
          type: normalizeReleaseType(release.type),
          is_featured: release.isFeatured,
          sort_order: index + 1,
          spotify_url: release.spotifyUrl?.trim() || null,
          beatport_url: release.beatportUrl?.trim() || null,
          apple_music_url: release.appleMusicUrl?.trim() || null,
          soundcloud_url: release.soundcloudUrl?.trim() || null,
          youtube_music_url: release.youtubeMusicUrl?.trim() || null,
          bandcamp_url: release.bandcampUrl?.trim() || null,
          traxsource_url: release.traxsourceUrl?.trim() || null,
          other_url: release.otherUrl?.trim() || null,
          release_type: release.releaseType?.trim() || null,
          version_type: release.versionType?.trim() || null,
          remixer: release.remixer?.trim() || null,
        })),
      )

      if (insertReleasesError) {
        throw insertReleasesError
      }
    }

    const { error: deleteGigsError } = await supabase.from("gigs").delete().eq("artist_id", artistId)

    if (deleteGigsError) {
      throw deleteGigsError
    }

    if (payload.gigs.length > 0) {
      const { error: insertGigsError } = await supabase.from("gigs").insert(
        payload.gigs.map((gig) => ({
          artist_id: artistId,
          date: gig.date,
          venue: gig.venue.trim(),
          city: gig.city.trim(),
          country: gig.country.trim(),
          club_venue: gig.clubVenue?.trim() || null,
          event_status: gig.eventStatus ?? null,
          ticket_url: gig.ticketUrl?.trim() || null,
          flyer_url: gig.flyerUrl?.trim() || null,
          instagram_url: gig.instagramUrl?.trim() || null,
          fee_amount: gig.feeAmount ?? null,
          fee_currency: gig.feeCurrency?.trim() || null,
          payment_status: gig.paymentStatus ?? null,
        })),
      )

      if (insertGigsError) {
        throw insertGigsError
      }
    }

    const { error: deleteDjSetsError } = await supabase.from("dj_sets").delete().eq("artist_id", artistId)

    if (deleteDjSetsError) {
      throw deleteDjSetsError
    }

    if (payload.djSets.length > 0) {
      const { error: insertDjSetsError } = await supabase.from("dj_sets").insert(
        payload.djSets.map((set, index) => {
          const generatedTitle = computeDjSetTitle(
            set.performanceType,
            set.performanceArtists,
            set.customPerformanceType,
            set.event,
            set.venue,
            artistName,
          )
          const displayTitle = set.titleOverride?.trim() || generatedTitle
          return {
            artist_id: artistId,
            title: displayTitle,
            performance_type: set.performanceType,
            performance_artists: set.performanceArtists,
            custom_performance_type: set.customPerformanceType?.trim() || null,
            title_override: set.titleOverride?.trim() || null,
            venue: set.venue?.trim() || null,
            event: set.event?.trim() || null,
            set_date: set.setDate || null,
            image_url: set.imageUrl?.trim() || null,
            platform_url: set.platformUrl.trim(),
            sort_order: index + 1,
            is_published: set.isPublished,
          }
        }),
      )

      if (insertDjSetsError) {
        throw insertDjSetsError
      }
    }

    const { error: deleteVideosError } = await supabase.from("videos").delete().eq("artist_id", artistId)

    if (deleteVideosError) {
      throw deleteVideosError
    }

    if (payload.videos.length > 0) {
      const { error: insertVideosError } = await supabase.from("videos").insert(
        payload.videos.map((video, index) => ({
          artist_id: artistId,
          title: video.title.trim(),
          venue: video.venue?.trim() || null,
          video_date: video.videoDate || null,
          thumbnail_url: video.thumbnailUrl?.trim() || null,
          custom_thumbnail_url: video.customThumbnailUrl ?? null,
          platform_url: video.platformUrl.trim(),
          sort_order: index + 1,
          is_published: video.isPublished,
        })),
      )

      if (insertVideosError) {
        throw insertVideosError
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save artist changes."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
