import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/png":     "png",
  "image/svg+xml": "svg",
  "image/webp":    "webp",
}

// GET /api/artists/footer-branding?artistId=...&fileExt=png
// Returns a signed upload URL for the footer logo asset.
// File bytes never pass through Vercel functions — client uploads directly to Supabase Storage.
// Available to all artists (not gated by plan).
export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const fileExt  = searchParams.get("fileExt")?.trim()

  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  if (!fileExt || !Object.values(ALLOWED_EXTENSIONS).includes(fileExt)) {
    return NextResponse.json({ error: `fileExt must be one of: ${Object.values(ALLOWED_EXTENSIONS).join(", ")}.` }, { status: 400 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<{ id: string; owner_user_id: string | null }>()

    if (error) throw error
    if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    if (artist.owner_user_id !== user.id) return NextResponse.json({ error: "Access denied." }, { status: 403 })

    const filePath = `artists/${artist.id}/branding/footer-logo-${Date.now()}.${fileExt}`

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
