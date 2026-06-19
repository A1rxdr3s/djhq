import type { ReactNode } from "react"

type Props = {
  title: string
  description?: string
  action?: ReactNode
  zone?: string
}

export function HqPageHeader({ title, description, action, zone }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        {zone && (
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.28em] text-muted-foreground/28">
            {zone}
          </p>
        )}
        <h2 className="text-[15px] font-black uppercase tracking-tight text-foreground/85">{title}</h2>
        {description && (
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/50">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
