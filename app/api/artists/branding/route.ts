import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_EXTENSIONS = new Set(["png", "svg", "webp"])

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

// GET: Generate a signed upload URL for a branding asset.
// Query params: artistId, type (favicon), fileExt (png|svg|webp)
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
  const fileExt = searchParams.get("fileExt")?.trim().toLowerCase()

  if (!artistId) return badRequest("artistId is required.")
  if (type !== "favicon") return badRequest("type must be 'favicon'.")
  if (!fileExt || !ALLOWED_EXTENSIONS.has(fileExt)) return badRequest("fileExt must be png, svg, or webp.")

  const supabase = createSupabaseAdminClient()
  const { data: artistData, error: artistError } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<{ id: string; owner_user_id: string | null }>()

  if (artistError) return NextResponse.json({ error: artistError.message }, { status: 500 })
  if (!artistData) return badRequest("Artist not found.")
  if (artistData.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const filePath = `artists/${artistId}/branding/favicon-${Date.now()}.${fileExt}`

  const { data: signedData, error: signedError } = await supabase.storage
    .from("artist-gallery")
    .createSignedUploadUrl(filePath)

  if (signedError || !signedData) {
    return NextResponse.json(
      { error: signedError?.message ?? "Unable to generate upload URL." },
      { status: 500 },
    )
  }

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    token: signedData.token,
    filePath,
  })
}
