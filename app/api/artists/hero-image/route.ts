import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ArtistOwnershipRow = {
  id: string
  owner_user_id: string | null
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

async function getOwnedArtist(artistId: string, userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<ArtistOwnershipRow>()

  if (error) throw error
  if (!data) return null
  if (data.owner_user_id !== userId) return null
  return data
}

// GET: Generate a signed upload URL for a hero image.
// Query params: artistId
// Returns: { signedUrl, token, filePath }
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

  if (!artistId) return badRequest("artistId is required.")

  try {
    const artist = await getOwnedArtist(artistId, user.id)
    if (!artist) {
      return NextResponse.json({ error: "Artist not found or access denied." }, { status: 403 })
    }

    const filePath = `artists/${artist.id}/hero/hero-${Date.now()}.webp`
    const supabase = createSupabaseAdminClient()

    const { data: signedData, error: signedError } = await supabase.storage
      .from("artist-heroes")
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate upload URL."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: Register an uploaded hero image in the database.
// Body: { artistId, filePath }
// Returns: { heroImageUrl }
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: { artistId?: string; filePath?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  const { artistId, filePath } = body
  if (!artistId?.trim()) return badRequest("artistId is required.")
  if (!filePath?.trim()) return badRequest("filePath is required.")

  const expectedPrefix = `artists/${artistId}/hero/`
  if (!filePath.startsWith(expectedPrefix)) return badRequest("Invalid file path.")

  try {
    const artist = await getOwnedArtist(artistId, user.id)
    if (!artist) {
      return NextResponse.json({ error: "Artist not found or access denied." }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const {
      data: { publicUrl },
    } = supabase.storage.from("artist-heroes").getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from("artists")
      .update({ hero_image_url: publicUrl })
      .eq("id", artist.id)

    if (updateError) throw updateError

    return NextResponse.json({ heroImageUrl: publicUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save hero image."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
