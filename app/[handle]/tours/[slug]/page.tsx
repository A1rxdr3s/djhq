import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { PublicTourSchedule, type TourScheduleGig, type TourScheduleStay } from "@/components/djhq/public-tour-schedule"

// Reuse the anon read client pattern from the artist profile page
function createSupabaseReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type PageProps = { params: Promise<{ handle: string; slug: string }> }

type ArtistRow = {
  id: string
  artist_name: string
  avatar_url: string | null
  hero_logo_url: string | null
  hero_image_url: string | null
  is_published: boolean
}

type TourRow = {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  is_published: boolean
}

type GigRow = {
  id: string
  date: string
  event_name: string | null
  venue: string
  city: string
  country: string
  visibility_status: string | null
}

type StayRow = {
  id: string
  city: string
  starts_on: string
  ends_on: string
  color: string
}

// Relative paths like /placeholder-user.jpg resolve correctly on djhq.app but
// 404 on custom domains (andresherrera.music/placeholder-user.jpg doesn't exist).
// Only use image URLs that are absolute (Supabase storage URLs, CDN URLs, etc.).
function isAbsoluteUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("http")
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle, slug } = await params
  const supabase = createSupabaseReadClient()
  if (!supabase) return {}

  const { data: artist } = await supabase
    .from("artists")
    .select("id, artist_name, is_published")
    .eq("handle", handle.toLowerCase())
    .maybeSingle<Pick<ArtistRow, "id" | "artist_name" | "is_published">>()

  if (!artist?.is_published) return {}

  const { data: tour } = await supabase
    .from("artist_tours")
    .select("name, start_date, end_date, is_published")
    .eq("artist_id", artist.id)
    .eq("slug", slug)
    .maybeSingle<Pick<TourRow, "name" | "start_date" | "end_date" | "is_published">>()

  if (!tour?.is_published) return {}

  return {
    title: `${tour.name} — ${artist.artist_name}`,
    description: `${artist.artist_name} · ${tour.name} · ${tour.start_date} – ${tour.end_date}`,
  }
}

export default async function TourPage({ params }: PageProps) {
  const { handle, slug } = await params
  const supabase = createSupabaseReadClient()
  if (!supabase) notFound()

  // ── 1. Artist ──────────────────────────────────────────────────────────────
  const { data: artist } = await supabase
    .from("artists")
    .select("id, artist_name, avatar_url, hero_logo_url, hero_image_url, is_published")
    .eq("handle", handle.toLowerCase())
    .maybeSingle<ArtistRow>()

  if (!artist || !artist.is_published) notFound()

  // ── 2. Tour ────────────────────────────────────────────────────────────────
  const { data: tour } = await supabase
    .from("artist_tours")
    .select("id, name, slug, start_date, end_date, is_published")
    .eq("artist_id", artist.id)
    .eq("slug", slug)
    .maybeSingle<TourRow>()

  if (!tour || !tour.is_published) notFound()

  // ── 3. Gigs in range ───────────────────────────────────────────────────────
  const { data: gigRows } = await supabase
    .from("gigs")
    .select("id, date, event_name, venue, city, country, visibility_status")
    .eq("artist_id", artist.id)
    .is("deleted_at", null)
    .gte("date", tour.start_date)
    .lte("date", tour.end_date)
    .neq("visibility_status", "cancelled")
    .order("date", { ascending: true })
    .returns<GigRow[]>()

  const gigs: TourScheduleGig[] = (gigRows ?? []).map((g) => ({
    id: g.id,
    date: g.date,
    eventName: g.event_name ?? undefined,
    venue: g.venue,
    city: g.city || undefined,
  }))

  // ── 4. City stays ──────────────────────────────────────────────────────────
  const { data: stayRows } = await supabase
    .from("artist_tour_stays")
    .select("id, city, starts_on, ends_on, color")
    .eq("tour_id", tour.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("starts_on", { ascending: true })
    .returns<StayRow[]>()

  const stays: TourScheduleStay[] = (stayRows ?? []).map((s) => ({
    id: s.id,
    city: s.city,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    color: s.color,
  }))

  return (
    <PublicTourSchedule
      tourName={tour.name}
      artistName={artist.artist_name}
      startDate={tour.start_date}
      endDate={tour.end_date}
      gigs={gigs}
      stays={stays}
      heroImageUrl={isAbsoluteUrl(artist.hero_image_url) ? artist.hero_image_url : null}
      handle={handle}
    />
  )
}
