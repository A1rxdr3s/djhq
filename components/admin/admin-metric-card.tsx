import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AdminMetricCardProps {
  label: string
  value: string | number
  change?: string
  changeDir?: "up" | "down" | "flat"
  icon?: LucideIcon
  className?: string
}

export function AdminMetricCard({
  label,
  value,
  change,
  changeDir,
  icon: Icon,
  className,
}: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">
          {label}
        </p>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
      </div>
      <p className="mt-2 text-[24px] font-bold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            changeDir === "up" && "text-emerald-600",
            changeDir === "down" && "text-red-600",
            (!changeDir || changeDir === "flat") && "text-slate-400",
          )}
        >
          {change}
        </p>
      )}
    </div>
  )
}
