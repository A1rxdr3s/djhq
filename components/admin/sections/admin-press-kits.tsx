"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { MOCK_PRESS_KIT_ACTIVITY } from "@/lib/admin/mock-data"

const ASSET_TYPE_COLORS: Record<string, string> = {
  PDF:    "bg-accent/10 text-accent/70 border-accent/20",
  Photos: "bg-blue-500/10 text-blue-400/80 border-blue-500/20",
  Logos:  "bg-purple-500/10 text-purple-400/80 border-purple-500/20",
  Bio:    "bg-white/[0.05] text-white/45 border-white/[0.10]",
  Rider:  "bg-amber-500/10 text-amber-400/80 border-amber-500/20",
}

export function AdminPressKits() {
  const totalDownloads = MOCK_PRESS_KIT_ACTIVITY.reduce((s, a) => s + a.downloads, 0)

  return (
    <div>
      <AdminSectionHeader
        title="Press Kits"
        description={`${totalDownloads} total asset downloads across all artists.`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Artist", "Downloads", "Last Downloaded", "Language", "Asset Type", "Source"].map((h) => (
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
            {MOCK_PRESS_KIT_ACTIVITY.map((activity) => (
              <tr key={activity.id} className="group hover:bg-white/[0.015]">
                <td className="py-2.5 pr-4 font-semibold text-foreground/80">{activity.artistName}</td>
                <td className="py-2.5 pr-4 font-semibold text-foreground/75">{activity.downloads}</td>
                <td className="py-2.5 pr-4 text-white/40">{activity.lastDownloadedAt}</td>
                <td className="py-2.5 pr-4 text-white/45">{activity.language}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${ASSET_TYPE_COLORS[activity.assetType] ?? "text-white/30"}`}
                  >
                    {activity.assetType}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-white/38">{activity.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-white/20">
        {/* TODO: track real download events and store in Supabase */}
        Press kit analytics will be tracked via download events in a future sprint.
      </p>
    </div>
  )
}
