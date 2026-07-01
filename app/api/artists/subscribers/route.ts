import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

// ── GET — list subscribers for the authenticated artist owner ─────────────────

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")
  if (!artistId) {
    return NextResponse.json({ error: "artistId required." }, { status: 400 })
  }

  const adminClient = createSupabaseAdminClient()

  // Verify the requesting user owns this artist.
  const { data: artist } = await adminClient
    .from("artists")
    .select("id, handle, artist_name")
    .eq("id", artistId)
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const { data: subscribers, error } = await adminClient
    .from("artist_subscribers")
    .select("id, email, status, source, subscribed_at, unsubscribed_at")
    .eq("artist_id", artistId)
    .order("subscribed_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[subscribers] DB error:", error.message)
    return NextResponse.json({ error: "Failed to load subscribers." }, { status: 500 })
  }

  return NextResponse.json({ subscribers: subscribers ?? [], handle: artist.handle })
}

// ── PATCH — update a subscriber's status ─────────────────────────────────────
// Body: { artistId, subscriberId, action: "unsubscribe" | "resubscribe" }

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { artistId, subscriberId, action } = body as Record<string, unknown>

  if (!artistId || typeof artistId !== "string") {
    return NextResponse.json({ error: "artistId required." }, { status: 400 })
  }
  if (!subscriberId || typeof subscriberId !== "string") {
    return NextResponse.json({ error: "subscriberId required." }, { status: 400 })
  }
  if (action !== "unsubscribe" && action !== "resubscribe") {
    return NextResponse.json({ error: "action must be 'unsubscribe' or 'resubscribe'." }, { status: 400 })
  }

  const adminClient = createSupabaseAdminClient()

  // Verify the requesting user owns the artist.
  const { data: artist } = await adminClient
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  // Verify the subscriber belongs to this artist (prevents cross-artist mutation).
  const { data: subscriber } = await adminClient
    .from("artist_subscribers")
    .select("id, status")
    .eq("id", subscriberId)
    .eq("artist_id", artistId)
    .maybeSingle()

  if (!subscriber) {
    return NextResponse.json({ error: "Subscriber not found." }, { status: 404 })
  }

  const now = new Date().toISOString()
  const patch =
    action === "unsubscribe"
      ? { status: "unsubscribed", unsubscribed_at: now, updated_at: now }
      : { status: "subscribed",   unsubscribed_at: null, updated_at: now }

  const { error } = await adminClient
    .from("artist_subscribers")
    .update(patch)
    .eq("id", subscriberId)
    .eq("artist_id", artistId)

  if (error) {
    console.error("[subscribers] update error:", error.message)
    return NextResponse.json({ error: "Failed to update subscriber." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE — permanently remove a subscriber ──────────────────────────────────
// Body: { artistId, subscriberId }

export async function DELETE(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { artistId, subscriberId } = body as Record<string, unknown>

  if (!artistId || typeof artistId !== "string") {
    return NextResponse.json({ error: "artistId required." }, { status: 400 })
  }
  if (!subscriberId || typeof subscriberId !== "string") {
    return NextResponse.json({ error: "subscriberId required." }, { status: 400 })
  }

  const adminClient = createSupabaseAdminClient()

  // Verify the requesting user owns the artist.
  const { data: artist } = await adminClient
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  // Verify the subscriber belongs to this artist before deleting.
  const { data: subscriber } = await adminClient
    .from("artist_subscribers")
    .select("id")
    .eq("id", subscriberId)
    .eq("artist_id", artistId)
    .maybeSingle()

  if (!subscriber) {
    return NextResponse.json({ error: "Subscriber not found." }, { status: 404 })
  }

  // Hard delete — double-scoped by both id and artist_id as a safety net.
  const { error } = await adminClient
    .from("artist_subscribers")
    .delete()
    .eq("id", subscriberId)
    .eq("artist_id", artistId)

  if (error) {
    console.error("[subscribers] delete error:", error.message)
    return NextResponse.json({ error: "Failed to delete subscriber." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
