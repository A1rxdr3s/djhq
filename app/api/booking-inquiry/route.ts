import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function buildEmailHtml({
  artistName,
  artistHandle,
  artistProfileUrl,
  fullName,
  email,
  phone,
  city,
  eventDate,
  venueOrPromoter,
  eventDetails,
  submittedAt,
}: {
  artistName: string
  artistHandle: string
  artistProfileUrl: string
  fullName: string
  email: string
  phone: string
  city: string
  eventDate: string
  venueOrPromoter: string
  eventDetails: string
  submittedAt: string
}): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;vertical-align:top">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#09090b;padding:20px 28px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.4)">DJHQ</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#ffffff">New booking request</p>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.5)">${artistName} (@${artistHandle})</p>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Artist", `<a href="${artistProfileUrl}" style="color:#6366f1">${artistName}</a>`)}
        ${row("Full name", fullName)}
        ${row("Email", `<a href="mailto:${email}" style="color:#6366f1">${email}</a>`)}
        ${row("Phone", phone)}
        <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #f3f4f6;margin:0"></td></tr>
        ${row("Event date", eventDate)}
        ${row("City", city)}
        ${row("Venue / Promoter", venueOrPromoter)}
        <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #f3f4f6;margin:0"></td></tr>
        <tr>
          <td colspan="2" style="padding:6px 0">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Event details</p>
            <p style="margin:0;color:#111827;font-size:13px;white-space:pre-wrap;background:#f9fafb;border-radius:6px;padding:12px;border:1px solid #e5e7eb">${eventDetails}</p>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:11px;color:#9ca3af">Submitted ${submittedAt} via <a href="${artistProfileUrl}" style="color:#9ca3af">${artistProfileUrl}</a></p>
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">Reply to this email to respond directly to the requester.</p>
    </div>
  </div>
</body>
</html>`
}

function buildEmailText({
  artistName,
  artistHandle,
  artistProfileUrl,
  fullName,
  email,
  phone,
  city,
  eventDate,
  venueOrPromoter,
  eventDetails,
  submittedAt,
}: Parameters<typeof buildEmailHtml>[0]): string {
  return [
    `NEW BOOKING REQUEST — ${artistName.toUpperCase()}`,
    ``,
    `Artist:          ${artistName} (@${artistHandle})`,
    ``,
    `Full name:       ${fullName}`,
    `Email:           ${email}`,
    `Phone:           ${phone}`,
    ``,
    `Event date:      ${eventDate}`,
    `City:            ${city}`,
    `Venue/Promoter:  ${venueOrPromoter}`,
    ``,
    `Event details:`,
    eventDetails,
    ``,
    `---`,
    `Submitted: ${submittedAt}`,
    `Source: ${artistProfileUrl}`,
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const {
    artistHandle,
    name,
    email,
    phone,
    eventDate,
    city,
    company,
    message,
    website, // honeypot — silently succeed if filled
  } = body as Record<string, string | undefined>

  // Honeypot check
  if (website) {
    return NextResponse.json({ ok: true })
  }

  // Required field validation
  const missing =
    !artistHandle?.trim() ||
    !name?.trim() ||
    !email?.trim() ||
    !eventDate?.trim() ||
    !city?.trim() ||
    !company?.trim() ||
    !message?.trim()

  if (missing) {
    return NextResponse.json({ error: "All required fields must be filled." }, { status: 400 })
  }

  if (!EMAIL_RE.test(email!)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 })
  }

  if (!DATE_RE.test(eventDate!)) {
    return NextResponse.json({ error: "Invalid event date." }, { status: 400 })
  }

  // Length guards
  if (
    name!.length > 100 ||
    email!.length > 200 ||
    (phone?.trim() && phone.length > 30) ||
    city!.length > 100 ||
    company!.length > 200 ||
    message!.length > 2000
  ) {
    return NextResponse.json({ error: "One or more fields exceed maximum length." }, { status: 400 })
  }

  // Rate limiting: 5/IP/10 min; 3/email+artist/hour
  const ip = getClientIp(request)
  const handle = artistHandle!.toLowerCase().trim()

  if (!checkRateLimit(`booking:ip:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }
  if (!checkRateLimit(`booking:email:${email!.toLowerCase()}:${handle}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  // Fetch artist — recipient email must come from trusted DB config, never from client
  const supabase = createSupabaseAdminClient()
  const { data: artistRow, error: artistError } = await supabase
    .from("artists")
    .select("id, artist_name, booking_email, handle, is_published")
    .eq("handle", handle)
    .single()

  if (artistError || !artistRow) {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  }

  if (!artistRow.is_published) {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  }

  if (!artistRow.booking_email?.trim()) {
    return NextResponse.json(
      { error: "Booking email is not configured for this artist." },
      { status: 422 },
    )
  }

  // Build display values
  const formattedDate = new Date(`${eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  })
  const submittedAt = new Date().toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app").replace(/\/$/, "")
  const artistProfileUrl = `${appUrl}/${artistRow.handle}`
  const phoneDisplay = phone?.trim() || "Not provided"
  const eventDetailsText = message!.trim()

  const emailParams = {
    artistName:      artistRow.artist_name as string,
    artistHandle:    artistRow.handle as string,
    artistProfileUrl,
    fullName:        name!.trim(),
    email:           email!.trim(),
    phone:           phoneDisplay,
    city:            city!.trim(),
    eventDate:       formattedDate,
    venueOrPromoter: company!.trim(),
    eventDetails:    eventDetailsText,
    submittedAt,
  }

  // Persist lead first — no inquiry is lost even if email delivery fails
  const { data: leadRow, error: leadError } = await supabase
    .from("booking_leads")
    .insert({
      artist_id:             artistRow.id,
      artist_handle:         handle,
      full_name:             name!.trim(),
      email:                 email!.trim().toLowerCase(),
      phone:                 phone?.trim() || null,
      city:                  city!.trim(),
      event_date:            eventDate!,
      venue_or_promoter:     company!.trim(),
      event_details:         eventDetailsText,
      email_delivery_status: "pending",
    })
    .select("id")
    .single()

  if (leadError) {
    console.error("[booking-inquiry] booking_leads insert failed:", leadError)
  }

  const leadId = (leadRow as { id?: string } | null)?.id ?? null

  async function markDelivery(status: "sent" | "failed", extra: Record<string, string> = {}) {
    if (!leadId) return
    await supabase
      .from("booking_leads")
      .update({ email_delivery_status: status, ...extra })
      .eq("id", leadId)
  }

  // Require RESEND_API_KEY — configured at the platform level
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("[booking-inquiry] RESEND_API_KEY is not configured")
    await markDelivery("failed", { email_error: "RESEND_API_KEY not configured" })
    return NextResponse.json(
      { error: "Booking request could not be sent. Please contact the artist directly." },
      { status: 503 },
    )
  }

  const fromAddress =
    process.env.BOOKING_FROM_EMAIL ?? "DJHQ Booking <booking@djhq.app>"

  const subject = `New booking request for ${artistRow.artist_name}`

  const resend = new Resend(resendApiKey)
  const { data: sendData, error: sendError } = await resend.emails.send({
    from:    fromAddress,
    to:      artistRow.booking_email as string,
    replyTo: email!.trim(),
    subject,
    html:    buildEmailHtml(emailParams),
    text:    buildEmailText(emailParams),
  })

  if (sendError || !sendData?.id) {
    const errMsg = sendError?.message ?? "Unknown Resend error"
    console.error("[booking-inquiry] Resend error:", errMsg)
    await markDelivery("failed", { email_error: errMsg })
    return NextResponse.json(
      { error: "Could not send inquiry. Please try again." },
      { status: 500 },
    )
  }

  await markDelivery("sent", {
    email_provider:            "resend",
    email_provider_message_id: sendData.id,
  })

  return NextResponse.json({ ok: true })
}
