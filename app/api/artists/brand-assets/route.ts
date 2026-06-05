/**
 * Brand asset management endpoints.
 *
 * GET  /api/artists/brand-assets?artistId=...
 *   Returns brand_source_files + brand_assets for the authenticated artist.
 *
 * POST /api/artists/brand-assets
 *   Registers a freshly uploaded brand file. Creates source_file record.
 *   If the file is an image/SVG, also creates a brand_asset record.
 *
 * DELETE /api/artists/brand-assets?id=...
 *   Deletes a brand_source_file and any associated brand_assets.
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// File extensions that can become usable brand assets (images/vectors)
const PROCESSABLE_EXTS = new Set(["svg", "png", "jpg", "jpeg", "webp"])
// Everything else is stored only
const STORED_ONLY_EXTS = new Set(["pdf", "ai", "eps", "zip", "rar"])

function extToAssetType(_ext: string): "logo" {
  return "logo"
}

function statusForExt(ext: string): "processed" | "stored_only" {
  return PROCESSABLE_EXTS.has(ext) ? "processed" : "stored_only"
}

async function getArtistId(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle<{ id: string; owner_user_id: string | null }>()
  return data?.id ?? null
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
      .select("id, source_file_id, name, asset_type, status, preview_url, has_solid_bg, created_at")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({ sourceFiles: sourceFiles ?? [], assets: assets ?? [] })
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: { artistId?: string; filename?: string; fileType?: string; fileExt?: string; fileUrl?: string; fileSize?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }

  const { artistId, filename, fileType, fileExt, fileUrl, fileSize } = body
  if (!artistId || !filename || !fileType || !fileExt || !fileUrl) {
    return NextResponse.json({ error: "artistId, filename, fileType, fileExt, fileUrl are required." }, { status: 400 })
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

  const ext = fileExt.toLowerCase()
  const isProcessable = PROCESSABLE_EXTS.has(ext)
  const sourceStatus = statusForExt(ext)

  // 1. Create source file record
  const { data: sourceFile, error: sfError } = await supabase
    .from("brand_source_files")
    .insert({
      artist_id: artist.id,
      filename,
      file_type: fileType,
      file_ext:  ext,
      file_url:  fileUrl,
      file_size: fileSize ?? null,
      status:    sourceStatus,
    })
    .select("id, filename, file_type, file_ext, file_url, file_size, status, created_at")
    .single()

  if (sfError) throw sfError

  // 2. If processable image, create brand_asset record
  let asset = null
  if (isProcessable && sourceFile) {
    const { data: a, error: aError } = await supabase
      .from("brand_assets")
      .insert({
        artist_id:      artist.id,
        source_file_id: sourceFile.id,
        name:           filename.replace(/\.[^.]+$/, ""),
        asset_type:     extToAssetType(ext),
        status:         "processed",
        preview_url:    fileUrl,
        has_solid_bg:   false,
      })
      .select("id, source_file_id, name, asset_type, status, preview_url, has_solid_bg, created_at")
      .single()

    if (!aError) asset = a
  }

  return NextResponse.json({ sourceFile, asset })
}

export async function DELETE(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const artistId = await getArtistId(supabase, user.id)
  if (!artistId) return NextResponse.json({ error: "Artist not found." }, { status: 404 })

  // Cascading delete: brand_assets.source_file_id → set null, then delete source file
  await supabase.from("brand_assets").delete().eq("source_file_id", id).eq("artist_id", artistId)
  const { error } = await supabase.from("brand_source_files").delete().eq("id", id).eq("artist_id", artistId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
