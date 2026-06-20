import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnerRow = { id: string; owner_user_id: string | null }
type TourRow = { id: string; artist_id: string; start_date: string; end_date: string }
type GigRow = { id: string; date: string; city: string; visibility_status: string | null; deleted_at: string | null }
type StayRow = {
  id: string; tour_id: string; artist_id: string
  city: string; country: string | null; venue_or_area: string | null
  starts_on: string; ends_on: string; color: string
  sort_order: number | null; notes: string | null; created_at: string
}

const STAY_COLORS = [
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6",
  "#f59e0b", "#f43f5e", "#0ea5e9", "#84cc16",
]

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

// POST /api/artists/tours/stays/generate
// body: { tourId, artistId }
//
// Auto-generates one city stay per show. Stay starts on the show date and ends
// on the next show date (creating an intentional overlap on transition days so
// the calendar renders split-color cells). The last show ends on its own date.
// Existing stays for the tour are deleted first.
export async function POST(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { tourId, artistId } = body

  if (!tourId || !artistId) {
    return NextResponse.json({ error: "tourId and artistId are required." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()

  // Verify the tour belongs to this artist
  const { data: tourRow } = await supabase
    .from("artist_tours")
    .select("id, artist_id, start_date, end_date")
    .eq("id", tourId)
    .eq("artist_id", artistId)
    .maybeSingle<TourRow>()

  if (!tourRow) return NextResponse.json({ error: "Tour not found." }, { status: 404 })

  // Fetch all active, non-cancelled gigs in the tour date range, ordered by date
  const { data: gigRows, error: gigError } = await supabase
    .from("gigs")
    .select("id, date, city, visibility_status, deleted_at")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .neq("visibility_status", "cancelled")
    .gte("date", tourRow.start_date)
    .lte("date", tourRow.end_date)
    .order("date", { ascending: true })

  if (gigError) return NextResponse.json({ error: gigError.message }, { status: 500 })

  const gigs = (gigRows ?? []) as GigRow[]

  if (gigs.length === 0) {
    return NextResponse.json({ error: "No shows found in this tour range. Add shows first." }, { status: 400 })
  }

  // Build stays: one per show. ends_on = next show's date (overlap on transition
  // day); last show ends on its own date.
  const stayInserts = gigs.map((gig, i) => {
    const nextGig = gigs[i + 1]
    const endsOn = nextGig ? nextGig.date.slice(0, 10) : gig.date.slice(0, 10)
    return {
      tour_id: tourId,
      artist_id: artistId,
      city: gig.city || "Unknown city",
      starts_on: gig.date.slice(0, 10),
      ends_on: endsOn,
      color: STAY_COLORS[i % STAY_COLORS.length],
      sort_order: i,
    }
  })

  // Delete existing stays for this tour then bulk insert
  const { error: deleteError } = await supabase
    .from("artist_tour_stays")
    .delete()
    .eq("tour_id", tourId)
    .eq("artist_id", artistId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const { data: newStays, error: insertError } = await supabase
    .from("artist_tour_stays")
    .insert(stayInserts)
    .select("id, tour_id, artist_id, city, country, venue_or_area, starts_on, ends_on, color, sort_order, notes, created_at")

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ stays: (newStays ?? []).map(s => mapStay(s as StayRow)) })
}
