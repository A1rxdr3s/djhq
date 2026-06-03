import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// ── Helpers ───────────────────────────────────────────────────────────────────

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function normalizeVenueName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

// ── GET /api/venues?q=<query>&limit=<n> ──────────────────────────────────────
// Public — no auth required. Returns up to `limit` (default 8) matching venues.
// Falls back to empty array if global_venues table is empty (e.g. before seeding).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "8", 10), 20)

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const supabase = anonClient()
  if (!supabase) return NextResponse.json([])

  // Use ilike for simple prefix/contains match — fast with btree on name.
  // Also try city match so "Berlin" surfaces all Berlin venues.
  const { data, error } = await supabase
    .from("global_venues")
    .select("id, name, city, country, instagram_url, website_url, source_rank")
    .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
    .eq("is_active", true)
    .order("source_rank", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[venues GET]", error)
    return NextResponse.json([])
  }

  return NextResponse.json(data ?? [])
}

// ── POST /api/venues ──────────────────────────────────────────────────────────
// Authenticated. Upserts a venue into global_venues.
// Returns the existing row if a duplicate is found (same normalized name + city).
// Called after a user saves a show with a venue not already in the database.
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const city = typeof body.city === "string" ? body.city.trim() : ""
  const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : ""
  const instagramUrl = typeof body.instagramUrl === "string" ? body.instagramUrl.trim() || null : null
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() || null : null
  const source = typeof body.source === "string" ? body.source : "user_created"

  if (!name) {
    return NextResponse.json({ error: "Venue name is required." }, { status: 400 })
  }

  const supabase = anonClient()
  if (!supabase) return NextResponse.json({ error: "Database unavailable." }, { status: 503 })

  // Check for existing venue with the same normalised name + city.
  const { data: existing } = await supabase
    .from("global_venues")
    .select("id, name, city, country")
    .ilike("name", normalizeVenueName(name))
    .ilike("city", normalizeVenueName(city))
    .maybeSingle()

  if (existing) {
    // Already exists — return existing row without creating a duplicate.
    return NextResponse.json({ venue: existing, created: false })
  }

  // Use the admin client for the actual insert so the RLS check passes
  // regardless of the anon key's session.
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin")
  const admin = createSupabaseAdminClient()

  const { data: created, error: insertError } = await admin
    .from("global_venues")
    .insert({
      name,
      city,
      country,
      instagram_url: instagramUrl,
      website_url: websiteUrl,
      source,
      source_rank: 0,
    })
    .select("id, name, city, country")
    .single()

  if (insertError) {
    // Unique constraint violation = race condition, another request created it first.
    if (insertError.code === "23505") {
      const { data: raceExisting } = await supabase
        .from("global_venues")
        .select("id, name, city, country")
        .ilike("name", normalizeVenueName(name))
        .ilike("city", normalizeVenueName(city))
        .maybeSingle()
      return NextResponse.json({ venue: raceExisting, created: false })
    }
    console.error("[venues POST]", insertError)
    return NextResponse.json({ error: "Unable to create venue." }, { status: 500 })
  }

  return NextResponse.json({ venue: created, created: true }, { status: 201 })
}
