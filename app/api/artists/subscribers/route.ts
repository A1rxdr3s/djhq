import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

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
    .select("id, email, status, source, subscribed_at")
    .eq("artist_id", artistId)
    .order("subscribed_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[subscribers] DB error:", error.message)
    return NextResponse.json({ error: "Failed to load subscribers." }, { status: 500 })
  }

  return NextResponse.json({ subscribers: subscribers ?? [], handle: artist.handle })
}
