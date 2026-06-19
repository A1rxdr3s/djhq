import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnerRow = { id: string; owner_user_id: string | null }
type TourRow = { id: string; name: string; slug: string; start_date: string; end_date: string; is_published: boolean; created_at: string }

function mapTour(t: TourRow) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    startDate: t.start_date,
    endDate: t.end_date,
    isPublished: t.is_published,
    createdAt: t.created_at,
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

// GET /api/artists/tours?artistId=...
export async function GET(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: tours, error } = await supabase
    .from("artist_tours")
    .select("id, name, slug, start_date, end_date, is_published, created_at")
    .eq("artist_id", artistId)
    .order("start_date", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tours: (tours ?? []).map(mapTour) })
}

// POST /api/artists/tours
// body: { artistId, name, slug, startDate, endDate, isPublished? }
export async function POST(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { artistId, name, slug, startDate, endDate, isPublished = true } = body

  if (!artistId || !name?.trim() || !slug?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "artistId, name, slug, startDate and endDate are required." }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug.trim())) {
    return NextResponse.json({ error: "Slug may only contain lowercase letters, numbers and hyphens." }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: tour, error } = await supabase
    .from("artist_tours")
    .insert({
      artist_id: artistId,
      name: name.trim(),
      slug: slug.trim(),
      start_date: startDate,
      end_date: endDate,
      is_published: isPublished,
    })
    .select("id, name, slug, start_date, end_date, is_published, created_at")
    .single<TourRow>()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A tour with this slug already exists." }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tour: mapTour(tour) }, { status: 201 })
}

// PATCH /api/artists/tours
// body: { tourId, artistId, name?, slug?, startDate?, endDate?, isPublished? }
export async function PATCH(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { tourId, artistId, name, slug, startDate, endDate, isPublished } = body

  if (!tourId || !artistId) {
    return NextResponse.json({ error: "tourId and artistId are required." }, { status: 400 })
  }
  if (slug !== undefined && !/^[a-z0-9-]+$/.test(slug.trim())) {
    return NextResponse.json({ error: "Slug may only contain lowercase letters, numbers and hyphens." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name.trim()
  if (slug !== undefined) patch.slug = slug.trim()
  if (startDate !== undefined) patch.start_date = startDate
  if (endDate !== undefined) patch.end_date = endDate
  if (isPublished !== undefined) patch.is_published = isPublished

  const supabase = createSupabaseAdminClient()
  const { data: tour, error } = await supabase
    .from("artist_tours")
    .update(patch)
    .eq("id", tourId)
    .eq("artist_id", artistId)
    .select("id, name, slug, start_date, end_date, is_published, created_at")
    .single<TourRow>()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A tour with this slug already exists." }, { status: 409 })
    if (error.code === "23514") return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tour: mapTour(tour) })
}

// DELETE /api/artists/tours?tourId=...&artistId=...
export async function DELETE(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get("tourId")?.trim()
  const artistId = searchParams.get("artistId")?.trim()

  if (!tourId || !artistId) {
    return NextResponse.json({ error: "tourId and artistId are required." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("artist_tours")
    .delete()
    .eq("id", tourId)
    .eq("artist_id", artistId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
