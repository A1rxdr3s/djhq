"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin/admin-auth"

export interface DeleteUserResult {
  success: boolean
  error?: string
}

/**
 * Permanently deletes a Supabase auth user by ID.
 * Requires the caller to be a platform admin (verified server-side).
 * Never exposes the service role key to the client.
 */
export async function deleteAuthUser(userId: string): Promise<DeleteUserResult> {
  if (!userId) {
    return { success: false, error: "Missing user ID." }
  }

  // Verify the caller is a platform admin
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await serverClient.auth.getUser()

    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated." }
    }

    if (!isAdminEmail(user.email)) {
      return { success: false, error: "Access denied. Platform admin required." }
    }
  } catch {
    // TODO: when auth is not fully wired, we still block — better safe than sorry
    return {
      success: false,
      error: "Auth check failed. Deletion requires a fully configured Supabase session.",
    }
  }

  // Execute deletion with service role client (server-only)
  try {
    const adminClient = createSupabaseAdminClient()
    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error during deletion."
    return { success: false, error: msg }
  }
}
