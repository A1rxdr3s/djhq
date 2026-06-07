import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const VALID_TYPES = new Set([
  "hero_logo",
  "footer_logo",
  "favicon",
  "press_kit_logo",
  "social_avatar",
])

async function verifyOwnership(artistId: string) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createSupabaseAdminClient()
  const { data: artist } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<{ id: string; owner_user_id: string | null }>()

  if (!artist || artist.owner_user_id !== user.id) return null
  return { supabase, artist }
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })

  const result = await verifyOwnership(artistId)
  if (!result) return NextResponse.json({ error: "Access denied." }, { status: 403 })

  const { data: assignments } = await result.supabase
    .from("brand_asset_assignments")
    .select("id, artist_id, assignment_type, brand_asset_id, variant, variant_url, created_at, updated_at")
    .eq("artist_id", artistId)

  return NextResponse.json({ assignments: assignments ?? [] })
}

export async function POST(request: Request) {
  let body: {
    artistId?: string
    assignmentType?: string
    brandAssetId?: string
    variant?: string
    variantUrl?: string
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }

  const { artistId, assignmentType, brandAssetId, variant, variantUrl } = body
  if (!artistId || !assignmentType || !brandAssetId || !variant || !variantUrl) {
    return NextResponse.json({ error: "artistId, assignmentType, brandAssetId, variant, and variantUrl are required." }, { status: 400 })
  }
  if (!VALID_TYPES.has(assignmentType)) {
    return NextResponse.json({ error: `Invalid assignment type: ${assignmentType}` }, { status: 400 })
  }

  const result = await verifyOwnership(artistId)
  if (!result) return NextResponse.json({ error: "Access denied." }, { status: 403 })

  const { data: assignment, error } = await result.supabase
    .from("brand_asset_assignments")
    .upsert(
      {
        artist_id: artistId,
        assignment_type: assignmentType,
        brand_asset_id: brandAssetId,
        variant,
        variant_url: variantUrl,
      },
      { onConflict: "artist_id,assignment_type" },
    )
    .select("id, artist_id, assignment_type, brand_asset_id, variant, variant_url, created_at, updated_at")
    .single()

  if (error) {
    console.error("[brand-assignments POST]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also sync to artist URL columns for backward compat
  const urlUpdate: Record<string, string | null> = {}
  if (assignmentType === "hero_logo") urlUpdate.hero_logo_url = variantUrl
  if (assignmentType === "footer_logo") urlUpdate.footer_logo_url = variantUrl
  if (assignmentType === "favicon") urlUpdate.favicon_url = variantUrl
  if (Object.keys(urlUpdate).length > 0) {
    await result.supabase.from("artists").update(urlUpdate).eq("id", artistId)
  }

  return NextResponse.json({ assignment })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const assignmentType = searchParams.get("assignmentType")?.trim()

  if (!artistId || !assignmentType) {
    return NextResponse.json({ error: "artistId and assignmentType are required." }, { status: 400 })
  }

  const result = await verifyOwnership(artistId)
  if (!result) return NextResponse.json({ error: "Access denied." }, { status: 403 })

  await result.supabase
    .from("brand_asset_assignments")
    .delete()
    .eq("artist_id", artistId)
    .eq("assignment_type", assignmentType)

  // Clear the artist URL column for backward compat
  const urlUpdate: Record<string, null> = {}
  if (assignmentType === "hero_logo") urlUpdate.hero_logo_url = null
  if (assignmentType === "footer_logo") urlUpdate.footer_logo_url = null
  if (assignmentType === "favicon") urlUpdate.favicon_url = null
  if (Object.keys(urlUpdate).length > 0) {
    await result.supabase.from("artists").update(urlUpdate).eq("id", artistId)
  }

  return NextResponse.json({ ok: true })
}
