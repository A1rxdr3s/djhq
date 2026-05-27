// POST /api/custom-domains/[id]/check-connection
//
// Phase 2 of domain onboarding: verify routing DNS then provision in Vercel.
// Called after the user has already confirmed TXT ownership (status = verified).
// Also accepts status = error where verified_at is set, so users can retry
// after a provisioning failure without re-doing TXT verification.
//
// Flow:
//   1. Check CNAME → cname.vercel-dns.com  (standard)
//   2. Check A    → 76.76.21.21 / 76.76.21.22  (Cloudflare CNAME flattening, apex)
//   If neither matches → keep status=verified, surface routing error, do not call Vercel.
//   If DNS is correct  → addDomainToVercel → active (or error on provisioning failure).

import { NextResponse } from "next/server"
import { resolve4, resolveCname } from "dns/promises"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDomainToVercel } from "@/lib/vercel-domains"

// Vercel A-record targets for apex domains.
const VERCEL_A_RECORDS = new Set(["76.76.21.21", "76.76.21.22"])
// All Vercel CNAME targets share this suffix.
const VERCEL_CNAME_SUFFIX = ".vercel-dns.com"

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

async function checkRoutingDns(domain: string): Promise<boolean> {
  // Try CNAME first — covers most setups (non-Cloudflare apex, www subdomain).
  try {
    const cnames = await resolveCname(domain)
    if (cnames.some((r) => r === "cname.vercel-dns.com" || r.endsWith(VERCEL_CNAME_SUFFIX))) {
      return true
    }
  } catch {
    // ENODATA / ENOTFOUND — not a CNAME or not resolvable as one; fall through to A record.
  }

  // Try A record — covers Cloudflare CNAME flattening and providers that don't allow apex CNAMEs.
  try {
    const aRecords = await resolve4(domain)
    if (aRecords.some((r) => VERCEL_A_RECORDS.has(r))) {
      return true
    }
  } catch {
    // Not resolvable as A record.
  }

  return false
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

  // Check routing DNS.
  const routingOk = await checkRoutingDns(domainRow.domain)

  if (!routingOk) {
    const routingError =
      "Routing DNS not detected. Add a CNAME record pointing to cname.vercel-dns.com " +
      "(or an A record 76.76.21.21 for apex domains where CNAME is not supported). " +
      "DNS changes can take up to 48 hours to propagate."

    await admin
      .from("custom_domains")
      .update({
        status: "verified",
        error_message: routingError,
      })
      .eq("id", id)

    return NextResponse.json(
      { success: false, routingDnsOk: false, error: routingError },
      { status: 400 },
    )
  }

  // Routing DNS is correct — provision the domain in Vercel.
  const vercelResult = await addDomainToVercel(domainRow.domain)

  if (vercelResult.ok) {
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

  // Vercel provisioning failed — surface error and let user retry.
  const provisioningError = `Provisioning failed: ${vercelResult.error} — please try again or contact support.`

  await admin
    .from("custom_domains")
    .update({
      status: "error",
      error_message: provisioningError,
    })
    .eq("id", id)

  return NextResponse.json(
    { success: false, status: "error", error: provisioningError },
    { status: 500 },
  )
}
