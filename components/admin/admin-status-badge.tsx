import { cn } from "@/lib/utils"

// Light-mode status badge — does not rely on dark CSS variables.
type StatusValue = string

const STATUS_STYLES: Record<string, string> = {
  // User/auth
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  invited:   "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  trial:     "bg-amber-50 text-amber-700 border-amber-200",
  churned:   "bg-slate-100 text-slate-500 border-slate-200",
  // Publish
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-500 border-slate-200",
  // Subscription
  trialing:  "bg-amber-50 text-amber-700 border-amber-200",
  past_due:  "bg-red-50 text-red-700 border-red-200",
  canceled:  "bg-slate-100 text-slate-500 border-slate-200",
  paused:    "bg-orange-50 text-orange-700 border-orange-200",
  // Payment
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  refunded:  "bg-purple-50 text-purple-700 border-purple-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  // Invitation
  accepted:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired:   "bg-slate-100 text-slate-500 border-slate-200",
  revoked:   "bg-red-50 text-red-700 border-red-200",
  // Booking lead
  new:       "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined:  "bg-red-50 text-red-700 border-red-200",
  converted: "bg-green-50 text-green-700 border-green-200",
  // Ticket
  open:        "bg-red-50 text-red-700 border-red-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved:    "bg-slate-100 text-slate-500 border-slate-200",
  // Plan
  free:       "bg-slate-100 text-slate-500 border-slate-200",
  starter:    "bg-blue-50 text-blue-700 border-blue-200",
  pro:        "bg-green-50 text-green-700 border-green-200",
  agency:     "bg-purple-50 text-purple-700 border-purple-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
}

const STATUS_LABELS: Record<string, string> = {
  active:      "Active",
  invited:     "Invited",
  suspended:   "Suspended",
  trial:       "Trial",
  churned:     "Churned",
  published:   "Published",
  draft:       "Draft",
  trialing:    "Trialing",
  past_due:    "Past Due",
  canceled:    "Canceled",
  paused:      "Paused",
  paid:        "Paid",
  failed:      "Failed",
  refunded:    "Refunded",
  pending:     "Pending",
  accepted:    "Accepted",
  expired:     "Expired",
  revoked:     "Revoked",
  new:         "New",
  contacted:   "Contacted",
  qualified:   "Qualified",
  declined:    "Declined",
  converted:   "Converted",
  open:        "Open",
  in_progress: "In Progress",
  resolved:    "Resolved",
  free:        "Free",
  starter:     "Starter",
  pro:         "Pro",
  agency:      "Agency",
  enterprise:  "Enterprise",
}

interface AdminStatusBadgeProps {
  status: StatusValue
  className?: string
}

export function AdminStatusBadge({ status, className }: AdminStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500 border-slate-200"
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
        style,
        className,
      )}
    >
      {label}
    </span>
  )
}
