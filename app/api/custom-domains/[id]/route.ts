import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type DomainRow = {
  id: string
  status: string
  artist_id: string
}

type ArtistRow = {
  owner_user_id: string | null
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json({ error: "Domain id is required." }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: domainRow, error: domainError } = await admin
    .from("custom_domains")
    .select("id, status, artist_id")
    .eq("id", id)
    .maybeSingle<DomainRow>()

  if (domainError) {
    return NextResponse.json({ error: "Unable to load domain." }, { status: 500 })
  }

  if (!domainRow) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 })
  }

  if (domainRow.status === "removed") {
    return NextResponse.json({ error: "Domain is already removed." }, { status: 409 })
  }

  // Ownership check
  const { data: artist, error: artistError } = await admin
    .from("artists")
    .select("owner_user_id")
    .eq("id", domainRow.artist_id)
    .maybeSingle<ArtistRow>()

  if (artistError || !artist) {
    return NextResponse.json({ error: "Unable to load artist." }, { status: 500 })
  }

  if (artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  // Soft-delete — row kept for audit trail. DJHQ team will remove from Vercel manually.
  const { error: updateError } = await admin
    .from("custom_domains")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: "Unable to remove domain." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
