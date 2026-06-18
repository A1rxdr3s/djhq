"use client"

import { Users } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import type { AdminRealData, AdminInvitation, AdminUserRole } from "@/types/admin"

const ROLE_LABELS: Record<AdminUserRole, string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

interface AdminUsersProps {
  realData: AdminRealData
  localInvitations: AdminInvitation[]
}

export function AdminUsers({ realData, localInvitations }: AdminUsersProps) {
  const { authUsers, artists } = realData

  // Map owner_user_id → artist handle
  const userArtistMap: Record<string, string> = {}
  artists.forEach((a) => {
    if (a.ownerUserId) userArtistMap[a.ownerUserId] = a.handle
  })

  // Invited users from localStorage (pending invitations)
  const invitedRows = localInvitations
    .filter((inv) => inv.status === "pending")
    .map((inv) => ({
      id: `inv-${inv.id}`,
      email: inv.email,
      role: ROLE_LABELS[inv.role] ?? inv.role,
      status: "invited" as const,
      artistHandle: inv.artistHandle ?? "—",
      createdAt: inv.createdAt,
      lastSignInAt: null as string | null,
      isLocal: true,
    }))

  // Real auth users from Supabase
  const authRows = authUsers.map((u) => ({
    id: u.id,
    email: u.email,
    role: "Artist Owner",
    status: "active" as const,
    artistHandle: userArtistMap[u.id] ?? "—",
    createdAt: u.createdAt,
    lastSignInAt: u.lastSignInAt,
    isLocal: false,
  }))

  const allRows = [...invitedRows, ...authRows]

  if (allRows.length === 0) {
    return (
      <div>
        <AdminSectionHeader
          title="Users"
          description="Authenticated users on the platform."
        />
        <AdminEmptyState
          icon={Users}
          title="No users found"
          description="Auth users will appear here once Supabase service role key is configured."
          todo="TODO: supabase.auth.admin.listUsers() — service role required"
        />
      </div>
    )
  }

  return (
    <div>
      <AdminSectionHeader
        title="Users"
        description={`${authRows.length} auth users · ${invitedRows.length} pending invite${invitedRows.length !== 1 ? "s" : ""}`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Email", "Role", "Status", "Artist", "Created", "Last Sign In", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRows.map((row) => (
                <tr key={row.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{row.email}</p>
                    {row.isLocal && (
                      <p className="text-[10px] text-slate-400">local invite only</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{row.role}</td>
                  <td className="px-4 py-2.5">
                    <AdminStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    {row.artistHandle !== "—" ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        @{row.artistHandle}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{row.createdAt}</td>
                  <td className="px-4 py-2.5 text-slate-400">{row.lastSignInAt ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-3 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                      <button className="text-[11px] text-slate-500 hover:text-slate-800">View</button>
                      {/* TODO: real suspend — update user metadata in Supabase */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
