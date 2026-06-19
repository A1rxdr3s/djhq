import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnershipRow = {
  id: string
  owner_user_id: string | null
  plan: string
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

// GET /api/artists/set-cover?artistId=...&setId=...
// Returns a signed upload URL. The browser uploads the compressed image blob directly
// to Supabase Storage — the file never passes through a Vercel function.
export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const setId = searchParams.get("setId")?.trim()

  if (!artistId) return badRequest("artistId is required.")
  if (!setId) return badRequest("setId is required.")

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id, plan")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) throw artistError
    if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    if (artist.owner_user_id !== user.id) return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    if (artist.plan !== "pro") return NextResponse.json({ error: "Custom set covers require a Pro plan." }, { status: 403 })

    const timestamp = Date.now()
    const filePath = `artists/${artist.id}/sets/${setId}/${timestamp}.webp`

    const { data: signedData, error: signedError } = await supabase.storage
      .from("artist-gallery")
      .createSignedUploadUrl(filePath)

    if (signedError) throw signedError

    return NextResponse.json({ signedUrl: signedData.signedUrl, token: signedData.token, filePath })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate upload URL."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
