// Internal manual activation endpoint — no dashboard button.
// curl -X POST https://<app>/api/custom-domains/<domain-id>/activate \
//   -H "Authorization: Bearer $DJHQ_ADMIN_SECRET"
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type DomainRow = {
  id: string
  status: string
  artist_id: string
}

type ArtistPlanRow = {
  plan: string
  is_published: boolean
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const secret = process.env.DJHQ_ADMIN_SECRET
  if (!secret || secret === "change-me-before-production") {
    return NextResponse.json({ error: "Admin secret not configured." }, { status: 503 })
  }

  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
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
      { error: `Domain must be in "verified" status to activate. Current status: "${domainRow.status}".` },
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
