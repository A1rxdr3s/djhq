import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionHeaderProps {
  children: ReactNode
  variant?: "primary" | "secondary"
}

export function SectionHeader({ children, variant = "secondary" }: SectionHeaderProps) {
  return (
    <h2
      className={cn(
        "text-[12px] font-bold uppercase tracking-[0.22em] xl:text-[14px]",
        variant === "primary" ? "text-accent/90" : "text-accent/65",
      )}
    >
      {children}
    </h2>
  )
}
