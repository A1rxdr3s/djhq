"use server"

import { headers } from "next/headers"
import { randomUUID } from "crypto"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin/admin-auth"
import type { DbAdminInvitation, AdminUserRole, LicenseDuration } from "@/types/admin"

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function verifyAdminCaller(): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user }, error } = await serverClient.auth.getUser()
    if (error || !user?.email) return { ok: false, error: "Not authenticated." }
    if (!isAdminEmail(user.email)) return { ok: false, error: "Access denied." }
    return { ok: true, email: user.email }
  } catch {
    return { ok: false, error: "Auth check failed." }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLicenseExpiry(duration: LicenseDuration, from: Date): Date | null {
  if (duration === "lifetime") return null
  const d = new Date(from)
  if (duration === "one_month")    d.setMonth(d.getMonth() + 1)
  if (duration === "three_months") d.setMonth(d.getMonth() + 3)
  if (duration === "six_months")   d.setMonth(d.getMonth() + 6)
  if (duration === "one_year")     d.setFullYear(d.getFullYear() + 1)
  return d
}

async function deriveOrigin(): Promise<string> {
  try {
    const headerStore = await headers()
    const host  = headerStore.get("host") ?? "djhq.app"
    const proto = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    return `${proto}://${host}`
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app"
  }
}

function mapRow(row: Record<string, unknown>, artistMap: Map<string, { handle: string; name: string }>): DbAdminInvitation {
  const artistId = row.artist_id as string | null
  const artistInfo = artistId ? artistMap.get(artistId) : undefined
  return {
    id:               row.id as string,
    email:            row.email as string,
    role:             row.role as AdminUserRole,
    artistId,
    artistHandle:     artistInfo?.handle ?? null,
    artistName:       artistInfo?.name   ?? null,
    status:           row.status as DbAdminInvitation["status"],
    token:            row.token as string,
    inviteUrl:        row.invite_url as string ?? "",
    note:             (row.note as string) ?? null,
    licenseDuration:  row.license_duration as LicenseDuration,
    licenseExpiresAt: row.license_expires_at ? (row.license_expires_at as string).slice(0, 10) : null,
    createdBy:        row.created_by as string,
    createdAt:        (row.created_at as string).slice(0, 10),
    acceptedAt:       row.accepted_at ? (row.accepted_at as string).slice(0, 10) : null,
    revokedAt:        row.revoked_at  ? (row.revoked_at  as string).slice(0, 10) : null,
    expiresAt:        row.expires_at  ? (row.expires_at  as string).slice(0, 10) : null,
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listInvitations(): Promise<DbAdminInvitation[]> {
  try {
    const supabase = createSupabaseAdminClient()

    // Fetch artists for handle/name lookup
    const { data: artistRows } = await supabase
      .from("artists")
      .select("id, handle, artist_name")
    const artistMap = new Map<string, { handle: string; name: string }>(
      (artistRows ?? []).map((a) => [a.id as string, { handle: a.handle as string, name: a.artist_name as string }]),
    )

    const { data, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>, artistMap))
  } catch {
    return []
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateInvitationInput {
  email: string
  role: AdminUserRole
  artistHandle: string  // "" means platform-level
  licenseDuration: LicenseDuration
  note: string
}

export interface CreateInvitationResult {
  success: boolean
  invitation?: DbAdminInvitation
  error?: string
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!input.email.trim()) return { success: false, error: "Email is required." }

  try {
    const supabase = createSupabaseAdminClient()
    const origin = await deriveOrigin()

    // Resolve artist_id from handle if provided
    let artistId: string | null = null
    let artistHandle: string | null = null
    let artistName: string | null = null

    if (input.artistHandle) {
      const { data: artist } = await supabase
        .from("artists")
        .select("id, handle, artist_name")
        .eq("handle", input.artistHandle)
        .single()
      if (artist) {
        artistId    = artist.id as string
        artistHandle = artist.handle as string
        artistName  = artist.artist_name as string
      }
    }

    const token     = randomUUID().replace(/-/g, "")
    const inviteUrl = `${origin}/invite/${token}`
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 86_400_000) // 7 days
    const licenseExpiresAt = computeLicenseExpiry(input.licenseDuration, now)

    const { data, error } = await supabase
      .from("admin_invitations")
      .insert({
        email:             input.email.trim().toLowerCase(),
        role:              input.role,
        artist_id:         artistId,
        status:            "pending",
        token,
        invite_url:        inviteUrl,
        note:              input.note.trim() || null,
        license_duration:  input.licenseDuration,
        license_expires_at: licenseExpiresAt?.toISOString() ?? null,
        created_by:        auth.email,
        expires_at:        expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    const artistMap = new Map<string, { handle: string; name: string }>()
    if (artistId && artistHandle && artistName) {
      artistMap.set(artistId, { handle: artistHandle, name: artistName })
    }

    return {
      success: true,
      invitation: mapRow(data as Record<string, unknown>, artistMap),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

export interface RevokeInvitationResult {
  success: boolean
  error?: string
}

export async function revokeInvitation(id: string): Promise<RevokeInvitationResult> {
  if (!id) return { success: false, error: "Missing invitation ID." }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("admin_invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending") // only revoke pending invitations

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInvitation(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Missing invitation ID." }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from("admin_invitations").delete().eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

// ─── Fetch by token (for /invite/[token]) ─────────────────────────────────────

export interface InvitationByToken {
  found: true
  invitation: DbAdminInvitation
  isExpired: boolean
}

export interface InvitationNotFound {
  found: false
  reason: "not_found" | "revoked" | "accepted"
}

export async function getInvitationByToken(
  token: string,
): Promise<InvitationByToken | InvitationNotFound> {
  if (!token) return { found: false, reason: "not_found" }

  try {
    const supabase = createSupabaseAdminClient()

    const { data: artistRows } = await supabase.from("artists").select("id, handle, artist_name")
    const artistMap = new Map<string, { handle: string; name: string }>(
      (artistRows ?? []).map((a) => [a.id as string, { handle: a.handle as string, name: a.artist_name as string }]),
    )

    const { data, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("token", token)
      .single()

    if (error || !data) return { found: false, reason: "not_found" }

    const row = data as Record<string, unknown>
    if (row.status === "revoked") return { found: false, reason: "revoked" }
    if (row.status === "accepted") return { found: false, reason: "accepted" }

    const invitation = mapRow(row, artistMap)
    const isExpired = !!(invitation.expiresAt && new Date(invitation.expiresAt) < new Date())

    return { found: true, invitation, isExpired }
  } catch {
    return { found: false, reason: "not_found" }
  }
}
