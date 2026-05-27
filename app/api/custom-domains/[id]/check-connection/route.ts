// POST /api/custom-domains/[id]/check-connection
//
// Phase 2 of domain onboarding: provision in Vercel then verify routing via Vercel config API.
// Called after the user has already confirmed TXT ownership (status = verified).
// Also accepts status = error where verified_at is set, so users can retry
// after a provisioning failure without re-doing TXT verification.
//
// Flow:
//   1. addDomainToVercel — registers the domain in the Vercel project (idempotent).
//   2. checkDomainConfigVercel — asks Vercel whether routing DNS is correct.
//      - misconfigured: false → status = active (live).
//      - misconfigured: true or null (API unavailable) → status stays verified, surface routing error.
//   This avoids fragile IP allowlists that break with Cloudflare CNAME flattening and
//   Vercel's geolocation-based CDN IPs.

import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDomainToVercel, checkDomainConfigVercel } from "@/lib/vercel-domains"

const ROUTING_ERROR =
  "We could not confirm the Vercel DNS target yet. " +
  "Make sure your apex CNAME points to cname.vercel-dns.com and is DNS-only in Cloudflare, " +
  "then try again. DNS changes can take up to 48 hours to propagate."

type DomainRow = {
  id: string
  domain: string
  status: string
  verified_at: string | null
  artist_id: string
}

type ArtistRow = {
  owner_user_id: string | null
  plan: string
}

export async function POST(
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
    .select("id, domain, status, verified_at, artist_id")
    .eq("id", id)
    .maybeSingle<DomainRow>()

  if (domainError) {
    return NextResponse.json({ error: "Unable to load domain." }, { status: 500 })
  }

  if (!domainRow) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 })
  }

  // Allow verified domains, or error domains where TXT ownership was previously confirmed.
  const ownershipConfirmed =
    domainRow.status === "verified" ||
    (domainRow.status === "error" && domainRow.verified_at !== null)

  if (!ownershipConfirmed) {
    return NextResponse.json(
      {
        error: `Domain ownership must be verified before checking connection. Current status: "${domainRow.status}".`,
      },
      { status: 409 },
    )
  }

  const { data: artist, error: artistError } = await admin
    .from("artists")
    .select("owner_user_id, plan")
    .eq("id", domainRow.artist_id)
    .maybeSingle<ArtistRow>()

  if (artistError || !artist) {
    return NextResponse.json({ error: "Unable to load artist." }, { status: 500 })
  }

  if (artist.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  if (artist.plan !== "pro") {
    return NextResponse.json({ error: "Custom domains require a Pro plan." }, { status: 403 })
  }

  // Step 1: register the domain in Vercel (idempotent — 409 from Vercel is treated as success).
  const vercelResult = await addDomainToVercel(domainRow.domain)

  if (!vercelResult.ok) {
    const provisioningError = `Provisioning failed: ${vercelResult.error} — please try again or contact support.`

    await admin
      .from("custom_domains")
      .update({ status: "error", error_message: provisioningError })
      .eq("id", id)

    return NextResponse.json(
      { success: false, status: "error", error: provisioningError },
      { status: 500 },
    )
  }

  // Step 2: ask Vercel whether routing DNS resolves correctly for this domain.
  // This handles Cloudflare apex CNAME flattening and all geolocation-based CDN IPs transparently.
  const configResult = await checkDomainConfigVercel(domainRow.domain)

  if (configResult !== null && !configResult.misconfigured) {
    await admin
      .from("custom_domains")
      .update({
        status: "active",
        added_to_vercel_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", id)

    return NextResponse.json({ success: true, status: "active" })
  }

  // Vercel reports domain as misconfigured or config API was unreachable — keep status=verified
  // and surface a routing error. The user retries once DNS propagates.
  await admin
    .from("custom_domains")
    .update({ status: "verified", error_message: ROUTING_ERROR })
    .eq("id", id)

  return NextResponse.json(
    { success: false, routingDnsOk: false, error: ROUTING_ERROR },
    { status: 400 },
  )
}
