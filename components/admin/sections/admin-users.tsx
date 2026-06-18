"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { MOCK_USERS } from "@/lib/admin/mock-data"
import type { AdminUser, AdminInvitation } from "@/types/admin"

const ROLE_LABELS: Record<AdminUser["role"], string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

interface AdminUsersProps {
  extraInvitedUsers?: AdminInvitation[]
}

export function AdminUsers({ extraInvitedUsers = [] }: AdminUsersProps) {
  // Build a combined user list: base mock + newly invited (from localStorage)
  const invitedAsUsers: AdminUser[] = extraInvitedUsers
    .filter((inv) => inv.status === "pending")
    .map((inv) => ({
      id: `inv-${inv.id}`,
      name: inv.email.split("@")[0] ?? "Invited User",
      email: inv.email,
      role: inv.role,
      status: "invited" as const,
      artistHandle: inv.artistHandle,
      plan: "free" as const,
      createdAt: inv.createdAt,
      lastActiveAt: "—",
    }))

  const allUsers = [
    ...invitedAsUsers,
    ...MOCK_USERS,
  ]

  return (
    <div>
      <AdminSectionHeader
        title="Users"
        description={`${allUsers.length} users on the platform.`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Name / Email", "Role", "Status", "Artist", "Plan", "Created", "Last Active", "Actions"].map((h) => (
                <th
                  key={h}
                  className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.10em] text-white/30 first:pl-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {allUsers.map((user) => (
              <tr key={user.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-foreground/80">{user.name}</p>
                  <p className="text-[11px] text-white/35">{user.email}</p>
                </td>
                <td className="py-2.5 pr-4 text-white/50">{ROLE_LABELS[user.role]}</td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={user.status} />
                </td>
                <td className="py-2.5 pr-4">
                  {user.artistHandle ? (
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                      @{user.artistHandle}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 capitalize text-white/45">{user.plan}</td>
                <td className="py-2.5 pr-4 text-white/35">{user.createdAt}</td>
                <td className="py-2.5 pr-4 text-white/35">{user.lastActiveAt}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex gap-2 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    <button className="text-[11px] text-white/42 hover:text-white/80">View</button>
                    {user.status !== "suspended" && (
                      <button className="text-[11px] text-red-400/50 hover:text-red-400">
                        {/* TODO: confirm before suspend */}
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
