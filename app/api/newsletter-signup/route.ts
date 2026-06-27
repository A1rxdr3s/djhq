import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { email, artistHandle } = body as Record<string, unknown>

  // Input validation
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (!artistHandle || typeof artistHandle !== "string" || !artistHandle.trim()) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const emailStr = email.trim().toLowerCase()
  const handle   = artistHandle.trim().toLowerCase()

  if (emailStr.length > 200 || handle.length > 100) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Rate limiting — 5 signups per IP per 10 min; 1 per email+artist per 24 h
  const ip = getClientIp(request)
  if (!checkRateLimit(`newsletter:ip:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }
  if (!checkRateLimit(`newsletter:email:${emailStr}:${handle}`, 1, 24 * 60 * 60_000)) {
    return NextResponse.json({ error: "Already signed up." }, { status: 429 })
  }

  // Resolve artist — recipient email must come from DB, never from client input
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

  const recipientEmail = artistRow.booking_email?.trim()
  if (!recipientEmail) {
    return NextResponse.json(
      { error: "Contact not configured for this artist." },
      { status: 422 },
    )
  }

  // Send notification via Resend
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("[newsletter-signup] RESEND_API_KEY not configured")
    return NextResponse.json(
      { error: "Couldn't sign up right now. Please try again." },
      { status: 503 },
    )
  }

  const fromAddress = process.env.BOOKING_FROM_EMAIL ?? "DJHQ <booking@djhq.app>"
  const resend = new Resend(resendApiKey)

  const { error: sendError } = await resend.emails.send({
    from:    fromAddress,
    to:      recipientEmail,
    replyTo: emailStr,
    subject: `New newsletter signup — ${artistRow.artist_name}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280">DJHQ · Newsletter Signup</p>
        <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827">New signup for ${artistRow.artist_name}</p>
        <p style="margin:0;font-size:14px;color:#374151">
          <strong>Email:</strong>
          <a href="mailto:${emailStr}" style="color:#6366f1;text-decoration:none">${emailStr}</a>
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Submitted via the public artist profile footer.</p>
      </div>
    `,
    text: `New newsletter signup for ${artistRow.artist_name}\n\nEmail: ${emailStr}\n\nSubmitted via the public artist profile footer.`,
  })

  if (sendError) {
    console.error("[newsletter-signup] Resend error:", sendError.message)
    return NextResponse.json(
      { error: "Couldn't sign up right now. Please try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
