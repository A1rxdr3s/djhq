import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionHeaderProps {
  children: ReactNode
  variant?: "primary" | "secondary"
}

export function SectionHeader({ children, variant = "secondary" }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <h2
        className={cn(
          "shrink-0 text-[12px] font-semibold uppercase tracking-[0.28em] xl:text-[14px] xl:tracking-[0.28em]",
          variant === "primary" ? "text-accent/90" : "text-accent/70",
        )}
      >
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
    </div>
  )
}
