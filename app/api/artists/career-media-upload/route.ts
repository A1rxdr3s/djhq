/**
 * GET /api/artists/career-media-upload?artistId=...&filename=...&fileExt=...
 *
 * Returns a signed upload URL for a Career Update cover image.
 *
 * Files are stored in the `brand-sources` bucket (existing public bucket)
 * at path: career/{artistId}/{timestamp}-{sanitised-filename}
 *
 * After uploading, the caller uses the returned publicUrl as the item's imageUrl.
 * No separate asset registration is needed — unlike brand source files,
 * career images are referenced directly via imageUrl on the timeline item.
 *
 * Accepted formats: jpg, jpeg, png, webp (enforced here; bucket accepts all).
 * Max size: 20 MB (enforced by caller; bucket limit is 50 MB).
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"])

function mimeForExt(ext: string): string {
  const map: Record<string, string> = {
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    png:  "image/png",
    webp: "image/webp",
  }
  return map[ext] ?? "image/jpeg"
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const fileExt  = searchParams.get("fileExt")?.trim().toLowerCase().replace(/^\./, "")
  const filename = searchParams.get("filename")?.trim() || "career-image"

  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  if (!fileExt || !ALLOWED_EXTENSIONS.has(fileExt)) {
    return NextResponse.json({
      error: `Unsupported format ".${fileExt}". Accepted: jpg, jpeg, png, webp.`,
    }, { status: 400 })
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

    const safe     = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
    const filePath = `career/${artist.id}/${Date.now()}-${safe}`

    const { data: signedData, error: signedError } = await supabase.storage
      .from("brand-sources")
      .createSignedUploadUrl(filePath)

    if (signedError) throw signedError

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const publicUrl   = `${supabaseUrl}/storage/v1/object/public/brand-sources/${filePath}`

    return NextResponse.json({
      signedUrl:   signedData.signedUrl,
      token:       signedData.token,
      filePath,
      contentType: mimeForExt(fileExt),
      publicUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate upload URL."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
