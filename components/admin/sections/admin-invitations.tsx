"use client"

import { useState, type FormEvent } from "react"
import { Copy, Check, X, RefreshCw, Plus } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { MOCK_INVITATIONS, MOCK_TENANTS } from "@/lib/admin/mock-data"
import type { AdminInvitation, AdminUserRole } from "@/types/admin"
import { cn } from "@/lib/utils"

const ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: "artist_owner",  label: "Artist Owner" },
  { value: "artist_editor", label: "Artist Editor" },
  { value: "viewer",        label: "Viewer" },
  { value: "support",       label: "Support" },
  { value: "platform_admin", label: "Platform Admin" },
]

const ROLE_LABELS: Record<AdminUserRole, string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

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

  const allInvitations = [...invitations, ...MOCK_INVITATIONS]

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
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    }

    const updated = [newInvitation, ...invitations]
    onInvitationsChange(updated)
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
    const updated = invitations.map((inv) =>
      inv.id === id ? { ...inv, status: "revoked" as const } : inv,
    )
    onInvitationsChange(updated)
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
        description="Manage platform access invitations."
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-foreground/75 transition-colors hover:bg-white/[0.07] hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Invite User
          </button>
        }
      />

      {/* Invitations table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Email", "Role", "Artist", "Status", "Invited By", "Created", "Expires", "Actions"].map((h) => (
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
            {allInvitations.map((inv) => (
              <tr key={inv.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4 font-medium text-foreground/80">{inv.email}</td>
                <td className="py-2.5 pr-4 text-white/50">{ROLE_LABELS[inv.role]}</td>
                <td className="py-2.5 pr-4">
                  {inv.artistHandle ? (
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                      @{inv.artistHandle}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <AdminStatusBadge status={inv.status} />
                </td>
                <td className="py-2.5 pr-4 text-white/35">{inv.invitedBy}</td>
                <td className="py-2.5 pr-4 text-white/35">{inv.createdAt}</td>
                <td className="py-2.5 pr-4 text-white/35">{inv.expiresAt}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex gap-2 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    {inv.status === "pending" && (
                      <>
                        <button className="inline-flex items-center gap-1 text-[11px] text-white/42 hover:text-white/80">
                          <RefreshCw className="h-2.5 w-2.5" /> Resend
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-red-400/50 hover:text-red-400"
                        >
                          <X className="h-2.5 w-2.5" /> Revoke
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0e0e0e] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-foreground/90">Invite User</h3>
              <button onClick={handleClose} className="rounded p-0.5 text-white/30 hover:text-white/70">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.10em] text-white/40">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground outline-none placeholder:text-white/20 focus:border-accent/40"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.10em] text-white/40">
                    Role *
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
                    className="h-9 w-full appearance-none rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground outline-none focus:border-accent/40"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value} className="bg-[#111]">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Artist / Tenant */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.10em] text-white/40">
                    Artist / Tenant
                  </label>
                  <select
                    value={form.artistHandle}
                    onChange={(e) => setForm((f) => ({ ...f, artistHandle: e.target.value }))}
                    className="h-9 w-full appearance-none rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground outline-none focus:border-accent/40"
                  >
                    <option value="" className="bg-[#111]">None (platform-level)</option>
                    {MOCK_TENANTS.map((t) => (
                      <option key={t.handle} value={t.handle} className="bg-[#111]">
                        {t.artistName} (@{t.handle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.10em] text-white/40">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Internal note about this invite"
                    className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground outline-none placeholder:text-white/20 focus:border-accent/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex h-9 w-full items-center justify-center rounded-md bg-accent px-4 text-[12px] font-semibold uppercase tracking-[0.10em] text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting ? "Generating..." : "Generate Invite Link"}
                </button>
              </form>
            ) : (
              /* Generated link UI */
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-emerald-400/70">
                    Invite link generated
                  </p>
                  <p className="break-all font-mono text-[11px] text-white/55">{generatedLink}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex h-9 w-full items-center justify-center gap-2 rounded-md border px-4 text-[12px] font-semibold transition-colors",
                    copied
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.08] bg-white/[0.04] text-foreground/75 hover:bg-white/[0.08]",
                  )}
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                  )}
                </button>
                <p className="text-center text-[11px] text-white/30">
                  Invitation added to the table with status <strong className="text-white/50">Pending</strong>.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full text-center text-[12px] text-white/35 hover:text-white/60"
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
