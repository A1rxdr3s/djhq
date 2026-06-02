"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { id: "shows",       label: "Shows"       },
  { id: "music",       label: "Music"       },
  { id: "performance", label: "Performance" },
  { id: "media",       label: "Media"       },
  { id: "contact",     label: "Contact"     },
] as const

export function MobileScrollNav() {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    // 48px sticky nav height + 8px buffer
    const OFFSET = 56

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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/[0.97] backdrop-blur-sm lg:hidden"
    >
      <div className="flex h-12 items-center overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map(({ id, label }) => {
          const isActive = activeId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className={cn(
                "relative flex h-full shrink-0 items-center px-3.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-150",
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
