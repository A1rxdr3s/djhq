/**
 * GET /api/artists/brand-upload?artistId=...&fileExt=...&filename=...&mimeType=...
 *
 * Returns a signed upload URL for a brand SOURCE file.
 *
 * Files are stored in the `brand-sources` bucket which has:
 *   allowed_mime_types = null  →  accepts every MIME type
 *   file_size_limit = 50 MB
 *
 * This bucket intentionally accepts AI, EPS, PDF, ZIP, RAR and all image types
 * without 415 errors.
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// All accepted source-file extensions (enforced by the API, not by the bucket).
const ALLOWED_EXTENSIONS = new Set([
  // Vector / design source formats
  "svg", "eps", "ai",
  // Documents / archives
  "pdf", "zip", "rar",
  // Raster images
  "png", "jpg", "jpeg", "webp",
])

/**
 * Best-effort MIME type for a file extension.
 * Used as the upload content-type hint so browsers don't default to
 * application/octet-stream, which may be rejected by some CDNs.
 */
function mimeForExt(ext: string): string {
  const map: Record<string, string> = {
    svg:  "image/svg+xml",
    png:  "image/png",
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    pdf:  "application/pdf",
    ai:   "application/postscript",
    eps:  "application/postscript",
    zip:  "application/zip",
    rar:  "application/x-rar-compressed",
  }
  return map[ext] ?? "application/octet-stream"
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const fileExt  = searchParams.get("fileExt")?.trim().toLowerCase().replace(/^\./, "")
  const filename = searchParams.get("filename")?.trim() || "brand-source"

  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  if (!fileExt || !ALLOWED_EXTENSIONS.has(fileExt)) {
    return NextResponse.json({
      error: `Unsupported extension ".${fileExt}". Accepted: ${[...ALLOWED_EXTENSIONS].join(", ")}.`,
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

    // Path: artists/{artistId}/{timestamp}-{sanitised-filename}
    const safe     = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
    const filePath = `artists/${artist.id}/${Date.now()}-${safe}`

    const { data: signedData, error: signedError } = await supabase.storage
      .from("brand-sources")   // ← dedicated bucket, no MIME restrictions
      .createSignedUploadUrl(filePath)

    if (signedError) throw signedError

    return NextResponse.json({
      signedUrl:   signedData.signedUrl,
      token:       signedData.token,
      filePath,
      contentType: mimeForExt(fileExt),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate upload URL."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
