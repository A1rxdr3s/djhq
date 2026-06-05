/**
 * GET /api/artists/brand-upload?artistId=...&fileExt=...&filename=...
 *
 * Returns a signed upload URL for a brand source file.
 * Files are stored in the artist-gallery bucket under artists/{id}/brand/
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_EXTENSIONS = new Set([
  "svg", "png", "jpg", "jpeg", "webp",
  "pdf", "ai", "eps", "zip", "rar",
])

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const fileExt  = searchParams.get("fileExt")?.trim().toLowerCase()
  const filename = searchParams.get("filename")?.trim() || "brand-file"

  if (!artistId)  return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  if (!fileExt || !ALLOWED_EXTENSIONS.has(fileExt)) {
    return NextResponse.json({ error: `fileExt must be one of: ${[...ALLOWED_EXTENSIONS].join(", ")}.` }, { status: 400 })
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

    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
    const filePath = `artists/${artist.id}/brand/${Date.now()}-${safe}`

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
