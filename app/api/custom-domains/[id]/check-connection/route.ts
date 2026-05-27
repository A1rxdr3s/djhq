// POST /api/custom-domains/[id]/check-connection
//
// Phase 2 of domain onboarding: verify routing DNS then provision in Vercel.
// Called after the user has already confirmed TXT ownership (status = verified).
// Also accepts status = error where verified_at is set, so users can retry
// after a provisioning failure without re-doing TXT verification.
//
// Flow:
//   1. Check CNAME → *.vercel-dns.com  (standard non-Cloudflare setup)
//   2. Check A records (Cloudflare CNAME flattening and apex providers that don't allow CNAMEs):
//      - All resolved A records must be known Vercel IPs.
//      - Mixed Vercel + non-Vercel IPs → surface "mixed records" error, do not pass.
//   If DNS not pointing at Vercel → keep status=verified, surface error, do not call Vercel.
//   If DNS is correct             → addDomainToVercel → active (or error on provisioning failure).

import { NextResponse } from "next/server"
import { resolve4, resolveCname } from "dns/promises"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDomainToVercel } from "@/lib/vercel-domains"

// Known Vercel A-record targets for apex domains (Cloudflare CNAME flattening resolves to these).
// Do not expand to a full /24 range — only add IPs that Vercel explicitly publishes.
const VERCEL_A_RECORDS = new Set(["76.76.21.21", "76.76.21.22", "76.76.21.93"])
// All Vercel CNAME targets share this suffix.
const VERCEL_CNAME_SUFFIX = ".vercel-dns.com"

type RoutingDnsResult =
  | { ok: true }
  | { ok: false; error: string }

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

async function checkRoutingDns(domain: string): Promise<RoutingDnsResult> {
  // Try CNAME first — covers non-Cloudflare setups and subdomains.
  // Cloudflare CNAME flattening at the apex returns no CNAME in external DNS, so we
  // fall through to A record resolution below for those cases.
  try {
    const cnames = await resolveCname(domain)
    if (cnames.some((r) => r === "cname.vercel-dns.com" || r.endsWith(VERCEL_CNAME_SUFFIX))) {
      return { ok: true }
    }
  } catch {
    // ENODATA / ENOTFOUND — not a CNAME or not resolvable as one; fall through.
  }

  // Try A records — covers Cloudflare CNAME flattening and providers that don't allow apex CNAMEs.
  // Reject mixed sets: if any A record is not a known Vercel IP, old records are still present.
  try {
    const aRecords = await resolve4(domain)
    if (aRecords.length > 0) {
      const vercel = aRecords.filter((r) => VERCEL_A_RECORDS.has(r))
      const nonVercel = aRecords.filter((r) => !VERCEL_A_RECORDS.has(r))

      if (vercel.length > 0 && nonVercel.length === 0) {
        return { ok: true }
      }

      if (vercel.length > 0 && nonVercel.length > 0) {
        return {
          ok: false,
          error:
            "Your domain has mixed DNS records. Remove the old A or CNAME records " +
            "that don't point to Vercel, then keep only the Vercel DNS target.",
        }
      }
    }
  } catch {
    // Not resolvable as A record.
  }

  return {
    ok: false,
    error:
      "Routing DNS not detected. In your DNS provider, set a CNAME record: " +
      "Name @ → Value cname.vercel-dns.com. " +
      "If your provider doesn't support apex CNAMEs (e.g. some non-Cloudflare providers), " +
      "use an A record pointing to 76.76.21.21 instead. " +
      "Cloudflare users: CNAME flattening is expected — external DNS will show A records, " +
      "which is normal and correct. " +
      "Remove any old A or CNAME records pointing elsewhere before retrying. " +
      "DNS changes can take up to 48 hours to propagate.",
  }
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
  const routingResult = await checkRoutingDns(domainRow.domain)

  if (!routingResult.ok) {
    await admin
      .from("custom_domains")
      .update({
        status: "verified",
        error_message: routingResult.error,
      })
      .eq("id", id)

    return NextResponse.json(
      { success: false, routingDnsOk: false, error: routingResult.error },
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
