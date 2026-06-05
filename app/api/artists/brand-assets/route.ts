/**
 * Brand source-file management endpoints.
 *
 * GET  /api/artists/brand-assets?artistId=...
 *   Returns brand_source_files for the authenticated artist.
 *   (brand_assets will be returned here in a future iteration when generation is built.)
 *
 * POST /api/artists/brand-assets
 *   Registers a freshly uploaded source file.
 *   Creates a brand_source_files record only — no asset generation yet.
 *
 * DELETE /api/artists/brand-assets?id=...&type=source
 *   Deletes a brand_source_file record.
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const IMAGE_EXTS = new Set(["svg", "png", "jpg", "jpeg", "webp"])
const ARCHIVE_OR_DOC_EXTS = new Set(["pdf", "ai", "eps", "zip", "rar"])

function statusForExt(ext: string): "uploaded" | "stored_only" {
  // Images and SVGs have a usable preview URL → "uploaded" (processable later).
  // Everything else is a raw source file → "stored_only".
  return IMAGE_EXTS.has(ext) ? "uploaded" : "stored_only"
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })

  const supabase = createSupabaseAdminClient()

  const { data: artist } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<{ id: string; owner_user_id: string | null }>()

  if (!artist || artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  const [{ data: sourceFiles }, { data: assets }] = await Promise.all([
    supabase
      .from("brand_source_files")
      .select("id, filename, file_type, file_ext, file_url, file_size, status, created_at")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false }),
    supabase
      .from("brand_assets")
      .select("id, source_file_id, name, asset_type, status, preview_url, has_solid_bg, variant, source_page, created_at")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({ sourceFiles: sourceFiles ?? [], assets: assets ?? [] })
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: {
    artistId?: string
    filename?: string
    fileType?: string
    fileExt?: string
    fileUrl?: string
    fileSize?: number
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }

  const { artistId, filename, fileType, fileExt, fileUrl, fileSize } = body
  if (!artistId || !filename || !fileExt || !fileUrl) {
    return NextResponse.json(
      { error: "artistId, filename, fileExt, and fileUrl are required." },
      { status: 400 },
    )
  }

  const supabase = createSupabaseAdminClient()

  const { data: artist } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<{ id: string; owner_user_id: string | null }>()

  if (!artist || artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  const ext    = fileExt.toLowerCase().replace(/^\./, "")
  const status = statusForExt(ext)

  const { data: sourceFile, error: sfError } = await supabase
    .from("brand_source_files")
    .insert({
      artist_id: artist.id,
      filename,
      file_type: fileType ?? `application/${ext}`,
      file_ext:  ext,
      file_url:  fileUrl,
      file_size: fileSize ?? null,
      status,
    })
    .select("id, filename, file_type, file_ext, file_url, file_size, status, created_at")
    .single()

  if (sfError) {
    console.error("[brand-assets POST]", sfError)
    return NextResponse.json({ error: sfError.message }, { status: 500 })
  }

  return NextResponse.json({ sourceFile })
}

export async function DELETE(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })

  const supabase = createSupabaseAdminClient()

  // Verify ownership before deleting
  const { data: sf } = await supabase
    .from("brand_source_files")
    .select("id, artist_id, file_url")
    .eq("id", id)
    .maybeSingle<{ id: string; artist_id: string; file_url: string }>()

  if (!sf) return NextResponse.json({ error: "Source file not found." }, { status: 404 })

  const { data: artist } = await supabase
    .from("artists")
    .select("owner_user_id")
    .eq("id", sf.artist_id)
    .maybeSingle<{ owner_user_id: string | null }>()

  if (!artist || artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  // Delete associated brand_assets first (FK: source_file_id → set null handled by DB)
  await supabase.from("brand_assets").delete().eq("source_file_id", id)

  // Delete the source file record
  const { error } = await supabase.from("brand_source_files").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
