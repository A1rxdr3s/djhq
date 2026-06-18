"use client"

import {
  Building2, Users, CheckCircle, TrendingUp,
  Inbox, FolderOpen, ArrowUpRight,
} from "lucide-react"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import type { AdminRealData } from "@/types/admin"

interface AdminOverviewProps {
  realData: AdminRealData
}

export function AdminOverview({ realData }: AdminOverviewProps) {
  const { artists, authUsers, totalGigs, totalReleases } = realData

  const totalArtists = artists.length
  const publishedArtists = artists.filter((a) => a.isPublished).length
  const proArtists = artists.filter((a) => a.plan === "pro" || a.plan === "agency").length
  const pressKitEnabled = artists.filter((a) => a.pressKitEnabled).length

  return (
    <div>
      <AdminSectionHeader
        title="Platform Overview"
        description={`Real data · fetched at ${realData.fetchedAt.slice(11, 16)} UTC`}
      />

      {/* Artist metrics */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Artists</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminMetricCard label="Total Artists"    value={totalArtists}     icon={Building2}  />
        <AdminMetricCard label="Published"        value={publishedArtists} icon={CheckCircle} />
        <AdminMetricCard label="Pro / Agency"     value={proArtists}       icon={TrendingUp}  />
        <AdminMetricCard label="Press Kit On"     value={pressKitEnabled}  icon={FolderOpen}  />
      </div>

      {/* User metrics */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Users</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminMetricCard label="Auth Users"  value={authUsers.length}  icon={Users} />
        <AdminMetricCard label="Gigs"        value={totalGigs}         icon={Inbox} />
        <AdminMetricCard label="Releases"    value={totalReleases}     icon={TrendingUp} />
        <AdminMetricCard
          label="Revenue"
          value="—"
          change="Stripe not connected"
          changeDir="flat"
        />
      </div>

      {/* Artists breakdown table */}
      {artists.length > 0 ? (
        <>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Artist Tenants</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Artist", "Handle", "Plan", "Published", "Press Kit", "Created"].map((h) => (
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
                {artists.slice(0, 8).map((artist) => (
                  <tr key={artist.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{artist.artistName}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] text-slate-400">@{artist.handle}</span>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-600">{artist.plan}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium ${artist.isPublished ? "text-emerald-600" : "text-slate-400"}`}>
                        {artist.isPublished ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium ${artist.pressKitEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                        {artist.pressKitEnabled ? "On" : "Off"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{artist.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-center">
          <Building2 className="mx-auto mb-3 h-7 w-7 text-slate-300" />
          <p className="text-[13px] font-medium text-slate-600">No artist data available</p>
          <p className="mt-1 text-[12px] text-slate-400">
            Supabase service role key may not be configured.
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href="/andresherrera"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <div>
            <p className="text-[12px] font-medium text-slate-700">ANDRES:HERRERA — Public Profile</p>
            <p className="text-[11px] text-slate-400">/andresherrera</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-green-600" />
        </a>
        <a
          href="/hq"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <div>
            <p className="text-[12px] font-medium text-slate-700">Artist Dashboard (HQ)</p>
            <p className="text-[11px] text-slate-400">/hq</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-green-600" />
        </a>
      </div>
    </div>
  )
}
