/**
 * Route-level loading state for /[handle]/presskit.
 *
 * Shown by Next.js App Router as an instant placeholder while the
 * presskit server component fetches data. No spinner, no modal —
 * just a skeleton that mirrors the page structure so layout shift
 * is minimal and the transition feels immediate.
 */
export default function PressKitLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top progress bar — appears instantly on navigation start */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[2px]"
        style={{ background: "var(--accent)" }}
      >
        <div
          className="h-full w-2/3 rounded-full opacity-80"
          style={{
            background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))",
            animation: "pk-progress 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        {/* Back link skeleton */}
        <div className="mb-8 h-3 w-24 rounded-full bg-white/[0.06]" />

        {/* EPK header card skeleton */}
        <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.015]">
          {/* Hero banner */}
          <div className="h-[140px] w-full bg-white/[0.04] sm:h-[170px]" />
          <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6">
            <div className="mb-3 h-2 w-20 rounded-full bg-accent/20" />
            <div className="h-7 w-40 rounded-lg bg-white/[0.06]" />
            <div className="mt-1.5 h-2.5 w-56 rounded-full bg-white/[0.04]" />
            <div className="mt-2 h-3 w-72 max-w-full rounded-full bg-white/[0.03]" />
          </div>
        </div>

        {/* Downloads section skeleton */}
        <div className="mt-10">
          <div className="mb-5">
            <div className="mb-1 h-2 w-28 rounded-full bg-accent/20" />
            <div className="h-5 w-40 rounded-lg bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8"
              >
                <div className="h-6 w-6 rounded-md bg-white/[0.06]" />
                <div className="mt-6 h-2 w-20 rounded-full bg-white/[0.04]" />
                <div className="mt-1 h-6 w-32 rounded-lg bg-white/[0.06]" />
                <div className="mt-7 h-8 w-32 rounded-full bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pk-progress {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  )
}
