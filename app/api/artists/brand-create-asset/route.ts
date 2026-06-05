/**
 * POST /api/artists/brand-create-asset
 *
 * Creates a single brand_assets record for an already-uploaded image.
 * Used by the client-side PDF renderer after it uploads a rendered page PNG.
 */
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RequestBody = {
  artistId: string
  sourceFileId?: string | null
  name: string
  assetType?: "logo" | "wordmark" | "monogram" | "favicon" | "unknown"
  previewUrl: string
  status?: string
  hasSolidBg?: boolean
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: RequestBody
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }

  const {
    artistId,
    sourceFileId = null,
    name,
    assetType = "logo",
    previewUrl,
    status = "preview_only",
    hasSolidBg = false,
  } = body

  if (!artistId || !name || !previewUrl) {
    return NextResponse.json({ error: "artistId, name and previewUrl are required." }, { status: 400 })
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

  const { data: asset, error } = await supabase
    .from("brand_assets")
    .insert({
      artist_id:      artist.id,
      source_file_id: sourceFileId,
      name,
      asset_type:     assetType,
      status,
      preview_url:    previewUrl,
      has_solid_bg:   hasSolidBg,
    })
    .select("id, source_file_id, name, asset_type, status, preview_url, has_solid_bg, created_at")
    .single()

  if (error) {
    console.error("[brand-create-asset POST]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset })
}
