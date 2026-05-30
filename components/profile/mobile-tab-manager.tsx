"use client"

import { createContext, useContext, useState } from "react"
import { Home, Music2, Zap, ImageIcon, Users } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export type MobileTab = "home" | "music" | "live" | "media" | "community"

// ─── Context ─────────────────────────────────────────────────────────────────

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
      {/* Extra bottom padding on mobile so content clears the fixed nav */}
      <div className="lg:pb-0" style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </div>
      <MobileBottomNav />
    </MobileTabContext.Provider>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

/**
 * Wraps a page section with mobile tab visibility.
 *
 * On desktop (≥ lg):  always visible — `className` is applied as-is.
 * On mobile (< lg):   visible only when the active tab matches `tab`.
 *
 * Pass `className` to forward desktop grid-placement classes (e.g.
 * `lg:col-start-2 lg:row-start-1`) — they attach to the wrapper div so the
 * grid structure is preserved even though individual children are hidden.
 */
export function MobileSection({
  tab,
  children,
  className,
}: {
  tab: MobileTab | MobileTab[]
  children: React.ReactNode
  className?: string
}) {
  const { activeTab } = useMobileTab()
  const tabs = Array.isArray(tab) ? tab : [tab]
  const isActive = tabs.includes(activeTab)

  return (
    <div className={cn(className, !isActive && "max-lg:hidden")}>
      {children}
    </div>
  )
}

// ─── Archive toggle ───────────────────────────────────────────────────────────

/**
 * Wraps a performance archive block (secondary videos / selected sets).
 * On desktop: always visible.
 * On mobile: hidden by default, expandable via "View All" button.
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
      {/* Toggle button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden flex w-full items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 transition-colors duration-150 hover:text-foreground/55"
      >
        {open ? "Collapse" : label}
        <span className="text-accent/50">{open ? "↑" : "↓"}</span>
      </button>

      {/* Archive content */}
      <div className={cn("lg:block", !open && "max-lg:hidden")}>
        {children}
      </div>
    </>
  )
}

// ─── Bottom navigation ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { tab: "home" as MobileTab, label: "Home", Icon: Home },
  { tab: "music" as MobileTab, label: "Music", Icon: Music2 },
  { tab: "live" as MobileTab, label: "Live", Icon: Zap },
  { tab: "media" as MobileTab, label: "Media", Icon: ImageIcon },
  { tab: "community" as MobileTab, label: "More", Icon: Users },
] as const

function MobileBottomNav() {
  const { activeTab, setActiveTab } = useMobileTab()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="border-t border-white/[0.06] bg-[#0a0a0a]/96 backdrop-blur-md">
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ tab, label, Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 transition-colors duration-200",
                activeTab === tab
                  ? "text-accent"
                  : "text-foreground/28 hover:text-foreground/50",
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={activeTab === tab ? 2 : 1.5}
              />
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em]">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
