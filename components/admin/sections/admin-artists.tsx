"use client"

import { Building2, ExternalLink } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import type { AdminRealData } from "@/types/admin"

interface AdminArtistsProps {
  realData: AdminRealData
}

export function AdminArtists({ realData }: AdminArtistsProps) {
  const { artists } = realData

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

  return (
    <div>
      <AdminSectionHeader
        title="Artists"
        description={`${artists.length} artist tenant${artists.length !== 1 ? "s" : ""} · ${artists.filter((a) => a.isPublished).length} published`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Artist", "Handle", "Plan", "Status", "Press Kit", "Location", "Created", "Updated", ""].map((h) => (
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
              {artists.map((artist) => (
                <tr key={artist.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{artist.artistName}</td>
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
                  <td className="px-4 py-2.5 text-slate-400">{artist.updatedAt}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-3 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                      <a
                        href={`/${artist.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-green-700"
                      >
                        Profile <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      {/* TODO: change plan, publish/unpublish — requires Supabase mutation */}
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
