import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { validateApexDomain } from "@/lib/domain-validation"

const DNS_TARGET = "cname.vercel-dns.com"

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: { artistId?: unknown; domain?: unknown }
  try {
    body = (await request.json()) as { artistId?: unknown; domain?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const artistId = typeof body.artistId === "string" ? body.artistId.trim() : ""
  if (!artistId) {
    return NextResponse.json({ error: "artistId is required." }, { status: 400 })
  }

  const domainInput = typeof body.domain === "string" ? body.domain : ""
  const validation = validateApexDomain(domainInput)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const domain = validation.domain

  const admin = createSupabaseAdminClient()

  // Ownership + plan check
  const { data: artist, error: artistError } = await admin
    .from("artists")
    .select("id, owner_user_id, plan")
    .eq("id", artistId)
    .maybeSingle<{ id: string; owner_user_id: string | null; plan: string }>()

  if (artistError) {
    return NextResponse.json({ error: "Unable to load artist." }, { status: 500 })
  }

  if (!artist) {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  }

  if (artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  if (artist.plan !== "pro") {
    return NextResponse.json({ error: "Custom domains require a Pro plan." }, { status: 403 })
  }

  // One domain per artist: no existing live (non-removed) row.
  // Filter on removed_at IS NULL to match the partial unique index semantics.
  const { data: existing, error: existingError } = await admin
    .from("custom_domains")
    .select("id, status")
    .eq("artist_id", artistId)
    .is("removed_at", null)
    .maybeSingle<{ id: string; status: string }>()

  if (existingError) {
    return NextResponse.json({ error: "Unable to check existing domains." }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json(
      { error: "You already have a custom domain. Remove it before adding a new one." },
      { status: 409 },
    )
  }

  // Domain availability: not claimed by any other live (non-removed) row.
  // Filter on removed_at IS NULL to match the partial unique index semantics.
  const { data: taken, error: takenError } = await admin
    .from("custom_domains")
    .select("id")
    .eq("domain", domain)
    .is("removed_at", null)
    .maybeSingle<{ id: string }>()

  if (takenError) {
    return NextResponse.json({ error: "Unable to check domain availability." }, { status: 500 })
  }

  if (taken) {
    return NextResponse.json({ error: "This domain is already in use." }, { status: 409 })
  }

  const verificationToken = crypto.randomUUID()

  const { data: row, error: insertError } = await admin
    .from("custom_domains")
    .insert({
      artist_id: artistId,
      domain,
      status: "pending",
      verification_token: verificationToken,
      verification_attempts: 0,
      dns_target: DNS_TARGET,
    })
    .select("id, domain, status, created_at")
    .single<{ id: string; domain: string; status: string; created_at: string }>()

  if (insertError) {
    // 23505 = unique_violation: the domain is live under another artist despite the pre-check.
    // This can happen under a race condition; surface a clear conflict message.
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This domain is already connected to another DJHQ profile." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: "Unable to add domain." }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: "Unable to add domain." }, { status: 500 })
  }

  return NextResponse.json(
    {
      id: row.id,
      domain: row.domain,
      status: row.status,
      verificationRecord: {
        type: "TXT",
        name: `_djhq.${domain}`,
        value: `djhq-verify=${verificationToken}`,
      },
      routingRecord: {
        type: "CNAME",
        name: "@",
        value: DNS_TARGET,
      },
    },
    { status: 201 },
  )
}
