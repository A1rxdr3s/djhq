"use client"

import { useState } from "react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { MOCK_FEATURE_FLAGS } from "@/lib/admin/mock-data"
import type { AdminFeatureFlag } from "@/types/admin"
import { cn } from "@/lib/utils"

const ENV_BADGES: Record<AdminFeatureFlag["environment"], string> = {
  production: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  staging:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  development:"bg-white/[0.04] text-white/30 border-white/[0.08]",
}

const TARGET_LABELS: Record<AdminFeatureFlag["rolloutTarget"], string> = {
  all:        "All",
  pro:        "Pro+",
  agency:     "Agency+",
  enterprise: "Enterprise",
  internal:   "Internal",
}

export function AdminFeatureFlags() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>(MOCK_FEATURE_FLAGS)

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

      <div className="overflow-hidden rounded-lg border border-white/[0.06]">
        {flags.map((flag, i) => (
          <div
            key={flag.key}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.02]",
              i > 0 && "border-t border-white/[0.04]",
            )}
          >
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-foreground/80">{flag.key}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.06em]",
                    ENV_BADGES[flag.environment],
                  )}
                >
                  {flag.environment}
                </span>
                <span className="text-[10px] text-white/28">
                  → {TARGET_LABELS[flag.rolloutTarget]}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/38">{flag.description}</p>
            </div>

            {/* Toggle — UI only for now */}
            <button
              onClick={() => toggle(flag.key)}
              role="switch"
              aria-checked={flag.enabled}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
                flag.enabled
                  ? "border-accent/50 bg-accent/20"
                  : "border-white/[0.12] bg-white/[0.05]",
              )}
              title="TODO: connect to real feature flag system"
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-200",
                  flag.enabled
                    ? "left-[18px] bg-accent"
                    : "left-0.5 bg-white/30",
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-white/20">
        {/* TODO: persist flag state to Supabase or a real feature flag service (LaunchDarkly, Unleash) */}
        Toggles are UI-only. State resets on navigation. Persistence coming in a future sprint.
      </p>
    </div>
  )
}
