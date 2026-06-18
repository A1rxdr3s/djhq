"use client"

import { useState } from "react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import type { AdminFeatureFlag } from "@/types/admin"
import { cn } from "@/lib/utils"

const ENV_BADGES: Record<AdminFeatureFlag["environment"], string> = {
  production:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  staging:     "bg-amber-50 text-amber-700 border-amber-200",
  development: "bg-slate-100 text-slate-500 border-slate-200",
}

const TARGET_LABELS: Record<AdminFeatureFlag["rolloutTarget"], string> = {
  all:        "All users",
  pro:        "Pro+",
  agency:     "Agency+",
  enterprise: "Enterprise",
  internal:   "Internal",
}

const PLATFORM_FLAGS: AdminFeatureFlag[] = [
  {
    key:           "press_kit_enabled",
    label:         "Press Kit",
    description:   "Enables the /presskit public page for artist profiles.",
    enabled:       true,
    rolloutTarget: "pro",
    environment:   "production",
  },
  {
    key:           "custom_domain",
    label:         "Custom Domain",
    description:   "Allows artists to map a custom domain to their profile.",
    enabled:       false,
    rolloutTarget: "pro",
    environment:   "development",
  },
  {
    key:           "booking_modal",
    label:         "Booking Modal",
    description:   "Enables the booking request modal on public artist pages.",
    enabled:       true,
    rolloutTarget: "all",
    environment:   "production",
  },
  {
    key:           "analytics_dashboard",
    label:         "Analytics Dashboard",
    description:   "Shows visit and engagement data in the HQ dashboard.",
    enabled:       false,
    rolloutTarget: "pro",
    environment:   "development",
  },
  {
    key:           "agency_multi_artist",
    label:         "Multi-Artist (Agency)",
    description:   "Allows agency tenants to manage multiple artist profiles.",
    enabled:       false,
    rolloutTarget: "agency",
    environment:   "staging",
  },
  {
    key:           "admin_panel",
    label:         "Admin Panel",
    description:   "Enables the /admin internal control center.",
    enabled:       true,
    rolloutTarget: "internal",
    environment:   "production",
  },
]

export function AdminFeatureFlags() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>(PLATFORM_FLAGS)

  function toggle(key: string) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
    )
  }

  return (
    <div>
      <AdminSectionHeader
        title="Feature Flags"
        description="Toggle platform features and control rollout targets."
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
        <p className="text-[11px] text-amber-700">
          Toggles are UI-only — state resets on navigation.
          {/* TODO: persist flag state to Supabase or a feature flag service (LaunchDarkly, Unleash) */}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {flags.map((flag, i) => (
          <div
            key={flag.key}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-slate-50",
              i > 0 && "border-t border-slate-100",
            )}
          >
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-slate-800">{flag.key}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.06em]",
                    ENV_BADGES[flag.environment],
                  )}
                >
                  {flag.environment}
                </span>
                <span className="text-[10px] text-slate-400">
                  → {TARGET_LABELS[flag.rolloutTarget]}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{flag.description}</p>
            </div>

            {/* Toggle */}
            <button
              onClick={() => toggle(flag.key)}
              role="switch"
              aria-checked={flag.enabled}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
                flag.enabled
                  ? "border-green-400 bg-green-500"
                  : "border-slate-300 bg-slate-200",
              )}
              title="UI-only toggle — not persisted"
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200",
                  flag.enabled ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
