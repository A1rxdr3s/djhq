// TODO: enforce platform admin role — verify Supabase session and check admin flag
// TODO: redirect non-admin users: if (!isAdmin) redirect("/sign-in")
// TODO: audit admin page access

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { AdminClient } from "@/components/admin/admin-client"
import type { AdminRealData, AdminRealArtist, AdminRealUser } from "@/types/admin"

async function fetchRealAdminData(): Promise<AdminRealData> {
  const isDevMode = process.env.NODE_ENV !== "production"
  const fetchedAt = new Date().toISOString()

  try {
    const supabase = createSupabaseAdminClient()

    // All artists (service role bypasses RLS — gets every tenant)
    const { data: artistRows, error: artistsError } = await supabase
      .from("artists")
      .select(
        "id, handle, artist_name, plan, is_published, created_at, updated_at, booking_email, press_kit_enabled, location, owner_user_id",
      )
      .order("created_at", { ascending: false })

    if (artistsError) throw artistsError

    const artists: AdminRealArtist[] = (artistRows ?? []).map((row) => ({
      id: row.id as string,
      handle: row.handle as string,
      artistName: row.artist_name as string,
      plan: (row.plan as string) ?? "free",
      isPublished: (row.is_published as boolean) ?? false,
      createdAt: ((row.created_at as string) ?? "").slice(0, 10),
      updatedAt: ((row.updated_at as string) ?? "").slice(0, 10),
      bookingEmail: (row.booking_email as string) ?? "",
      pressKitEnabled: (row.press_kit_enabled as boolean) ?? false,
      location: (row.location as string) ?? "",
      ownerUserId: (row.owner_user_id as string) ?? null,
    }))

    // Auth users — requires service role
    let authUsers: AdminRealUser[] = []
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      authUsers = (authData?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        createdAt: (u.created_at ?? "").slice(0, 10),
        lastSignInAt: u.last_sign_in_at ? u.last_sign_in_at.slice(0, 10) : null,
      }))
    } catch {
      // auth.admin.listUsers may fail if service role key is missing in dev
    }

    // Gig count (published, not soft-deleted)
    const { count: totalGigs } = await supabase
      .from("gigs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)

    // Release count
    const { count: totalReleases } = await supabase
      .from("releases")
      .select("*", { count: "exact", head: true })

    return {
      artists,
      authUsers,
      totalGigs: totalGigs ?? 0,
      totalReleases: totalReleases ?? 0,
      fetchedAt,
      isDevMode,
      dataError: false,
    }
  } catch (err) {
    // Service role not configured or Supabase unreachable
    console.error("[Admin] Data fetch failed:", err)
    return {
      artists: [],
      authUsers: [],
      totalGigs: 0,
      totalReleases: 0,
      fetchedAt,
      isDevMode,
      dataError: true,
    }
  }
}

export default async function AdminPage() {
  const realData = await fetchRealAdminData()
  return <AdminClient realData={realData} />
}
