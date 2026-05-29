import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnershipRow = {
  id: string
  owner_user_id: string | null
  plan: string
}

const ALLOWED_TYPES: Record<string, Record<string, string>> = {
  logo: {
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  },
}

// GET /api/artists/hero-branding?artistId=...&type=logo&fileExt=png
// Returns a signed upload URL for hero branding assets (logo).
// File bytes never pass through Vercel functions.
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
  const type = searchParams.get("type")?.trim()
  const fileExt = searchParams.get("fileExt")?.trim()

  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  if (!type || !ALLOWED_TYPES[type]) return NextResponse.json({ error: "type must be 'logo'." }, { status: 400 })
  if (!fileExt || !Object.values(ALLOWED_TYPES[type]).includes(fileExt)) {
    return NextResponse.json({ error: `fileExt must be one of: ${Object.values(ALLOWED_TYPES[type]).join(", ")}.` }, { status: 400 })
  }

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
    if (artist.plan !== "pro") return NextResponse.json({ error: "Hero branding requires a Pro plan." }, { status: 403 })

    const filePath = `artists/${artist.id}/branding/hero-logo-${Date.now()}.${fileExt}`

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
