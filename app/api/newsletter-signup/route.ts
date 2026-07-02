import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

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
    .select("id, artist_name, booking_email, footer_contact_email, is_published")
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

  // ── Audience notification ────────────────────────────────────────────────
  // Awaited so the send completes before the serverless function returns.
  // DB insert above is always the source of truth — notification failure never
  // fails the signup. Recipient priority: footer_contact_email → booking_email → skip.
  const resendApiKey   = process.env.RESEND_API_KEY
  const recipientEmail =
    (artistRow.footer_contact_email as string | null)?.trim() ||
    (artistRow.booking_email       as string | null)?.trim() ||
    null

  if (!resendApiKey) {
    console.warn("[newsletter-signup] RESEND_API_KEY not configured — notification skipped", {
      artistHandle: handle,
    })
  } else if (!recipientEmail) {
    console.warn("[newsletter-signup] No notification recipient configured — notification skipped", {
      artistHandle:        handle,
      footer_contact_email: (artistRow.footer_contact_email as string | null) ?? null,
      booking_email:        (artistRow.booking_email        as string | null) ?? null,
    })
  } else {
    const fromAddress = process.env.AUDIENCE_EMAIL_FROM ?? "DJHQ Audience <audience@djhq.app>"
    const resend = new Resend(resendApiKey)
    const eventLabel = existing ? "Re-subscribed" : "New subscriber"

    const { data: sendData, error: sendError } = await resend.emails.send({
      from:    fromAddress,
      to:      recipientEmail,
      replyTo: emailStr,
      subject: `New subscriber — ${artistRow.artist_name}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280">DJHQ · New Subscriber</p>
          <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827">${escapeHtml(eventLabel)} — ${escapeHtml(artistRow.artist_name as string | null)}</p>
          <p style="margin:0;font-size:14px;color:#374151">
            <strong>Email:</strong>
            <a href="mailto:${emailStr}" style="color:#6366f1;text-decoration:none">${escapeHtml(emailStr)}</a>
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Signed up via the public artist profile footer.</p>
        </div>
      `,
      text: `${eventLabel} for ${artistRow.artist_name}\n\nEmail: ${emailStr}\n\nSigned up via the public artist profile footer.`,
    })

    if (sendError || !sendData?.id) {
      console.error("[newsletter-signup] Notification send failed", {
        artistHandle: handle,
        recipient:    recipientEmail,
        sender:       fromAddress,
        error:        sendError?.message ?? "Unknown Resend error",
      })
    } else {
      console.log("[newsletter-signup] Notification sent", {
        artistHandle: handle,
        recipient:    recipientEmail,
        sender:       fromAddress,
        messageId:    sendData.id,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
