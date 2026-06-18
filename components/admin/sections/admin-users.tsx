"use client"

import { useState } from "react"
import { Users, AlertTriangle, X } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { deleteAuthUser } from "@/app/actions/admin-delete-user"
import type { AdminRealData, AdminUserRole } from "@/types/admin"

const ROLE_LABELS: Record<AdminUserRole, string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

interface DeleteModalProps {
  email: string
  userId: string
  onConfirm: (userId: string) => Promise<void>
  onClose: () => void
  isDeleting: boolean
  deleteError: string | null
}

function DeleteConfirmModal({ email, userId, onConfirm, onClose, isDeleting, deleteError }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900">Delete User</h3>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[13px] text-slate-600">
          This will permanently delete the account for:
        </p>
        <p className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 font-mono text-[12px] font-semibold text-slate-800">
          {email}
        </p>
        <p className="mt-3 text-[12px] text-slate-500">
          This action cannot be undone. The user will lose access immediately and all their data may be affected.
        </p>

        {deleteError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] text-red-700">{deleteError}</p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(userId)}
            disabled={isDeleting}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AdminUsersProps {
  realData: AdminRealData
  sessionEmail: string | null
}

export function AdminUsers({ realData, sessionEmail }: AdminUsersProps) {
  const { authUsers, artists } = realData

  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // Map owner_user_id → artist handle
  const userArtistMap: Record<string, string> = {}
  artists.forEach((a) => {
    if (a.ownerUserId) userArtistMap[a.ownerUserId] = a.handle
  })

  // Real auth users from Supabase, excluding already-deleted ones
  const authRows = authUsers
    .filter((u) => !deletedIds.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: "Artist Owner",
      status: "active" as const,
      artistHandle: userArtistMap[u.id] ?? null,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      isLocal: false,
      isPlatformAdmin: u.email === "andres@tothebit.com",
    }))

  const allRows = authRows

  async function handleDelete(userId: string) {
    setIsDeleting(true)
    setDeleteError(null)

    const result = await deleteAuthUser(userId)

    if (result.success) {
      setDeletedIds((prev) => new Set([...prev, userId]))
      setDeleteTarget(null)
    } else {
      setDeleteError(result.error ?? "Deletion failed.")
    }
    setIsDeleting(false)
  }

  if (allRows.length === 0) {
    return (
      <div>
        <AdminSectionHeader title="Users" description="Authenticated users on the platform." />
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
        description={`${authRows.length} auth user${authRows.length !== 1 ? "s" : ""} · real Supabase accounts`}
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{row.email}</p>
                      {row.isPlatformAdmin && (
                        <span className="rounded-full bg-green-50 border border-green-200 px-1.5 py-0 text-[9px] font-semibold text-green-700">
                          Platform Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{row.role}</td>
                  <td className="px-4 py-2.5">
                    <AdminStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    {row.artistHandle ? (
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
                    {/* Never offer delete on the current session user or platform admin */}
                    {!row.isLocal && !row.isPlatformAdmin && row.email !== sessionEmail && (
                      <button
                        onClick={() => setDeleteTarget({ userId: row.id, email: row.email })}
                        className="opacity-0 text-[11px] text-red-500 transition-opacity duration-100 group-hover:opacity-100 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                    {row.email === sessionEmail && (
                      <span className="text-[10px] text-slate-300">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          email={deleteTarget.email}
          userId={deleteTarget.userId}
          onConfirm={handleDelete}
          onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
          isDeleting={isDeleting}
          deleteError={deleteError}
        />
      )}
    </div>
  )
}
