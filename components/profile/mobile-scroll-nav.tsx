"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { MOBILE_PUBLIC_NAV } from "@/lib/public-nav"

const SECTIONS = MOBILE_PUBLIC_NAV

export function MobileScrollNav() {
  const [activeId, setActiveId]     = useState<string>("")
  const [heroExited, setHeroExited] = useState(false)

  // Track which section is active for the underline indicator
  useEffect(() => {
    const OFFSET = 56 // 48px nav height + 8px buffer

    const update = () => {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= OFFSET) {
          setActiveId(SECTIONS[i].id)
          return
        }
      }
      setActiveId("")
    }

    window.addEventListener("scroll", update, { passive: true })
    update()
    return () => window.removeEventListener("scroll", update)
  }, [])

  // Show sticky nav only after the hero section fully exits the viewport.
  // Handles both the normal scroll path and direct anchor navigation.
  useEffect(() => {
    const hero = document.getElementById("hero")
    if (!hero) {
      setHeroExited(true) // no hero found — always show
      return
    }

    // Sync check so users who navigate directly to a section don't see a flash
    if (hero.getBoundingClientRect().bottom <= 0) setHeroExited(true)

    const observer = new IntersectionObserver(
      ([entry]) => setHeroExited(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "sticky top-0 z-40 border-b border-white/[0.06] bg-background/[0.97] backdrop-blur-sm lg:hidden",
        "transition-opacity duration-200",
        heroExited ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <div className="grid h-12 grid-cols-4 items-center">
        {SECTIONS.map(({ id, label }) => {
          const isActive = activeId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className={cn(
                "relative flex h-full w-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.06em] transition-colors duration-150",
                isActive ? "text-accent" : "text-white/38 hover:text-white/65",
              )}
            >
              {label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-accent"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
