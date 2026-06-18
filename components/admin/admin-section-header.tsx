import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AdminSectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function AdminSectionHeader({
  title,
  description,
  action,
  className,
}: AdminSectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pb-5", className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
