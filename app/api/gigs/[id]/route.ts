import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { assertAllowedOrigin } from "@/lib/request-security"

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/gigs/[id] — soft-delete a gig (set deleted_at = now())
export async function PATCH(request: Request, { params }: RouteContext) {
  const originError = assertAllowedOrigin(request)
  if (originError) return originError

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { id: gigId } = await params

  if (!gigId) {
    return NextResponse.json({ error: "Gig ID is required." }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Fetch the gig with its artist to verify ownership.
  const { data: gigRow, error: fetchError } = await supabase
    .from("gigs")
    .select("id, artist_id, artists!inner(owner_user_id)")
    .eq("id", gigId)
    .is("deleted_at", null)
    .single()

  if (fetchError || !gigRow) {
    return NextResponse.json({ error: "Show not found." }, { status: 404 })
  }

  const artist = Array.isArray(gigRow.artists) ? gigRow.artists[0] : gigRow.artists
  if (!artist || artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "You do not have permission to delete this show." }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from("gigs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", gigId)

  if (updateError) {
    console.error("[gigs PATCH]", updateError)
    return NextResponse.json({ error: "Failed to delete show." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
