"use client"

import { useState, type FormEvent } from "react"
import { Copy, Check, X, RefreshCw, Plus, Mail } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import type { AdminInvitation, AdminUserRole } from "@/types/admin"
import { cn } from "@/lib/utils"

const ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: "artist_owner",   label: "Artist Owner" },
  { value: "artist_editor",  label: "Artist Editor" },
  { value: "viewer",         label: "Viewer" },
  { value: "support",        label: "Support" },
  { value: "platform_admin", label: "Platform Admin" },
]

const ROLE_LABELS: Record<AdminUserRole, string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

const MOCK_TENANTS_FOR_SELECT = [
  { handle: "andresherrera", name: "ANDRES:HERRERA" },
  { handle: "mock_artist_2", name: "Mock Artist 2" },
  { handle: "mock_artist_3", name: "Mock Artist 3" },
]

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

interface AdminInvitationsProps {
  invitations: AdminInvitation[]
  onInvitationsChange: (updated: AdminInvitation[]) => void
}

export function AdminInvitations({ invitations, onInvitationsChange }: AdminInvitationsProps) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: "", role: "artist_owner" as AdminUserRole, artistHandle: "", note: "" })
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSubmitting(true)

    const token = generateToken()
    const origin = typeof window !== "undefined" ? window.location.origin : "https://djhq.app"
    const link = `${origin}/invite/${token}`

    const newInvitation: AdminInvitation = {
      id: `inv-${Date.now()}`,
      email: form.email.trim(),
      role: form.role,
      artistHandle: form.artistHandle || undefined,
      status: "pending",
      invitedBy: "Platform Admin",
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    }

    onInvitationsChange([newInvitation, ...invitations])
    setGeneratedLink(link)
    setSubmitting(false)
  }

  function handleCopy() {
    if (!generatedLink) return
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleRevoke(id: string) {
    onInvitationsChange(
      invitations.map((inv) => (inv.id === id ? { ...inv, status: "revoked" as const } : inv)),
    )
  }

  function handleClose() {
    setShowModal(false)
    setGeneratedLink(null)
    setCopied(false)
    setForm({ email: "", role: "artist_owner", artistHandle: "", note: "" })
  }

  return (
    <div>
      <AdminSectionHeader
        title="Invitations"
        description={`${invitations.length} invitation${invitations.length !== 1 ? "s" : ""} · stored locally (localStorage)`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Invite User
          </button>
        }
      />

      {/* Notice: localStorage only */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
        <p className="text-[11px] text-amber-700">
          Invitations are stored in browser localStorage only — not persisted to database.
          {/* TODO: create invitations table in Supabase and persist here */}
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-center">
          <Mail className="mx-auto mb-3 h-7 w-7 text-slate-300" />
          <p className="text-[13px] font-medium text-slate-600">No invitations yet</p>
          <p className="mt-1 text-[12px] text-slate-400">Click "Invite User" to generate your first invitation link.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Email", "Role", "Artist", "Status", "Invited By", "Created", "Expires", ""].map((h) => (
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
                {invitations.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{inv.email}</td>
                    <td className="px-4 py-2.5 text-slate-600">{ROLE_LABELS[inv.role]}</td>
                    <td className="px-4 py-2.5">
                      {inv.artistHandle ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          @{inv.artistHandle}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{inv.invitedBy}</td>
                    <td className="px-4 py-2.5 text-slate-400">{inv.createdAt}</td>
                    <td className="px-4 py-2.5 text-slate-400">{inv.expiresAt}</td>
                    <td className="px-4 py-2.5">
                      {inv.status === "pending" && (
                        <div className="flex gap-3 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                          <button className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800">
                            <RefreshCw className="h-2.5 w-2.5" /> Resend
                          </button>
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700"
                          >
                            <X className="h-2.5 w-2.5" /> Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900">Invite User</h3>
              <button onClick={handleClose} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Role *
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
                    className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Artist / Tenant */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Artist / Tenant
                  </label>
                  <select
                    value={form.artistHandle}
                    onChange={(e) => setForm((f) => ({ ...f, artistHandle: e.target.value }))}
                    className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">None (platform-level)</option>
                    {MOCK_TENANTS_FOR_SELECT.map((t) => (
                      <option key={t.handle} value={t.handle}>{t.name} (@{t.handle})</option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Internal note about this invite"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Generating…" : "Generate Invite Link"}
                </button>
              </form>
            ) : (
              /* Generated link UI */
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                    Invite link ready
                  </p>
                  <p className="break-all font-mono text-[11px] text-emerald-800">{generatedLink}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex h-9 w-full items-center justify-center gap-2 rounded-md border text-[12px] font-semibold transition-colors",
                    copied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  Invitation added to the table with status <strong>Pending</strong>.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full text-center text-[12px] text-slate-400 hover:text-slate-700"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
