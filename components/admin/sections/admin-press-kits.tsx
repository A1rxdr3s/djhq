"use client"

import { FolderOpen } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export function AdminPressKits() {
  return (
    <div>
      <AdminSectionHeader
        title="Press Kits"
        description="Asset download activity across all artists."
      />

      {/* Explains why empty */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[12px] font-medium text-slate-700">Download tracking not yet implemented</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Press kit asset links point directly to external URLs (Google Drive, Dropbox, etc.).
          Click events are not captured, so download counts cannot be reported here.
          {/* TODO: proxy downloads through a server action, log events to a download_events table */}
        </p>
      </div>

      <AdminEmptyState
        icon={FolderOpen}
        title="No download data available"
        description="Press kit analytics will appear once download events are tracked via a server action and stored in Supabase."
        todo="TODO: download_events table + server action proxy"
      />
    </div>
  )
}
