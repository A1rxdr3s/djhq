"use client"

import { createContext, useContext, useState } from "react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export type MobileTab = "home" | "music" | "live" | "media" | "community"

// ─── Context ─────────────────────────────────────────────────────────────────
// Kept for backward compat — no longer drives visibility.

type TabContextValue = {
  activeTab: MobileTab
  setActiveTab: (tab: MobileTab) => void
}

const MobileTabContext = createContext<TabContextValue>({
  activeTab: "home",
  setActiveTab: () => {},
})

export function useMobileTab() {
  return useContext(MobileTabContext)
}

// ─── Provider / Manager ──────────────────────────────────────────────────────

export function MobileTabManager({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<MobileTab>("home")

  return (
    <MobileTabContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </MobileTabContext.Provider>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

/**
 * Wraps a page section.
 *
 * On desktop (≥ lg): always visible — `className` forwards grid-placement classes.
 * On mobile (< lg):  always visible — content is no longer tab-gated.
 *                    Pass `id` to register the section as a scroll-nav anchor.
 */
export function MobileSection(props: {
  tab: MobileTab | MobileTab[]
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const { children, className, id } = props
  return (
    <div id={id} className={cn(className, id && "scroll-mt-16")}>
      {children}
    </div>
  )
}

// ─── Archive toggle ───────────────────────────────────────────────────────────

/**
 * Wraps secondary archive content on mobile with a progressive-disclosure toggle.
 * On desktop: always visible.
 */
export function MobileArchive({
  label = "View All",
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden flex w-full items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 transition-colors duration-150 hover:text-foreground/55"
      >
        {open ? "Collapse" : label}
        <span className="text-accent/50">{open ? "↑" : "↓"}</span>
      </button>

      <div className={cn("lg:block", !open && "max-lg:hidden")}>
        {children}
      </div>
    </>
  )
}
