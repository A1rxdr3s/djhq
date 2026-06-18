// TODO: once auth is fully wired, redirect non-admin users: redirect("/sign-in")
// TODO: audit all admin page access events to a Supabase log table

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminEmail, getAdminEmails } from "@/lib/admin/admin-auth"
import { listInvitations } from "@/app/actions/admin-invitations"
import { AdminClient } from "@/components/admin/admin-client"
import type { AdminRealData, AdminRealArtist, AdminRealUser, DbBookingLead, AdminBookingLeadStatus, EmailDeliveryStatus } from "@/types/admin"

// ─── Auth gate ────────────────────────────────────────────────────────────────

async function getSessionUser(): Promise<{ email: string | null; id: string | null }> {
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    return { email: user?.email ?? null, id: user?.id ?? null }
  } catch {
    return { email: null, id: null }
  }
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function fetchRealAdminData(): Promise<AdminRealData> {
  const isDevMode = process.env.NODE_ENV !== "production"
  const fetchedAt = new Date().toISOString()

  try {
    const supabase = createSupabaseAdminClient()

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
      // auth.admin.listUsers fails without service role key
    }

    const { count: totalGigs } = await supabase
      .from("gigs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)

    const { count: totalReleases } = await supabase
      .from("releases")
      .select("*", { count: "exact", head: true })

    const invitations = await listInvitations()

    const { data: leadRows } = await supabase
      .from("booking_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    const bookingLeads: DbBookingLead[] = (leadRows ?? []).map((row) => ({
      id:                     row.id as string,
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
    }))

    return {
      artists,
      authUsers,
      invitations,
      bookingLeads,
      totalGigs: totalGigs ?? 0,
      totalReleases: totalReleases ?? 0,
      fetchedAt,
      isDevMode,
      dataError: false,
    }
  } catch (err) {
    console.error("[Admin] Data fetch failed:", err)
    return {
      artists: [],
      authUsers: [],
      invitations: [],
      bookingLeads: [],
      totalGigs: 0,
      totalReleases: 0,
      fetchedAt,
      isDevMode,
      dataError: true,
    }
  }
}

// ─── Access denied page ───────────────────────────────────────────────────────

function AccessDenied({ email }: { email: string | null }) {
  const isDevMode = process.env.NODE_ENV !== "production"
  const adminEmails = getAdminEmails()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <span className="text-lg">🔒</span>
        </div>
        <h1 className="text-[16px] font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-[13px] text-slate-500">
          {email
            ? <>You are signed in as <strong>{email}</strong> but do not have platform admin access.</>
            : "You must be signed in as a platform admin to access this page."}
        </p>
        {isDevMode && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Dev: admin emails are <code className="font-mono">{adminEmails.join(", ")}</code>
          </p>
        )}
        <a
          href="/hq"
          className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const { email } = await getSessionUser()
  const isDevMode = process.env.NODE_ENV !== "production"

  // In production, enforce admin gate. In dev, allow through with a warning banner
  // so the admin UI can be built without requiring a live Supabase session.
  // TODO: remove the dev bypass once auth is fully wired and tested.
  if (!isDevMode && !isAdminEmail(email)) {
    return <AccessDenied email={email} />
  }

  const realData = await fetchRealAdminData()

  return (
    <AdminClient
      realData={realData}
      sessionEmail={email}
      isAdminVerified={isAdminEmail(email)}
    />
  )
}
