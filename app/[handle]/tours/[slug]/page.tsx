import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { TourCalendar, type TourCalendarGig, type TourCalendarStay } from "@/components/djhq/tour-calendar"
import { cn } from "@/lib/utils"

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

function formatTourDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const sFmt = s.toLocaleDateString("en-US", opts)
  const eFmt = e.toLocaleDateString("en-US", { ...opts, year: "numeric" })
  if (s.getFullYear() === e.getFullYear()) {
    return `${sFmt} – ${eFmt}`
  }
  return `${s.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${eFmt}`
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
    description: `${artist.artist_name} · ${tour.name} · ${formatTourDateRange(tour.start_date, tour.end_date)}`,
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

  const gigs: TourCalendarGig[] = (gigRows ?? []).map((g) => ({
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

  const stays: TourCalendarStay[] = (stayRows ?? []).map((s) => ({
    id: s.id,
    city: s.city,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    color: s.color,
  }))

  const dateRange = formatTourDateRange(tour.start_date, tour.end_date)
  const showCount = gigs.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{
          background: isAbsoluteUrl(artist.hero_image_url)
            ? undefined
            : "radial-gradient(ellipse at 50% -20%, hsl(var(--accent)/0.18) 0%, transparent 55%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)",
        }}
      >
        {isAbsoluteUrl(artist.hero_image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.12] blur-sm"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/70 to-background" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-14 sm:px-8 sm:pt-20 sm:pb-16">
          {/* Artist identity */}
          <div className="mb-8 flex items-center gap-3">
            {isAbsoluteUrl(artist.avatar_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatar_url}
                alt={artist.artist_name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/[0.12]"
              />
            )}
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45">
              {artist.artist_name}
            </p>
          </div>

          {/* Tour name */}
          <h1 className="text-balance text-[32px] font-black uppercase leading-none tracking-[-0.025em] text-foreground sm:text-[48px] lg:text-[60px]">
            {tour.name}
          </h1>

          {/* Date range + show count */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-foreground/45">
              {dateRange}
            </p>
            {showCount > 0 && (
              <>
                <span className="text-foreground/20">·</span>
                <p className="text-[13px] font-medium text-accent/70">
                  {showCount} show{showCount !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/30">
            Tour Schedule
          </p>
          {showCount === 0 && (
            <p className="text-[11px] text-muted-foreground/40">
              No shows scheduled in this range yet.
            </p>
          )}
        </div>
        <TourCalendar
          startDate={tour.start_date}
          endDate={tour.end_date}
          gigs={gigs}
          stays={stays}
          variant="public"
        />
      </div>

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl border-t border-white/[0.05] px-5 py-8 sm:px-8">
        <a
          href={`/${handle}`}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/30 transition-colors hover:text-foreground/60"
        >
          ← {artist.artist_name}
        </a>
      </div>
    </div>
  )
}
