import type {
  AdminUser,
  AdminArtistTenant,
  AdminInvitation,
  AdminSubscription,
  AdminPayment,
  AdminBookingLead,
  AdminPressKitActivity,
  AdminFeatureFlag,
  AdminSupportTicket,
  AdminActivity,
  AdminPlanConfig,
} from "@/types/admin"

export const MOCK_USERS: AdminUser[] = [
  { id: "u1", name: "Andres Herrera", email: "andres@djhq.com", role: "platform_admin", status: "active", artistHandle: "andresherrera", plan: "pro", createdAt: "2024-01-12", lastActiveAt: "2026-06-18" },
  { id: "u2", name: "Sofia Ruiz", email: "sofia@djhq.com", role: "support", status: "active", plan: "free", createdAt: "2024-03-08", lastActiveAt: "2026-06-17" },
  { id: "u3", name: "Marco Esposito", email: "marco@nocturno.io", role: "artist_owner", status: "active", artistHandle: "nocturno", plan: "pro", createdAt: "2024-06-22", lastActiveAt: "2026-06-15" },
  { id: "u4", name: "Lena Fischer", email: "lena@lenafischer.de", role: "artist_owner", status: "trial", artistHandle: "lena_fischer", plan: "starter", createdAt: "2026-05-30", lastActiveAt: "2026-06-12" },
  { id: "u5", name: "Tomás Vega", email: "tomas@djhq.com", role: "artist_editor", status: "active", artistHandle: "andresherrera", plan: "pro", createdAt: "2025-02-14", lastActiveAt: "2026-06-10" },
  { id: "u6", name: "Kai Nakamura", email: "kai.naka@gmail.com", role: "artist_owner", status: "invited", artistHandle: "kai_naka", plan: "free", createdAt: "2026-06-14", lastActiveAt: "—" },
  { id: "u7", name: "Priya Sharma", email: "priya@deepstate.in", role: "artist_owner", status: "active", artistHandle: "priya_sharma", plan: "agency", createdAt: "2025-08-11", lastActiveAt: "2026-06-16" },
  { id: "u8", name: "Carlos Mendez", email: "c.mendez@bpm.mx", role: "artist_editor", status: "suspended", artistHandle: "nocturno", plan: "pro", createdAt: "2025-04-07", lastActiveAt: "2026-04-22" },
]

export const MOCK_TENANTS: AdminArtistTenant[] = [
  { id: "t1", artistName: "ANDRES:HERRERA", handle: "andresherrera", ownerName: "Andres Herrera", ownerEmail: "andres@djhq.com", plan: "pro", status: "published", publicUrl: "/andresherrera", createdAt: "2024-01-12", updatedAt: "2026-06-18" },
  { id: "t2", artistName: "NOCTURNO", handle: "nocturno", ownerName: "Marco Esposito", ownerEmail: "marco@nocturno.io", plan: "pro", status: "published", publicUrl: "/nocturno", createdAt: "2024-06-22", updatedAt: "2026-06-15" },
  { id: "t3", artistName: "LENA FISCHER", handle: "lena_fischer", ownerName: "Lena Fischer", ownerEmail: "lena@lenafischer.de", plan: "starter", status: "draft", publicUrl: "/lena_fischer", createdAt: "2026-05-30", updatedAt: "2026-06-12" },
  { id: "t4", artistName: "PRIYA SHARMA", handle: "priya_sharma", ownerName: "Priya Sharma", ownerEmail: "priya@deepstate.in", plan: "agency", status: "published", publicUrl: "/priya_sharma", createdAt: "2025-08-11", updatedAt: "2026-06-16" },
  { id: "t5", artistName: "KAI NAKA", handle: "kai_naka", ownerName: "Kai Nakamura", ownerEmail: "kai.naka@gmail.com", plan: "free", status: "draft", publicUrl: "/kai_naka", createdAt: "2026-06-14", updatedAt: "2026-06-14" },
  { id: "t6", artistName: "DELVAUX", handle: "delvaux", ownerName: "Baptiste Delvaux", ownerEmail: "baptiste@delvaux.be", plan: "pro", status: "published", publicUrl: "/delvaux", createdAt: "2025-01-18", updatedAt: "2026-05-28" },
]

export const MOCK_INVITATIONS: AdminInvitation[] = [
  { id: "i1", email: "jess@miamibooking.com", role: "artist_owner", artistHandle: undefined, status: "pending", invitedBy: "Andres Herrera", createdAt: "2026-06-17", expiresAt: "2026-06-24" },
  { id: "i2", email: "kai.naka@gmail.com", role: "artist_owner", artistHandle: "kai_naka", status: "accepted", invitedBy: "Andres Herrera", createdAt: "2026-06-14", expiresAt: "2026-06-21" },
  { id: "i3", email: "support2@djhq.com", role: "support", artistHandle: undefined, status: "pending", invitedBy: "Sofia Ruiz", createdAt: "2026-06-10", expiresAt: "2026-06-17" },
  { id: "i4", email: "ex.editor@nocturno.io", role: "artist_editor", artistHandle: "nocturno", status: "revoked", invitedBy: "Marco Esposito", createdAt: "2026-04-01", expiresAt: "2026-04-08" },
  { id: "i5", email: "dj.max@beatconnect.eu", role: "artist_owner", artistHandle: undefined, status: "expired", invitedBy: "Andres Herrera", createdAt: "2026-05-01", expiresAt: "2026-05-08" },
]

export const MOCK_SUBSCRIPTIONS: AdminSubscription[] = [
  { id: "s1", artistName: "ANDRES:HERRERA", plan: "pro", status: "active", renewalDate: "2026-07-12", mrr: 29, paymentStatus: "ok" },
  { id: "s2", artistName: "NOCTURNO", plan: "pro", status: "active", renewalDate: "2026-07-22", mrr: 29, paymentStatus: "ok" },
  { id: "s3", artistName: "PRIYA SHARMA", plan: "agency", status: "active", renewalDate: "2026-08-11", mrr: 99, paymentStatus: "ok" },
  { id: "s4", artistName: "DELVAUX", plan: "pro", status: "active", renewalDate: "2026-07-18", mrr: 29, paymentStatus: "ok" },
  { id: "s5", artistName: "LENA FISCHER", plan: "starter", status: "trialing", renewalDate: "2026-06-30", mrr: 0, paymentStatus: "pending" },
  { id: "s6", artistName: "KAI NAKA", plan: "free", status: "active", renewalDate: "—", mrr: 0, paymentStatus: "ok" },
]

export const MOCK_PAYMENTS: AdminPayment[] = [
  { id: "pay_001", customer: "Andres Herrera", artist: "ANDRES:HERRERA", amount: 29, currency: "USD", status: "paid", date: "2026-06-12", provider: "stripe", invoiceId: "inv_001" },
  { id: "pay_002", customer: "Marco Esposito", artist: "NOCTURNO", amount: 29, currency: "USD", status: "paid", date: "2026-06-22", provider: "stripe", invoiceId: "inv_002" },
  { id: "pay_003", customer: "Priya Sharma", artist: "PRIYA SHARMA", amount: 99, currency: "USD", status: "paid", date: "2026-06-11", provider: "stripe", invoiceId: "inv_003" },
  { id: "pay_004", customer: "Baptiste Delvaux", artist: "DELVAUX", amount: 29, currency: "USD", status: "paid", date: "2026-06-18", provider: "stripe", invoiceId: "inv_004" },
  { id: "pay_005", customer: "Carlos Mendez", artist: "NOCTURNO", amount: 29, currency: "USD", status: "failed", date: "2026-05-22", provider: "stripe", invoiceId: "inv_005" },
  { id: "pay_006", customer: "Marco Esposito", artist: "NOCTURNO", amount: 29, currency: "USD", status: "paid", date: "2026-05-22", provider: "stripe", invoiceId: "inv_006" },
  { id: "pay_007", customer: "Andres Herrera", artist: "ANDRES:HERRERA", amount: 29, currency: "USD", status: "refunded", date: "2026-04-12", provider: "stripe", invoiceId: "inv_007" },
]

export const MOCK_BOOKING_LEADS: AdminBookingLead[] = [
  { id: "bl1", artistName: "ANDRES:HERRERA", requesterName: "Elena Voss", email: "elena@warehouse93.de", city: "Berlin", eventType: "Club", eventDate: "2026-08-15", venueOrPromoter: "Warehouse 93", status: "new", createdAt: "2026-06-17" },
  { id: "bl2", artistName: "ANDRES:HERRERA", requesterName: "Ricardo Peña", email: "r.pena@solsticefest.mx", city: "Mexico City", eventType: "Festival", eventDate: "2026-09-20", venueOrPromoter: "Solstice Fest", status: "contacted", createdAt: "2026-06-14" },
  { id: "bl3", artistName: "NOCTURNO", requesterName: "Lucia Bertini", email: "lucia@club42.it", city: "Milan", eventType: "Club", eventDate: "2026-07-04", venueOrPromoter: "Club 42", status: "qualified", createdAt: "2026-06-10" },
  { id: "bl4", artistName: "PRIYA SHARMA", requesterName: "James Park", email: "james@roofkings.sg", city: "Singapore", eventType: "Rooftop", eventDate: "2026-07-19", venueOrPromoter: "Roof Kings SG", status: "new", createdAt: "2026-06-16" },
  { id: "bl5", artistName: "ANDRES:HERRERA", requesterName: "Carlos F.", email: "cfa@vip.ae", city: "Dubai", eventType: "Beach Club", eventDate: "2026-12-31", venueOrPromoter: "INDULGE Dubai", status: "declined", createdAt: "2026-06-01" },
  { id: "bl6", artistName: "DELVAUX", requesterName: "Marie Collin", email: "m.collin@fuse.be", city: "Brussels", eventType: "Club", eventDate: "2026-08-02", venueOrPromoter: "Fuse Brussels", status: "confirmed", createdAt: "2026-05-28" },
]

export const MOCK_PRESS_KIT_ACTIVITY: AdminPressKitActivity[] = [
  { id: "pk1", artistName: "ANDRES:HERRERA", downloads: 47, lastDownloadedAt: "2026-06-18", language: "ESP", assetType: "PDF", source: "Direct" },
  { id: "pk2", artistName: "ANDRES:HERRERA", downloads: 31, lastDownloadedAt: "2026-06-17", language: "ENG", assetType: "PDF", source: "Direct" },
  { id: "pk3", artistName: "ANDRES:HERRERA", downloads: 18, lastDownloadedAt: "2026-06-15", language: "—", assetType: "Photos", source: "Google Drive" },
  { id: "pk4", artistName: "NOCTURNO", downloads: 22, lastDownloadedAt: "2026-06-16", language: "ENG", assetType: "PDF", source: "Direct" },
  { id: "pk5", artistName: "PRIYA SHARMA", downloads: 14, lastDownloadedAt: "2026-06-12", language: "ENG", assetType: "Logos", source: "Dropbox" },
  { id: "pk6", artistName: "DELVAUX", downloads: 9, lastDownloadedAt: "2026-06-10", language: "ENG", assetType: "Rider", source: "Direct" },
]

export const MOCK_FEATURE_FLAGS: AdminFeatureFlag[] = [
  { key: "publicProfile", label: "Public Profile", description: "Artist public profile page is accessible.", enabled: true, rolloutTarget: "all", environment: "production" },
  { key: "pressKit", label: "Press Kit", description: "Press kit page with downloadable assets.", enabled: true, rolloutTarget: "pro", environment: "production" },
  { key: "brandKit", label: "Brand Kit", description: "Brand identity and asset generation tools.", enabled: true, rolloutTarget: "pro", environment: "production" },
  { key: "bookingForm", label: "Booking Form", description: "Public booking inquiry modal and form.", enabled: true, rolloutTarget: "all", environment: "production" },
  { key: "customDomain", label: "Custom Domain", description: "Connect a custom domain to the artist profile.", enabled: false, rolloutTarget: "agency", environment: "staging" },
  { key: "payments", label: "Payments", description: "Subscription billing and payment processing.", enabled: true, rolloutTarget: "all", environment: "production" },
  { key: "analytics", label: "Analytics", description: "Profile view and asset download analytics.", enabled: false, rolloutTarget: "pro", environment: "development" },
  { key: "multiArtist", label: "Multi-Artist", description: "Manage multiple artist profiles under one account.", enabled: false, rolloutTarget: "agency", environment: "development" },
  { key: "agencyMode", label: "Agency Mode", description: "Agency-tier management UI and white-label options.", enabled: false, rolloutTarget: "enterprise", environment: "development" },
]

export const MOCK_SUPPORT_TICKETS: AdminSupportTicket[] = [
  { id: "tkt_001", type: "payment_failed", description: "Stripe payment declined — card expired. Customer notified.", artistHandle: "nocturno", userEmail: "c.mendez@bpm.mx", status: "open", createdAt: "2026-06-15" },
  { id: "tkt_002", type: "upload_failed", description: "Hero image upload timed out (>10MB file attempted).", artistHandle: "lena_fischer", userEmail: "lena@lenafischer.de", status: "in_progress", createdAt: "2026-06-14" },
  { id: "tkt_003", type: "profile_error", description: "Press kit assets section not rendering — broken Drive URL.", artistHandle: "kai_naka", userEmail: "kai.naka@gmail.com", status: "open", createdAt: "2026-06-13" },
  { id: "tkt_004", type: "account_issue", description: "User cannot access HQ dashboard after email change.", artistHandle: undefined, userEmail: "support2@djhq.com", status: "resolved", createdAt: "2026-06-10" },
  { id: "tkt_005", type: "suspicious_activity", description: "Multiple failed login attempts from unknown IP (185.x.x.x).", artistHandle: "andresherrera", userEmail: "andres@djhq.com", status: "resolved", createdAt: "2026-05-29" },
]

export const MOCK_ACTIVITY: AdminActivity[] = [
  { id: "a1", type: "booking_received", description: "New booking request — Elena Voss for ANDRES:HERRERA · Berlin, Aug 15", timestamp: "2h ago" },
  { id: "a2", type: "payment_succeeded", description: "Payment $99 received — PRIYA SHARMA (Agency)", timestamp: "5h ago" },
  { id: "a3", type: "presskit_downloaded", description: "Press Kit ESP downloaded — ANDRES:HERRERA", timestamp: "8h ago" },
  { id: "a4", type: "booking_received", description: "New booking request — James Park for PRIYA SHARMA · Singapore, Jul 19", timestamp: "12h ago" },
  { id: "a5", type: "invite_sent", description: "Invite sent to jess@miamibooking.com (Artist Owner)", timestamp: "1d ago" },
  { id: "a6", type: "artist_created", description: "New artist tenant created — KAI NAKA (@kai_naka)", timestamp: "4d ago" },
  { id: "a7", type: "plan_upgraded", description: "DELVAUX upgraded to Pro plan", timestamp: "5d ago" },
  { id: "a8", type: "payment_failed", description: "Payment failed — $29 NOCTURNO (card expired)", timestamp: "6d ago" },
]

export const MOCK_PLAN_CONFIGS: AdminPlanConfig[] = [
  { key: "free", label: "Free", price: 0, artistCount: 2, subscriptionCount: 2, mrrContribution: 0, features: ["Public Profile", "Booking Form", "5 Gallery Images"] },
  { key: "starter", label: "Starter", price: 9, artistCount: 1, subscriptionCount: 1, mrrContribution: 9, features: ["Everything in Free", "Press Kit", "20 Gallery Images"] },
  { key: "pro", label: "Pro", price: 29, artistCount: 4, subscriptionCount: 4, mrrContribution: 116, features: ["Everything in Starter", "Brand Kit", "Unlimited Gallery", "Custom Accent"] },
  { key: "agency", label: "Agency", price: 99, artistCount: 1, subscriptionCount: 1, mrrContribution: 99, features: ["Everything in Pro", "Multi-Artist (soon)", "Priority Support"] },
  { key: "enterprise", label: "Enterprise", price: 299, artistCount: 0, subscriptionCount: 0, mrrContribution: 0, features: ["Everything in Agency", "Custom Domain", "White Label", "SLA"] },
]

// Computed overview metrics derived from mock data above
export const MOCK_OVERVIEW = {
  totalArtists: MOCK_TENANTS.length,
  activeUsers: MOCK_USERS.filter((u) => u.status === "active").length,
  proPlans: MOCK_SUBSCRIPTIONS.filter((s) => s.plan === "pro" || s.plan === "agency").length,
  mrr: MOCK_SUBSCRIPTIONS.reduce((sum, s) => sum + s.mrr, 0),
  newSignups: 2,
  pendingInvitations: MOCK_INVITATIONS.filter((i) => i.status === "pending").length,
  openBookingLeads: MOCK_BOOKING_LEADS.filter((l) => l.status === "new").length,
  pressKitDownloads: MOCK_PRESS_KIT_ACTIVITY.reduce((sum, a) => sum + a.downloads, 0),
}
