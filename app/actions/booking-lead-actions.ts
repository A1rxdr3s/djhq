"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin/admin-auth"
import type { DbBookingLead, AdminBookingLeadStatus, EmailDeliveryStatus } from "@/types/admin"

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const VALID_STATUSES: AdminBookingLeadStatus[] = ["new", "contacted", "qualified", "confirmed", "declined"]

function mapRow(row: Record<string, unknown>): DbBookingLead {
  return {
    id:                     row.id as string,
    referenceId:            (row.reference_id as string) ?? "",
    artistId:               row.artist_id as string,
    artistHandle:           row.artist_handle as string,
    fullName:               row.full_name as string,
    email:                  row.email as string,
    phone:                  (row.phone as string) ?? null,
    city:                   row.city as string,
    eventDate:              (row.event_date as string).slice(0, 10),
    venueOrPromoter:        row.venue_or_promoter as string,
    eventDetails:           row.event_details as string,
    status:                 ((row.status as string) ?? "new") as AdminBookingLeadStatus,
    emailDeliveryStatus:    ((row.email_delivery_status as string) ?? "pending") as EmailDeliveryStatus,
    emailProviderMessageId: (row.email_provider_message_id as string) ?? null,
    emailError:             (row.email_error as string) ?? null,
    createdAt:              (row.created_at as string).slice(0, 10),
    updatedAt:              row.updated_at ? (row.updated_at as string).slice(0, 10) : null,
  }
}

// ---------------------------------------------------------------------------
// Admin actions — platform admin only
// ---------------------------------------------------------------------------

async function verifyAdminCaller(): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user?.email) return { ok: false, error: "Not authenticated." }
    if (!isAdminEmail(user.email)) return { ok: false, error: "Access denied." }
    return { ok: true, email: user.email }
  } catch {
    return { ok: false, error: "Auth check failed." }
  }
}

export async function adminUpdateBookingLeadStatus(
  id: string,
  status: AdminBookingLeadStatus,
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Missing lead ID." }
  if (!VALID_STATUSES.includes(status)) return { success: false, error: "Invalid status." }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("booking_leads")
      .update({ status })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

export async function adminDeleteBookingLead(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Missing lead ID." }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from("booking_leads").delete().eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

// ---------------------------------------------------------------------------
// HQ actions — artist owner only
// ---------------------------------------------------------------------------

async function verifyArtistOwner(
  artistId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated." }

    const supabase = createSupabaseAdminClient()
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", artistId)
      .eq("owner_user_id", user.id)
      .single()

    if (!artist) return { ok: false, error: "Access denied." }
    return { ok: true, userId: user.id }
  } catch {
    return { ok: false, error: "Auth check failed." }
  }
}

export async function hqListBookingLeads(artistId: string): Promise<DbBookingLead[]> {
  if (!artistId) return []

  const auth = await verifyArtistOwner(artistId)
  if (!auth.ok) return []

  try {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from("booking_leads")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
      .limit(200)

    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
  } catch {
    return []
  }
}

export async function hqUpdateBookingLeadStatus(
  id: string,
  status: AdminBookingLeadStatus,
  artistId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!id || !artistId) return { success: false, error: "Missing required fields." }
  if (!VALID_STATUSES.includes(status)) return { success: false, error: "Invalid status." }

  const auth = await verifyArtistOwner(artistId)
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("booking_leads")
      .update({ status })
      .eq("id", id)
      .eq("artist_id", artistId) // scoped to artist — security layer
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

export async function hqDeleteBookingLead(
  id: string,
  artistId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!id || !artistId) return { success: false, error: "Missing required fields." }

  const auth = await verifyArtistOwner(artistId)
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("booking_leads")
      .delete()
      .eq("id", id)
      .eq("artist_id", artistId) // scoped to artist — security layer
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}
