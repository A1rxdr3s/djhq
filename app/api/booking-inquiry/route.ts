import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit, getClientIp } from "@/lib/request-security"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Email template v2
// ---------------------------------------------------------------------------

function buildEmailHtml({
  artistName,
  artistHandle,
  referenceId,
  artistProfileUrl,
  hqUrl,
  fullName,
  email,
  phone,
  city,
  eventDate,
  eventType,
  venueOrPromoter,
  eventDetails,
  submittedAt,
}: {
  artistName: string
  artistHandle: string
  referenceId: string
  artistProfileUrl: string
  hqUrl: string
  fullName: string
  email: string
  phone: string
  city: string
  eventDate: string
  eventType: string
  venueOrPromoter: string
  eventDetails: string
  submittedAt: string
}): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:5px 14px 5px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;width:40%">${label}</td>
      <td style="padding:5px 0;color:#111827;font-size:13px;vertical-align:top">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="max-width:580px;margin:32px auto 48px">

  <!-- Header -->
  <div style="background:#09090b;border-radius:10px 10px 0 0;padding:24px 28px 20px">
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:rgba(255,255,255,0.35)">DJHQ</p>
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">New booking request</p>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;letter-spacing:0.04em;text-transform:uppercase">${artistName}</p>
    <div style="margin-top:14px;display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:5px 10px">
      <span style="font-size:11px;color:rgba(255,255,255,0.4);font-family:monospace">Ref: ${referenceId}</span>
    </div>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:24px 28px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">

    <!-- Event summary -->
    <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af">Event Summary</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${row("Date", eventDate)}
      ${eventType !== "—" ? row("Type", eventType) : ""}
      ${row("City", city)}
      ${row("Venue / Promoter", venueOrPromoter)}
    </table>

    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px">

    <!-- Requester -->
    <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af">Requester</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${row("Name", fullName)}
      ${row("Email", `<a href="mailto:${email}" style="color:#6366f1;text-decoration:none">${email}</a>`)}
      ${row("Phone", phone)}
    </table>

    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px">

    <!-- Details -->
    <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af">Event Details</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin-bottom:24px">
      <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;white-space:pre-wrap">${eventDetails}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:4px 0 24px">
      <a href="${hqUrl}" style="display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:11px 28px;border-radius:8px;letter-spacing:0.02em">
        View Booking Lead →
      </a>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:14px 28px">
    <p style="margin:0 0 3px;font-size:11px;color:#9ca3af">Submitted ${submittedAt} via <a href="${artistProfileUrl}" style="color:#9ca3af">${artistProfileUrl}</a></p>
    <p style="margin:0;font-size:11px;color:#9ca3af">Reply to this email to respond directly to the requester.</p>
  </div>

</div>
</body>
</html>`
}

function buildEmailText({
  artistName,
  referenceId,
  artistProfileUrl,
  hqUrl,
  fullName,
  email,
  phone,
  city,
  eventDate,
  eventType,
  venueOrPromoter,
  eventDetails,
  submittedAt,
}: Parameters<typeof buildEmailHtml>[0]): string {
  return [
    `NEW BOOKING REQUEST`,
    `Artist: ${artistName}`,
    `Reference: ${referenceId}`,
    ``,
    `EVENT SUMMARY`,
    `Date:           ${eventDate}`,
    ...(eventType !== "—" ? [`Type:           ${eventType}`] : []),
    `City:           ${city}`,
    `Venue/Promoter: ${venueOrPromoter}`,
    ``,
    `REQUESTER`,
    `Name:  ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    ``,
    `EVENT DETAILS`,
    eventDetails,
    ``,
    `---`,
    `View booking lead: ${hqUrl}`,
    `Submitted: ${submittedAt}`,
    `Source: ${artistProfileUrl}`,
  ].join("\n")
}

function extractEventType(message: string): { eventType: string; details: string } {
  const match = message.match(/^Event Type: (.+?)\n\n([\s\S]*)$/)
  if (match) return { eventType: match[1].trim(), details: match[2].trim() }
  return { eventType: "—", details: message }
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
  const { eventType, details: eventDetails } = extractEventType(message!.trim())
  const formattedDate = new Date(`${eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  })
  const submittedAt = new Date().toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app").replace(/\/$/, "")
  const artistProfileUrl = `${appUrl}/${artistRow.handle}`
  const hqUrl = `${appUrl}/hq`
  const phoneDisplay = phone?.trim() || "Not provided"

  // Persist lead — get reference_id back from DB default
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
      event_details:         message!.trim(),
      email_delivery_status: "pending",
    })
    .select("id, reference_id")
    .single()

  if (leadError) {
    console.error("[booking-inquiry] booking_leads insert failed:", leadError)
  }

  const leadId      = (leadRow as { id?: string; reference_id?: string } | null)?.id ?? null
  const referenceId = (leadRow as { id?: string; reference_id?: string } | null)?.reference_id ?? "DJHQ-REF"

  // ── Build email payload ───────────────────────────────────────────────────

  const fromAddress = process.env.BOOKING_FROM_EMAIL ?? "DJHQ Booking <booking@djhq.app>"
  const subject     = `New booking request for ${artistRow.artist_name} — ${referenceId}`
  const emailParams = {
    artistName:      artistRow.artist_name as string,
    artistHandle:    artistRow.handle as string,
    referenceId,
    artistProfileUrl,
    hqUrl,
    fullName:        name!.trim(),
    email:           email!.trim(),
    phone:           phoneDisplay,
    city:            city!.trim(),
    eventDate:       formattedDate,
    eventType,
    venueOrPromoter: company!.trim(),
    eventDetails,
    submittedAt,
  }

  // ── Notification with fallback — DB lead is always the source of truth ───
  // A failed or suppressed email must not fail the user submission.

  let emailDeliveryStatus: "sent" | "failed" = "failed"
  let emailProvider:       string | null      = null
  let emailProviderId:     string | null      = null
  let emailErrorNote:      string | null      = null
  let emailNotification:   "sent" | "fallback_sent" | "failed" = "failed"

  const resendApiKey  = process.env.RESEND_API_KEY
  const fallbackEmail = process.env.BOOKING_ALERT_FALLBACK_EMAIL?.trim() || null

  if (!resendApiKey) {
    emailErrorNote = "RESEND_API_KEY not configured"
    console.error("[booking-inquiry] RESEND_API_KEY not configured — lead captured, no notification sent", {
      referenceId, artistHandle: handle,
    })
  } else {
    const resend = new Resend(resendApiKey)

    // Primary send
    const { data: primaryData, error: primaryError } = await resend.emails.send({
      from:    fromAddress,
      to:      artistRow.booking_email as string,
      replyTo: email!.trim(),
      subject,
      html:    buildEmailHtml(emailParams),
      text:    buildEmailText(emailParams),
    })

    if (!primaryError && primaryData?.id) {
      emailDeliveryStatus = "sent"
      emailProvider       = "resend"
      emailProviderId     = primaryData.id
      emailNotification   = "sent"
    } else {
      const primaryErrMsg = primaryError?.message ?? "Unknown Resend error"
      console.error("[booking-inquiry] Primary email failed — lead captured", {
        referenceId,
        artistHandle:      handle,
        artistName:        artistRow.artist_name as string,
        intendedRecipient: artistRow.booking_email as string,
        resendError:       primaryErrMsg,
      })

      if (fallbackEmail) {
        // Fallback send
        const { data: fbData, error: fbError } = await resend.emails.send({
          from:    fromAddress,
          to:      fallbackEmail,
          replyTo: email!.trim(),
          subject: `[FALLBACK] ${subject}`,
          html:    buildEmailHtml(emailParams),
          text:    buildEmailText(emailParams),
        })

        if (!fbError && fbData?.id) {
          emailDeliveryStatus = "sent"
          emailProvider       = "resend"
          emailProviderId     = fbData.id
          emailErrorNote      = `Primary suppressed/failed (${primaryErrMsg}); fallback sent to ${fallbackEmail}`
          emailNotification   = "fallback_sent"
          console.warn("[booking-inquiry] Fallback email sent successfully", {
            referenceId,
            fallbackRecipient: fallbackEmail,
            primaryError:      primaryErrMsg,
          })
        } else {
          const fbErrMsg = fbError?.message ?? "Unknown fallback error"
          emailErrorNote  = `Primary failed: ${primaryErrMsg}; fallback also failed: ${fbErrMsg}`
          console.error("[booking-inquiry] Both primary and fallback email failed — lead captured", {
            referenceId,
            artistHandle:      handle,
            primaryRecipient:  artistRow.booking_email as string,
            primaryError:      primaryErrMsg,
            fallbackRecipient: fallbackEmail,
            fallbackError:     fbErrMsg,
          })
        }
      } else {
        emailErrorNote = primaryErrMsg
        console.error("[booking-inquiry] Email failed, no fallback configured — lead captured", {
          referenceId,
          artistHandle:      handle,
          intendedRecipient: artistRow.booking_email as string,
          resendError:       primaryErrMsg,
        })
      }
    }
  }

  // ── Persist email delivery outcome ────────────────────────────────────────
  if (leadId) {
    await supabase.from("booking_leads").update({
      email_delivery_status:     emailDeliveryStatus,
      email_provider:            emailProvider,
      email_provider_message_id: emailProviderId,
      email_error:               emailErrorNote,
    }).eq("id", leadId)
  }

  // DB lead captured — always return success regardless of email outcome
  return NextResponse.json({ ok: true, referenceId, emailNotification })
}
