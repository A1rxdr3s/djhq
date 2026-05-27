// Session-authenticated admin activation — no bearer token exposed to browser.
// Requires DJHQ_ADMIN_USER_IDS (comma-separated Supabase user UUIDs, server-only).
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type DomainRow = {
  id: string
  status: string
  artist_id: string
}

type ArtistPlanRow = {
  plan: string
  is_published: boolean
}

function getAdminUserIds(): Set<string> {
  const raw = process.env.DJHQ_ADMIN_USER_IDS ?? ""
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const adminIds = getAdminUserIds()
  if (!adminIds.size || !adminIds.has(user.id)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const { id } = await params
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

  if (domainRow.status !== "verified") {
    return NextResponse.json(
      { error: `Domain must be in "verified" status to activate. Current: "${domainRow.status}".` },
      { status: 409 },
    )
  }

  const { data: artist, error: artistError } = await admin
    .from("artists")
    .select("plan, is_published")
    .eq("id", domainRow.artist_id)
    .maybeSingle<ArtistPlanRow>()

  if (artistError || !artist) {
    return NextResponse.json({ error: "Unable to load artist." }, { status: 500 })
  }

  if (artist.plan !== "pro") {
    return NextResponse.json({ error: "Artist must be on Pro plan to activate a custom domain." }, { status: 403 })
  }

  if (!artist.is_published) {
    return NextResponse.json({ error: "Artist profile must be published to activate a custom domain." }, { status: 403 })
  }

  const { error: updateError } = await admin
    .from("custom_domains")
    .update({
      status: "active",
      added_to_vercel_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: "Unable to activate domain." }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: "active" })
}
