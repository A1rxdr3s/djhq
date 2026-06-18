// Placeholder invitation acceptance page.
// TODO: look up invitation by token from Supabase
// TODO: connect authentication flow so user can create account / sign in
// TODO: mark invitation as accepted on successful sign-up

import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "You've been invited — DJHQ",
  robots: { index: false },
}

type InvitePageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      {/* Platform identity */}
      <p className="mb-10 text-[11px] font-bold uppercase tracking-[0.28em] text-white/28">
        DJHQ
      </p>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.025] px-7 py-8 text-center">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-accent/60">
          Invitation
        </p>
        <h1 className="text-[22px] font-bold leading-tight text-foreground/90">
          You&apos;ve been invited to DJHQ
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-white/42">
          Accept your invitation to access the platform.
        </p>

        {/* CTA */}
        <button
          disabled
          className="mt-7 flex h-10 w-full items-center justify-center rounded-full bg-accent px-6 text-[13px] font-semibold uppercase tracking-[0.10em] text-accent-foreground opacity-70"
          title="Authentication will be connected in a later sprint"
        >
          Accept Invitation
        </button>
        <p className="mt-3 text-[11px] text-white/25">
          Authentication connection coming soon.
        </p>
      </div>

      {/* Dev token display */}
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-6 font-mono text-[10px] text-white/18">
          token: {token}
        </p>
      )}

      <Link
        href="/"
        className="mt-8 text-[11px] text-white/25 transition-colors hover:text-white/50"
      >
        ← Back to DJHQ
      </Link>
    </div>
  )
}
