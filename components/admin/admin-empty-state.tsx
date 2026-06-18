import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AdminEmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  todo?: string
  className?: string
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  todo,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mx-auto mb-4 h-8 w-8 text-slate-300" />}
      <p className="text-[14px] font-medium text-slate-700">{title}</p>
      <p className="mt-1.5 text-[13px] text-slate-400">{description}</p>
      {todo && (
        <p className="mt-4 font-mono text-[10px] text-slate-300">{todo}</p>
      )}
    </div>
  )
}
