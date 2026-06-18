"use client"

import { useState } from "react"
import { Building2, ExternalLink, X, AlertTriangle, Archive } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { setArtistPublished, deleteArtist } from "@/app/actions/admin-artist-actions"
import type { AdminRealArtist, AdminRealData } from "@/types/admin"
import { cn } from "@/lib/utils"

// Handles that receive extra protection in the UI — no archive/delete available.
const PROTECTED_HANDLES = ["andresherrera"]

// ─── Archive modal ─────────────────────────────────────────────────────────────

interface ArchiveModalProps {
  artist: AdminRealArtist
  onConfirm: () => Promise<void>
  onClose: () => void
  isWorking: boolean
  error: string | null
}

function ArchiveModal({ artist, onConfirm, onClose, isWorking, error }: ArchiveModalProps) {
  const action = artist.isPublished ? "Unpublish" : "Restore"
  const actionDesc = artist.isPublished
    ? "hide this artist's public profile"
    : "restore this artist's public profile"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Archive className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900">{action} Artist</h3>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[13px] text-slate-600">
          This will {actionDesc}:
        </p>
        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2.5">
          <p className="text-[13px] font-semibold text-slate-800">{artist.artistName}</p>
          <p className="font-mono text-[11px] text-slate-400">@{artist.handle}</p>
        </div>

        {artist.isPublished ? (
          <p className="mt-3 text-[12px] text-slate-500">
            The public profile at <code className="font-mono text-[11px]">/{artist.handle}</code> will
            return a 404. The artist record, press kit, shows, and releases are preserved and
            can be restored at any time.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-slate-500">
            The public profile at <code className="font-mono text-[11px]">/{artist.handle}</code> will
            become accessible again. All data is intact.
          </p>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={isWorking}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isWorking}
            className="flex-1 rounded-md bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {isWorking ? "Working…" : action}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete modal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  artist: AdminRealArtist
  onConfirm: () => Promise<void>
  onClose: () => void
  isWorking: boolean
  error: string | null
}

function DeleteModal({ artist, onConfirm, onClose, isWorking, error }: DeleteModalProps) {
  const [typed, setTyped] = useState("")
  const expected = `DELETE ${artist.handle}`
  const confirmed = typed === expected

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900">Delete Artist</h3>
          </div>
          <button onClick={onClose} disabled={isWorking} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-md bg-slate-50 px-3 py-2.5 mb-3">
          <p className="text-[13px] font-semibold text-slate-800">{artist.artistName}</p>
          <p className="font-mono text-[11px] text-slate-400">@{artist.handle}</p>
        </div>

        <p className="text-[12px] font-semibold text-red-700 mb-2">
          This action cannot be undone. The following will be permanently deleted:
        </p>
        <ul className="mb-4 space-y-0.5">
          {[
            "Public artist profile",
            "Press kit and all download links",
            "Shows and gig history",
            "Releases and DJ sets",
            "Gallery images and videos",
            "Brand assets and logos",
            "Social links",
            "Custom domain configuration",
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="text-red-400">·</span> {item}
            </li>
          ))}
        </ul>

        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold text-slate-600">
            Type <span className="font-mono text-red-600">{expected}</span> to confirm:
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
            autoFocus
            className={cn(
              "h-9 w-full rounded-md border px-3 font-mono text-[12px] outline-none transition-colors",
              confirmed
                ? "border-red-400 bg-red-50 text-red-800 focus:ring-1 focus:ring-red-400"
                : "border-slate-300 bg-white text-slate-800 focus:border-slate-400 focus:ring-1 focus:ring-slate-300",
            )}
          />
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isWorking}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || isWorking}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isWorking ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────

interface AdminArtistsProps {
  realData: AdminRealData
}

export function AdminArtists({ realData }: AdminArtistsProps) {
  const [artists, setArtists] = useState<AdminRealArtist[]>(realData.artists)

  const [archiveTarget, setArchiveTarget] = useState<AdminRealArtist | null>(null)
  const [archiveWorking, setArchiveWorking] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<AdminRealArtist | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    setArchiveWorking(true)
    setArchiveError(null)

    const result = await setArtistPublished(archiveTarget.id, !archiveTarget.isPublished)
    if (result.success) {
      setArtists((prev) =>
        prev.map((a) =>
          a.id === archiveTarget.id ? { ...a, isPublished: !archiveTarget.isPublished } : a,
        ),
      )
      setArchiveTarget(null)
    } else {
      setArchiveError(result.error ?? "Action failed.")
    }
    setArchiveWorking(false)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteWorking(true)
    setDeleteError(null)

    const result = await deleteArtist(deleteTarget.id, deleteTarget.handle)
    if (result.success) {
      setArtists((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      setDeleteError(result.error ?? "Deletion failed.")
    }
    setDeleteWorking(false)
  }

  if (artists.length === 0) {
    return (
      <div>
        <AdminSectionHeader title="Artists" description="All artist tenants on the platform." />
        <AdminEmptyState
          icon={Building2}
          title="No artist tenants found"
          description="Artists will appear here once Supabase is connected and service role key is configured."
          todo="TODO: supabase.from('artists').select(*) — service role required for all tenants"
        />
      </div>
    )
  }

  const publishedCount = artists.filter((a) => a.isPublished).length

  return (
    <div>
      <AdminSectionHeader
        title="Artists"
        description={`${artists.length} artist tenant${artists.length !== 1 ? "s" : ""} · ${publishedCount} published`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Artist", "Handle", "Plan", "Status", "Press Kit", "Location", "Created", "Actions"].map((h) => (
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
              {artists.map((artist) => {
                const isProtected = PROTECTED_HANDLES.includes(artist.handle)
                return (
                  <tr key={artist.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{artist.artistName}</span>
                        {isProtected && (
                          <span className="rounded-full border border-green-200 bg-green-50 px-1.5 py-0 text-[9px] font-semibold text-green-700">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] text-slate-400">@{artist.handle}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminStatusBadge status={artist.plan} />
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminStatusBadge status={artist.isPublished ? "published" : "draft"} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium ${artist.pressKitEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                        {artist.pressKitEnabled ? "Enabled" : "Off"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{artist.location || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{artist.createdAt}</td>

                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {/* View public profile — always available */}
                        <a
                          href={`/${artist.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-green-700"
                          title="View public profile"
                        >
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </a>

                        {/* HQ dashboard — only accessible to artist owner, link to /hq */}
                        <a
                          href="/hq"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                          title="Open artist dashboard (HQ)"
                        >
                          HQ <ExternalLink className="h-2.5 w-2.5" />
                        </a>

                        {/* Archive / Restore */}
                        {isProtected ? (
                          <span
                            className="text-[11px] text-slate-300 cursor-not-allowed"
                            title="Protected artist — archive disabled"
                          >
                            {artist.isPublished ? "Archive" : "Restore"}
                          </span>
                        ) : (
                          <button
                            onClick={() => { setArchiveTarget(artist); setArchiveError(null) }}
                            className="text-[11px] text-amber-600 hover:text-amber-800"
                            title={artist.isPublished ? "Unpublish (archive) artist" : "Restore artist"}
                          >
                            {artist.isPublished ? "Archive" : "Restore"}
                          </button>
                        )}

                        {/* Delete */}
                        {isProtected ? (
                          <span
                            className="text-[11px] text-slate-300 cursor-not-allowed"
                            title="Hard delete disabled — primary production artist"
                          >
                            Delete
                          </span>
                        ) : (
                          <button
                            onClick={() => { setDeleteTarget(artist); setDeleteError(null) }}
                            className="text-[11px] text-red-500 hover:text-red-700"
                            title="Delete artist permanently"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cascade notice */}
      <p className="mt-2.5 text-[10px] text-slate-400">
        Deleting an artist permanently removes all associated data: gigs, releases, DJ sets, gallery, brand assets, social links, and custom domain — via database cascade. This cannot be undone.
      </p>

      {/* Archive modal */}
      {archiveTarget && (
        <ArchiveModal
          artist={archiveTarget}
          onConfirm={handleArchiveConfirm}
          onClose={() => { setArchiveTarget(null); setArchiveError(null) }}
          isWorking={archiveWorking}
          error={archiveError}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          artist={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
          isWorking={deleteWorking}
          error={deleteError}
        />
      )}
    </div>
  )
}
