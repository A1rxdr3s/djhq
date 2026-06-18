"use client"

import { useState, type FormEvent } from "react"
import { Copy, Check, X, RefreshCw, Plus, Mail, ExternalLink } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { createInvitation, revokeInvitation, deleteInvitation } from "@/app/actions/admin-invitations"
import type { DbAdminInvitation, AdminRealArtist, AdminUserRole, LicenseDuration } from "@/types/admin"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

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

const LICENSE_OPTIONS: { value: LicenseDuration; label: string }[] = [
  { value: "one_month",    label: "1 month" },
  { value: "three_months", label: "3 months" },
  { value: "six_months",   label: "6 months" },
  { value: "one_year",     label: "1 year" },
  { value: "lifetime",     label: "Lifetime Access" },
]

const LICENSE_LABELS: Record<LicenseDuration, string> = {
  one_month:    "1 month",
  three_months: "3 months",
  six_months:   "6 months",
  one_year:     "1 year",
  lifetime:     "Lifetime Access",
}

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  email:           "",
  role:            "artist_owner" as AdminUserRole,
  artistHandle:    "",
  licenseDuration: "one_year" as LicenseDuration,
  note:            "",
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy Link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] transition-colors",
        copied ? "text-emerald-600" : "text-slate-500 hover:text-slate-800",
      )}
    >
      {copied ? <><Check className="h-2.5 w-2.5" /> Copied</> : <><Copy className="h-2.5 w-2.5" /> {label}</>}
    </button>
  )
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

interface DeleteInviteModalProps {
  invitation: DbAdminInvitation
  onConfirm: () => Promise<void>
  onClose: () => void
  isDeleting: boolean
  error: string | null
}

function DeleteInviteModal({ invitation, onConfirm, onClose, isDeleting, error }: DeleteInviteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900">Delete Invitation</h3>
          <button onClick={onClose} disabled={isDeleting} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-md bg-slate-50 px-3 py-2.5 mb-3 space-y-1">
          <p className="text-[13px] font-semibold text-slate-800">{invitation.email}</p>
          <p className="text-[11px] text-slate-500">
            {ROLE_LABELS[invitation.role]} · {LICENSE_LABELS[invitation.licenseDuration]}
          </p>
        </div>

        <p className="text-[12px] text-slate-600 mb-4">
          This will permanently remove the invitation record from the database.
          {invitation.status === "pending" && (
            <> The invite link will immediately become invalid.</>
          )}
          {" "}This action cannot be undone.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdminInvitationsProps {
  initialInvitations: DbAdminInvitation[]
  realArtists: AdminRealArtist[]
}

export function AdminInvitations({ initialInvitations, realArtists }: AdminInvitationsProps) {
  const [invitations, setInvitations] = useState<DbAdminInvitation[]>(initialInvitations)
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState(DEFAULT_FORM)
  const [generatedInvite, setGeneratedInvite] = useState<DbAdminInvitation | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [revoking, setRevoking]       = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DbAdminInvitation | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await createInvitation({
      email:           form.email.trim(),
      role:            form.role,
      artistHandle:    form.artistHandle,
      licenseDuration: form.licenseDuration,
      note:            form.note,
    })

    if (result.success && result.invitation) {
      setInvitations((prev) => [result.invitation!, ...prev])
      setGeneratedInvite(result.invitation)
    } else {
      setSubmitError(result.error ?? "Failed to create invitation.")
    }
    setSubmitting(false)
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    setRevokeError(null)
    const result = await revokeInvitation(id)
    if (result.success) {
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? { ...inv, status: "revoked" as const, revokedAt: new Date().toISOString().slice(0, 10) }
            : inv,
        ),
      )
    } else {
      setRevokeError(result.error ?? "Revoke failed.")
    }
    setRevoking(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteInvitation(deleteTarget.id)
    if (result.success) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      setDeleteError(result.error ?? "Delete failed.")
    }
    setIsDeleting(false)
  }

  function handleClose() {
    setShowModal(false)
    setGeneratedInvite(null)
    setSubmitError(null)
    setForm(DEFAULT_FORM)
  }

  const labelField = (text: string, required = false) => (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {text}{required && " *"}
    </label>
  )

  const inputCls = "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
  const selectCls = "h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"

  return (
    <div>
      <AdminSectionHeader
        title="Invitations"
        description={`${invitations.length} invitation${invitations.length !== 1 ? "s" : ""} · database-backed`}
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

      {revokeError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-[11px] text-red-700">{revokeError}</p>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center">
          <Mail className="mx-auto mb-3 h-7 w-7 text-slate-300" />
          <p className="text-[13px] font-medium text-slate-600">No invitations yet</p>
          <p className="mt-1 text-[12px] text-slate-400">
            Create your first invitation link to invite artists, editors, or platform users.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Email", "Role", "Artist", "License", "License Expires", "Invite Expires", "Status", "Created", ""].map((h) => (
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
                    <td className="px-4 py-2.5 text-slate-600">{LICENSE_LABELS[inv.licenseDuration]}</td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {inv.licenseExpiresAt ?? (
                        <span className="text-emerald-600 font-medium">Lifetime</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{inv.expiresAt ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <AdminStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{inv.createdAt}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                        {/* Copy invite link */}
                        {inv.inviteUrl && inv.status === "pending" && (
                          <CopyButton text={inv.inviteUrl} />
                        )}
                        {/* View invite page */}
                        {inv.inviteUrl && (
                          <a
                            href={inv.inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {/* Resend placeholder */}
                        {inv.status === "pending" && (
                          <button
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 cursor-not-allowed"
                            title="Resend — TODO: email integration"
                            disabled
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Resend
                          </button>
                        )}
                        {/* Revoke — pending only */}
                        {inv.status === "pending" && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revoking === inv.id}
                            className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 disabled:opacity-40"
                          >
                            <X className="h-2.5 w-2.5" />
                            {revoking === inv.id ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                        {/* Delete — available for all statuses */}
                        <button
                          onClick={() => { setDeleteTarget(inv); setDeleteError(null) }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-800"
                          title="Permanently delete this invitation record"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteInviteModal
          invitation={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
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

            {!generatedInvite ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  {labelField("Email", true)}
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className={inputCls}
                  />
                </div>

                {/* Role */}
                <div>
                  {labelField("Role", true)}
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
                    className={selectCls}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Artist / Tenant */}
                <div>
                  {labelField("Artist / Tenant")}
                  <select
                    value={form.artistHandle}
                    onChange={(e) => setForm((f) => ({ ...f, artistHandle: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">None (platform-level)</option>
                    {realArtists.map((a) => (
                      <option key={a.handle} value={a.handle}>
                        {a.artistName} (@{a.handle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* License Duration */}
                <div>
                  {labelField("License Duration", true)}
                  <select
                    value={form.licenseDuration}
                    onChange={(e) => setForm((f) => ({ ...f, licenseDuration: e.target.value as LicenseDuration }))}
                    className={selectCls}
                  >
                    {LICENSE_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {form.licenseDuration === "lifetime"
                      ? "Invited user will have permanent access with no expiry."
                      : `Invited user's access expires ${LICENSE_LABELS[form.licenseDuration]} after accepting.`}
                  </p>
                </div>

                {/* Note */}
                <div>
                  {labelField("Note (optional)")}
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Internal note about this invite"
                    className={inputCls}
                  />
                </div>

                {submitError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-[11px] text-red-700">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create Invitation"}
                </button>
              </form>
            ) : (
              /* ── Generated invite ── */
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                    Invitation created
                  </p>
                  <p className="break-all font-mono text-[11px] text-emerald-800">{generatedInvite.inviteUrl}</p>
                </div>

                {/* License info summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
                  <span className="font-semibold">License:</span> {LICENSE_LABELS[generatedInvite.licenseDuration]}
                  {generatedInvite.licenseExpiresAt && (
                    <> · expires {generatedInvite.licenseExpiresAt}</>
                  )}
                  {generatedInvite.licenseDuration === "lifetime" && (
                    <span className="ml-1 text-emerald-600 font-medium">· no expiry</span>
                  )}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInvite.inviteUrl)
                  }}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Invite Link
                </button>

                <p className="text-center text-[11px] text-slate-500">
                  Invitation link expires in <strong>7 days</strong>. License duration begins on acceptance.
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
