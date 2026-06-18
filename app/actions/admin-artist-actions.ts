"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin/admin-auth"

// Handles that cannot be hard-deleted via admin — primary production tenants.
const PROTECTED_HANDLES = ["andresherrera"]

export interface ArtistActionResult {
  success: boolean
  error?: string
}

async function verifyAdminCaller(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user }, error } = await serverClient.auth.getUser()
    if (error || !user?.email) return { ok: false, error: "Not authenticated." }
    if (!isAdminEmail(user.email)) return { ok: false, error: "Access denied. Platform admin required." }
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: "Auth check failed. Action requires a fully configured Supabase session.",
    }
  }
}

/**
 * Sets is_published on an artist — used for both archive (false) and restore (true).
 * Safe: reversible, no data loss.
 */
export async function setArtistPublished(
  artistId: string,
  published: boolean,
): Promise<ArtistActionResult> {
  if (!artistId) return { success: false, error: "Missing artist ID." }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("artists")
      .update({ is_published: published, updated_at: new Date().toISOString() })
      .eq("id", artistId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}

/**
 * Permanently deletes an artist and ALL related records (cascades to gigs, releases,
 * social_links, dj_sets, videos, gallery_images, custom_domains, brand assets).
 *
 * Protected handles cannot be deleted — they return an error instead.
 * Typed confirmation must be validated on the server (handle provided by caller).
 */
export async function deleteArtist(
  artistId: string,
  handle: string,
): Promise<ArtistActionResult> {
  if (!artistId || !handle) return { success: false, error: "Missing artist ID or handle." }

  if (PROTECTED_HANDLES.includes(handle.toLowerCase())) {
    return {
      success: false,
      error: `@${handle} is a protected artist and cannot be deleted via admin.`,
    }
  }

  const auth = await verifyAdminCaller()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const supabase = createSupabaseAdminClient()

    // Verify the handle matches the ID to prevent mismatch attacks
    const { data: artist, error: fetchError } = await supabase
      .from("artists")
      .select("id, handle")
      .eq("id", artistId)
      .single()

    if (fetchError || !artist) return { success: false, error: "Artist not found." }
    if (artist.handle !== handle) {
      return { success: false, error: "Handle mismatch — deletion aborted." }
    }

    const { error } = await supabase.from("artists").delete().eq("id", artistId)
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error." }
  }
}
