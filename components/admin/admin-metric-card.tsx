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
        "rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
          {label}
        </p>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-white/20" />}
      </div>
      <p className="mt-2 text-[22px] font-bold leading-none tracking-tight text-foreground">
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            changeDir === "up" && "text-emerald-400",
            changeDir === "down" && "text-red-400",
            changeDir === "flat" && "text-white/30",
            !changeDir && "text-white/30",
          )}
        >
          {change}
        </p>
      )}
    </div>
  )
}
