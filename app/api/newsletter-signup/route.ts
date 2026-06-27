import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { email, artistHandle } = body as Record<string, unknown>

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (!artistHandle || typeof artistHandle !== "string" || !artistHandle.trim()) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const emailStr       = email.trim().toLowerCase()
  const emailDisplay   = email.trim()
  const handle         = artistHandle.trim().toLowerCase()

  if (emailStr.length > 200 || handle.length > 100) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Rate limit per IP — 5 signups per 10 min to prevent abuse.
  // No per-email/artist limit: DB unique constraint handles idempotency.
  const ip = getClientIp(request)
  if (!checkRateLimit(`newsletter:ip:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  // Resolve artist — recipient email must come from DB, never from client input.
  const supabase = createSupabaseAdminClient()
  const { data: artistRow } = await supabase
    .from("artists")
    .select("id, artist_name, booking_email, is_published")
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle()

  if (!artistRow) {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  }

  // Check for existing subscriber.
  const { data: existing } = await supabase
    .from("artist_subscribers")
    .select("id, status")
    .eq("artist_id", artistRow.id)
    .eq("normalized_email", emailStr)
    .maybeSingle()

  if (existing) {
    if (existing.status === "subscribed") {
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    }
    // Reactivate a previously unsubscribed email.
    await supabase
      .from("artist_subscribers")
      .update({
        status:           "subscribed",
        subscribed_at:    new Date().toISOString(),
        unsubscribed_at:  null,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    const ipHash    = createHash("sha256").update(`djhq:${ip}`).digest("hex")
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null
    const sourceUrl = request.headers.get("referer")?.slice(0, 500) ?? null

    await supabase
      .from("artist_subscribers")
      .insert({
        artist_id:       artistRow.id,
        email:           emailDisplay,
        normalized_email: emailStr,
        status:          "subscribed",
        source:          "footer",
        source_url:      sourceUrl,
        ip_hash:         ipHash,
        user_agent:      userAgent,
      })
  }

  // Send notification to artist — non-blocking; a delivery failure never fails the signup.
  const resendApiKey = process.env.RESEND_API_KEY
  const recipientEmail = artistRow.booking_email?.trim()
  if (resendApiKey && recipientEmail) {
    const fromAddress = process.env.BOOKING_FROM_EMAIL ?? "DJHQ <booking@djhq.app>"
    const resend = new Resend(resendApiKey)
    resend.emails
      .send({
        from:    fromAddress,
        to:      recipientEmail,
        replyTo: emailStr,
        subject: `New subscriber — ${artistRow.artist_name}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280">DJHQ · New Subscriber</p>
            <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827">${existing ? "Re-subscribed" : "New subscriber"} — ${artistRow.artist_name}</p>
            <p style="margin:0;font-size:14px;color:#374151">
              <strong>Email:</strong>
              <a href="mailto:${emailStr}" style="color:#6366f1;text-decoration:none">${emailStr}</a>
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Signed up via the public artist profile footer.</p>
          </div>
        `,
        text: `${existing ? "Re-subscribed" : "New subscriber"} for ${artistRow.artist_name}\n\nEmail: ${emailStr}\n\nSigned up via the public artist profile footer.`,
      })
      .catch((err: Error) => {
        console.error("[newsletter-signup] Resend error:", err.message)
      })
  }

  return NextResponse.json({ ok: true })
}
