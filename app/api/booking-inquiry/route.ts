import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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
    preferredContact,
    eventDate,
    city,
    country,
    company,
    attendance,
    message,
    website, // honeypot — silently succeed if filled
  } = body as Record<string, string | undefined>

  // Honeypot check
  if (website) {
    return NextResponse.json({ ok: true })
  }

  // Required field validation — phone, preferredContact, country are now optional
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

  // Rate limiting — applied after input validation, before DB queries.
  // Limits: 5 per IP per 10 min; 3 per email+artist per hour.
  const ip = getClientIp(request)
  const handle = artistHandle!.toLowerCase().trim()

  if (!checkRateLimit(`booking:ip:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }
  if (!checkRateLimit(`booking:email:${email!.toLowerCase()}:${handle}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  // Fetch artist
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

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("[booking-inquiry] RESEND_API_KEY is not configured")
    return NextResponse.json(
      { error: "Email delivery is not configured." },
      { status: 503 },
    )
  }

  // Format date for display
  const formattedDate = new Date(`${eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app").replace(/\/$/, "")
  const artistProfileUrl = `${appUrl}/${artistRow.handle}`

  const subject = `Booking inquiry — ${artistRow.artist_name} — ${formattedDate} — ${city}`

  const phoneDisplay = phone?.trim() || "Not provided"
  const emailBody = [
    `Artist: ${artistRow.artist_name}`,
    ``,
    `Full name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phoneDisplay}`,
    ``,
    `Event date: ${formattedDate}`,
    `City: ${city}`,
    ``,
    `Venue / Festival / Promoter: ${company}`,
    ``,
    `Event details:`,
    message!.trim(),
    ``,
    `---`,
    `Source: ${artistProfileUrl}`,
  ].join("\n")

  const resend = new Resend(resendApiKey)
  const { error: sendError } = await resend.emails.send({
    from: "DJHQ Booking <bookings@djhq.app>",
    to: artistRow.booking_email,
    replyTo: email,
    subject,
    text: emailBody,
  })

  if (sendError) {
    console.error("[booking-inquiry] Resend error:", sendError)
    return NextResponse.json(
      { error: "Could not send inquiry. Please try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
