import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnerRow = { id: string; owner_user_id: string | null }
type StayRow = {
  id: string; tour_id: string; artist_id: string
  city: string; country: string | null; venue_or_area: string | null
  starts_on: string; ends_on: string; color: string
  sort_order: number | null; notes: string | null; created_at: string
}

function mapStay(s: StayRow) {
  return {
    id: s.id,
    tourId: s.tour_id,
    artistId: s.artist_id,
    city: s.city,
    country: s.country,
    venueOrArea: s.venue_or_area,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    color: s.color,
    sortOrder: s.sort_order,
    notes: s.notes,
    createdAt: s.created_at,
  }
}

async function getAuthedUser() {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user
}

async function getArtistRow(artistId: string): Promise<ArtistOwnerRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<ArtistOwnerRow>()
  return data
}

function unauthorized(msg: string, status = 401) {
  return NextResponse.json({ error: msg }, { status })
}

// GET /api/artists/tours/stays?tourId=...&artistId=...
export async function GET(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get("tourId")?.trim()
  const artistId = searchParams.get("artistId")?.trim()
  if (!tourId || !artistId) return NextResponse.json({ error: "tourId and artistId are required." }, { status: 400 })

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: stays, error } = await supabase
    .from("artist_tour_stays")
    .select("id, tour_id, artist_id, city, country, venue_or_area, starts_on, ends_on, color, sort_order, notes, created_at")
    .eq("tour_id", tourId)
    .eq("artist_id", artistId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("starts_on", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stays: (stays ?? []).map(s => mapStay(s as StayRow)) })
}

// POST /api/artists/tours/stays
// body: { tourId, artistId, city, country?, venueOrArea?, startsOn, endsOn, color, sortOrder?, notes? }
export async function POST(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { tourId, artistId, city, country, venueOrArea, startsOn, endsOn, color, sortOrder, notes } = body

  if (!tourId || !artistId || !city?.trim() || !startsOn || !endsOn || !color) {
    return NextResponse.json({ error: "tourId, artistId, city, startsOn, endsOn and color are required." }, { status: 400 })
  }
  if (endsOn < startsOn) {
    return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: stay, error } = await supabase
    .from("artist_tour_stays")
    .insert({
      tour_id: tourId,
      artist_id: artistId,
      city: city.trim(),
      country: country?.trim() || null,
      venue_or_area: venueOrArea?.trim() || null,
      starts_on: startsOn,
      ends_on: endsOn,
      color,
      sort_order: sortOrder ?? null,
      notes: notes?.trim() || null,
    })
    .select("id, tour_id, artist_id, city, country, venue_or_area, starts_on, ends_on, color, sort_order, notes, created_at")
    .single<StayRow>()

  if (error) {
    if (error.code === "23514") return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ stay: mapStay(stay) }, { status: 201 })
}

// PATCH /api/artists/tours/stays
// body: { stayId, artistId, city?, country?, venueOrArea?, startsOn?, endsOn?, color?, sortOrder?, notes? }
export async function PATCH(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { stayId, artistId, city, country, venueOrArea, startsOn, endsOn, color, sortOrder, notes } = body

  if (!stayId || !artistId) {
    return NextResponse.json({ error: "stayId and artistId are required." }, { status: 400 })
  }
  if (startsOn !== undefined && endsOn !== undefined && endsOn < startsOn) {
    return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const patch: Record<string, unknown> = {}
  if (city !== undefined) patch.city = city.trim()
  if (country !== undefined) patch.country = country?.trim() || null
  if (venueOrArea !== undefined) patch.venue_or_area = venueOrArea?.trim() || null
  if (startsOn !== undefined) patch.starts_on = startsOn
  if (endsOn !== undefined) patch.ends_on = endsOn
  if (color !== undefined) patch.color = color
  if (sortOrder !== undefined) patch.sort_order = sortOrder
  if (notes !== undefined) patch.notes = notes?.trim() || null

  const supabase = createSupabaseAdminClient()
  const { data: stay, error } = await supabase
    .from("artist_tour_stays")
    .update(patch)
    .eq("id", stayId)
    .eq("artist_id", artistId)
    .select("id, tour_id, artist_id, city, country, venue_or_area, starts_on, ends_on, color, sort_order, notes, created_at")
    .single<StayRow>()

  if (error) {
    if (error.code === "23514") return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ stay: mapStay(stay) })
}

// DELETE /api/artists/tours/stays?stayId=...&artistId=...
export async function DELETE(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const stayId = searchParams.get("stayId")?.trim()
  const artistId = searchParams.get("artistId")?.trim()

  if (!stayId || !artistId) {
    return NextResponse.json({ error: "stayId and artistId are required." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("artist_tour_stays")
    .delete()
    .eq("id", stayId)
    .eq("artist_id", artistId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
