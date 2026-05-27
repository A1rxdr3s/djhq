import { NextResponse } from "next/server"
import { resolveTxt } from "dns/promises"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const MAX_ATTEMPTS_PER_HOUR = 10

type DomainRow = {
  id: string
  domain: string
  status: string
  verification_token: string
  verification_attempts: number
  last_verification_attempt_at: string | null
  artist_id: string
}

type ArtistRow = {
  owner_user_id: string | null
  plan: string
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: { domainId?: unknown }
  try {
    body = (await request.json()) as { domainId?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const domainId = typeof body.domainId === "string" ? body.domainId.trim() : ""
  if (!domainId) {
    return NextResponse.json({ error: "domainId is required." }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: domainRow, error: domainError } = await admin
    .from("custom_domains")
    .select("id, domain, status, verification_token, verification_attempts, last_verification_attempt_at, artist_id")
    .eq("id", domainId)
    .maybeSingle<DomainRow>()

  if (domainError) {
    return NextResponse.json({ error: "Unable to load domain." }, { status: 500 })
  }

  if (!domainRow) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 })
  }

  // Ownership + plan check
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

  // Only pending and error domains need TXT ownership verification.
  // Verified domains proceed to routing DNS check via check-connection.
  if (!["pending", "error"].includes(domainRow.status)) {
    return NextResponse.json(
      { error: `Cannot verify a domain with status "${domainRow.status}".` },
      { status: 409 },
    )
  }

  // Rate limit: max attempts per rolling hour
  const now = Date.now()
  const lastAttempt = domainRow.last_verification_attempt_at
    ? new Date(domainRow.last_verification_attempt_at).getTime()
    : 0
  const hourMs = 60 * 60 * 1000
  const attemptsSinceReset = now - lastAttempt < hourMs ? domainRow.verification_attempts : 0

  if (attemptsSinceReset >= MAX_ATTEMPTS_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait before retrying." },
      { status: 429 },
    )
  }

  // Mark as verifying and record the attempt — must not stay stuck
  await admin
    .from("custom_domains")
    .update({
      status: "verifying",
      verification_attempts: attemptsSinceReset + 1,
      last_verification_attempt_at: new Date().toISOString(),
    })
    .eq("id", domainId)

  const expectedValue = `djhq-verify=${domainRow.verification_token}`
  let txtFound = false

  try {
    const records = await resolveTxt(`_djhq.${domainRow.domain}`)
    const flat = records.flat()
    txtFound = flat.some((r) => r === expectedValue)
  } catch {
    // DNS query failed or record doesn't exist — treat as not found
  }

  if (!txtFound) {
    const errorMessage =
      "TXT record not found. Add the record to your DNS and allow up to 48 hours for propagation, then try again."

    await admin
      .from("custom_domains")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", domainId)

    return NextResponse.json({ success: false, status: "error", error: errorMessage }, { status: 400 })
  }

  // TXT ownership confirmed — mark verified and prompt user to add routing DNS.
  // Routing DNS check and Vercel provisioning happen in check-connection.
  await admin
    .from("custom_domains")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", domainId)

  return NextResponse.json({ success: true, status: "verified" })
}
