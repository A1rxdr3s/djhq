import { cn } from "@/lib/utils"
import type {
  AdminUserStatus,
  AdminPublishStatus,
  AdminInvitationStatus,
  AdminSubscriptionStatus,
  AdminPaymentStatus,
  AdminBookingLeadStatus,
  AdminTicketStatus,
} from "@/types/admin"

type StatusValue =
  | AdminUserStatus
  | AdminPublishStatus
  | AdminInvitationStatus
  | AdminSubscriptionStatus
  | AdminPaymentStatus
  | AdminBookingLeadStatus
  | AdminTicketStatus

const STATUS_STYLES: Record<string, string> = {
  // User
  active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  invited:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  trial:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  churned:   "bg-white/[0.04] text-white/30 border-white/[0.08]",
  // Publish
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  draft:     "bg-white/[0.04] text-white/30 border-white/[0.08]",
  // Subscription
  trialing:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  past_due:  "bg-red-500/10 text-red-400 border-red-500/20",
  canceled:  "bg-white/[0.04] text-white/30 border-white/[0.08]",
  paused:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  // Payment
  paid:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed:    "bg-red-500/10 text-red-400 border-red-500/20",
  refunded:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  // Invitation
  accepted:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expired:   "bg-white/[0.04] text-white/30 border-white/[0.08]",
  revoked:   "bg-red-500/10 text-red-400 border-red-500/20",
  // Booking lead
  new:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  qualified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  declined:  "bg-red-500/10 text-red-400 border-red-500/20",
  converted: "bg-accent/10 text-accent border-accent/20",
  // Ticket
  open:        "bg-red-500/10 text-red-400 border-red-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  resolved:    "bg-white/[0.04] text-white/30 border-white/[0.08]",
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
  pending_invitation: "Pending",
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
}

interface AdminStatusBadgeProps {
  status: StatusValue | string
  className?: string
}

export function AdminStatusBadge({ status, className }: AdminStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-white/[0.04] text-white/30 border-white/[0.08]"
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
