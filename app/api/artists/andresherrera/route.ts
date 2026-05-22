import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const mvpArtistId = "11111111-1111-4111-8111-111111111111"
const mvpArtistHandle = "andresherrera"

type SaveProfilePayload = {
  artistName: string
  handle: string
  genres: string[]
  location: string
  shortBio: string
  heroImageUrl: string
}

type SaveSocialLinkPayload = {
  platform: string
  label: string
  url: string
}

type SaveFeaturedReleasePayload = {
  title: string
  label: string
  releaseDate: string
  type: string
  platformUrl: string
  artworkUrl: string
} | null

type SaveGigPayload = {
  venue: string
  date: string
  city: string
  country: string
  ticketUrl?: string
}

type SaveArtistPayload = {
  profile: SaveProfilePayload
  socialLinks: SaveSocialLinkPayload[]
  featuredRelease: SaveFeaturedReleasePayload
  gigs: SaveGigPayload[]
}

type ArtistIdRow = {
  id: string
}

const validReleaseTypes = ["single", "ep", "album"] as const

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizeHandle(handle: string) {
  return handle.trim().toLowerCase()
}

function normalizeReleaseType(type: string) {
  const normalizedType = type.trim().toLowerCase()
  return validReleaseTypes.includes(normalizedType as (typeof validReleaseTypes)[number]) ? normalizedType : "single"
}

function validatePayload(payload: SaveArtistPayload) {
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

  return null
}

async function getMvpArtistId() {
  const supabase = createSupabaseAdminClient()
  const { data: seededArtist, error: seededArtistError } = await supabase
    .from("artists")
    .select("id")
    .eq("id", mvpArtistId)
    .maybeSingle<ArtistIdRow>()

  if (seededArtistError) {
    throw seededArtistError
  }

  if (seededArtist) {
    return seededArtist.id
  }

  const { data: handleArtist, error: handleArtistError } = await supabase
    .from("artists")
    .select("id")
    .eq("handle", mvpArtistHandle)
    .maybeSingle<ArtistIdRow>()

  if (handleArtistError) {
    throw handleArtistError
  }

  if (!handleArtist) {
    throw new Error("MVP artist not found.")
  }

  return handleArtist.id
}

export async function PATCH(request: Request) {
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
    const artistId = await getMvpArtistId()
    const normalizedHandle = normalizeHandle(payload.profile.handle)

    const { error: artistError } = await supabase
      .from("artists")
      .update({
        artist_name: payload.profile.artistName.trim(),
        handle: normalizedHandle,
        genres: payload.profile.genres.map((genre) => genre.trim()).filter(Boolean),
        location: payload.profile.location.trim(),
        short_bio: payload.profile.shortBio.trim(),
        hero_image_url: payload.profile.heroImageUrl.trim(),
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

    const { error: deleteFeaturedReleaseError } = await supabase
      .from("releases")
      .delete()
      .eq("artist_id", artistId)
      .eq("is_featured", true)

    if (deleteFeaturedReleaseError) {
      throw deleteFeaturedReleaseError
    }

    if (payload.featuredRelease) {
      const { error: insertFeaturedReleaseError } = await supabase.from("releases").insert({
        artist_id: artistId,
        title: payload.featuredRelease.title.trim(),
        label: payload.featuredRelease.label.trim(),
        release_date: payload.featuredRelease.releaseDate,
        artwork_url: payload.featuredRelease.artworkUrl.trim(),
        platform_url: payload.featuredRelease.platformUrl.trim(),
        type: normalizeReleaseType(payload.featuredRelease.type),
        is_featured: true,
        sort_order: 1,
      })

      if (insertFeaturedReleaseError) {
        throw insertFeaturedReleaseError
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
          ticket_url: gig.ticketUrl?.trim() || null,
        })),
      )

      if (insertGigsError) {
        throw insertGigsError
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save artist changes."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
