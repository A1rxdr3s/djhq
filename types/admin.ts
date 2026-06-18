// Admin types for DJHQ Business Control Center
// TODO: replace with Supabase-generated types when backend is connected

// ─── Real data types (from Supabase) ─────────────────────────────────────────

export interface AdminRealArtist {
  id: string
  handle: string
  artistName: string
  plan: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
  bookingEmail: string
  pressKitEnabled: boolean
  location: string
  ownerUserId: string | null
}

export interface AdminRealUser {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
}

export interface AdminRealData {
  artists: AdminRealArtist[]
  authUsers: AdminRealUser[]
  totalGigs: number
  totalReleases: number
  fetchedAt: string
  isDevMode: boolean
  dataError: boolean
}

export type AdminUserRole = "platform_admin" | "support" | "artist_owner" | "artist_editor" | "viewer"
export type AdminUserStatus = "active" | "invited" | "suspended" | "trial" | "churned"
export type AdminPlan = "free" | "starter" | "pro" | "agency" | "enterprise"
export type AdminPublishStatus = "published" | "draft" | "suspended"
export type AdminInvitationStatus = "pending" | "accepted" | "expired" | "revoked"
export type AdminSubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "paused"
export type AdminPaymentStatus = "paid" | "failed" | "refunded" | "pending"
export type AdminBookingLeadStatus = "new" | "contacted" | "qualified" | "declined" | "converted"
export type AdminTicketStatus = "open" | "in_progress" | "resolved"
export type AdminTicketType = "payment_failed" | "upload_failed" | "profile_error" | "domain_issue" | "suspicious_activity" | "account_issue"

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminUserRole
  status: AdminUserStatus
  artistHandle?: string
  plan: AdminPlan
  createdAt: string
  lastActiveAt: string
}

export interface AdminArtistTenant {
  id: string
  artistName: string
  handle: string
  ownerName: string
  ownerEmail: string
  plan: AdminPlan
  status: AdminPublishStatus
  publicUrl: string
  createdAt: string
  updatedAt: string
}

export interface AdminInvitation {
  id: string
  email: string
  role: AdminUserRole
  artistHandle?: string
  status: AdminInvitationStatus
  invitedBy: string
  createdAt: string
  expiresAt: string
}

export interface AdminSubscription {
  id: string
  artistName: string
  plan: AdminPlan
  status: AdminSubscriptionStatus
  renewalDate: string
  mrr: number
  paymentStatus: "ok" | "failed" | "pending"
}

export interface AdminPayment {
  id: string
  customer: string
  artist: string
  amount: number
  currency: string
  status: AdminPaymentStatus
  date: string
  provider: "stripe"
  invoiceId: string
}

export interface AdminBookingLead {
  id: string
  artistName: string
  requesterName: string
  email: string
  city: string
  eventType: string
  eventDate: string
  venueOrPromoter: string
  status: AdminBookingLeadStatus
  createdAt: string
}

export interface AdminPressKitActivity {
  id: string
  artistName: string
  downloads: number
  lastDownloadedAt: string
  language: "ESP" | "ENG" | "—"
  assetType: "PDF" | "Photos" | "Logos" | "Bio" | "Rider"
  source: string
}

export interface AdminFeatureFlag {
  key: string
  label: string
  description: string
  enabled: boolean
  rolloutTarget: "all" | "pro" | "agency" | "enterprise" | "internal"
  environment: "production" | "staging" | "development"
}

export interface AdminSupportTicket {
  id: string
  type: AdminTicketType
  description: string
  artistHandle?: string
  userEmail?: string
  status: AdminTicketStatus
  createdAt: string
}

export interface AdminActivity {
  id: string
  type: "artist_created" | "payment_succeeded" | "invite_sent" | "booking_received" | "presskit_downloaded" | "plan_upgraded" | "payment_failed"
  description: string
  timestamp: string
}

export interface AdminPlanConfig {
  key: AdminPlan
  label: string
  price: number
  artistCount: number
  subscriptionCount: number
  mrrContribution: number
  features: string[]
}
