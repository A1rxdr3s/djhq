// TODO: connect authentication flow — user must create account / sign in to accept
// TODO: mark invitation as accepted on successful sign-up + start license clock

import Link from "next/link"
import type { Metadata } from "next"
import { getInvitationByToken } from "@/app/actions/admin-invitations"
import type { LicenseDuration } from "@/types/admin"

export const metadata: Metadata = {
  title: "You've been invited — DJHQ",
  robots: { index: false },
}

type InvitePageProps = {
  params: Promise<{ token: string }>
}

const LICENSE_LABELS: Record<LicenseDuration, string> = {
  one_month:    "1 month",
  three_months: "3 months",
  six_months:   "6 months",
  one_year:     "1 year",
  lifetime:     "Lifetime Access",
}

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  support:        "Support",
  artist_owner:   "Artist Owner",
  artist_editor:  "Artist Editor",
  viewer:         "Viewer",
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <p className="mb-10 text-[11px] font-bold uppercase tracking-[0.28em] text-white/28">DJHQ</p>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.025] px-7 py-8 text-center">
        {children}
      </div>
      <Link
        href="/"
        className="mt-8 text-[11px] text-white/25 transition-colors hover:text-white/50"
      >
        ← Back to DJHQ
      </Link>
    </div>
  )
}

// ─── Error states ─────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <Shell>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-white/30">Invalid Link</p>
      <h1 className="text-[20px] font-bold text-foreground/80">Invitation not found</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-white/42">
        This invitation link is invalid or has already been used. Contact your admin for a new invite.
      </p>
    </Shell>
  )
}

function RevokedState() {
  return (
    <Shell>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-red-400/60">Revoked</p>
      <h1 className="text-[20px] font-bold text-foreground/80">Invitation revoked</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-white/42">
        This invitation has been revoked by the platform admin. Contact support if you believe this is an error.
      </p>
    </Shell>
  )
}

function AlreadyAccepted() {
  return (
    <Shell>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-emerald-400/60">Already Accepted</p>
      <h1 className="text-[20px] font-bold text-foreground/80">Invitation already accepted</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-white/42">
        This invitation has already been accepted. Sign in to access your account.
      </p>
      <Link
        href="/hq"
        className="mt-7 flex h-10 w-full items-center justify-center rounded-full border border-white/[0.12] px-6 text-[13px] font-semibold uppercase tracking-[0.10em] text-white/60 hover:border-white/20 hover:text-white/80"
      >
        Go to Dashboard
      </Link>
    </Shell>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const result = await getInvitationByToken(token)

  if (!result.found) {
    if (result.reason === "revoked")  return <RevokedState />
    if (result.reason === "accepted") return <AlreadyAccepted />
    return <NotFound />
  }

  const { invitation, isExpired } = result

  return (
    <Shell>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-accent/60">
        {isExpired ? "Expired Invitation" : "Invitation"}
      </p>
      <h1 className="text-[22px] font-bold leading-tight text-foreground/90">
        You&apos;ve been invited to DJHQ
      </h1>

      {/* Invitation details */}
      <div className="mt-5 space-y-2 text-left rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
        <Row label="Email"   value={invitation.email} />
        <Row label="Role"    value={ROLE_LABELS[invitation.role] ?? invitation.role} />
        {invitation.artistName && (
          <Row label="Artist" value={`${invitation.artistName} (@${invitation.artistHandle})`} />
        )}
        <Row label="License" value={LICENSE_LABELS[invitation.licenseDuration]} />
        {invitation.licenseExpiresAt && (
          <Row label="Access expires" value={invitation.licenseExpiresAt} />
        )}
        {invitation.licenseDuration === "lifetime" && (
          <Row label="Access expires" value="Never — Lifetime Access" highlight />
        )}
      </div>

      {isExpired ? (
        <>
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
            <p className="text-[12px] text-red-400">
              This invitation link expired on {invitation.expiresAt}. Contact your admin for a new invite.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Accept CTA — placeholder until auth is wired */}
          <button
            disabled
            className="mt-7 flex h-10 w-full items-center justify-center rounded-full bg-accent px-6 text-[13px] font-semibold uppercase tracking-[0.10em] text-accent-foreground opacity-70"
            title="Authentication will be connected in a later sprint"
          >
            Accept Invitation
          </button>
          <p className="mt-3 text-[11px] text-white/25">
            {/* TODO: connect to Supabase Auth sign-up / magic link flow */}
            Authentication connection coming soon.
          </p>
        </>
      )}

      {/* Dev: show token */}
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 font-mono text-[10px] text-white/18">token: {token}</p>
      )}
    </Shell>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-white/30 shrink-0">{label}</span>
      <span className={`text-[12px] font-medium text-right ${highlight ? "text-emerald-400" : "text-foreground/70"}`}>
        {value}
      </span>
    </div>
  )
}
