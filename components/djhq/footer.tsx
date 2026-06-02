import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">

        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-mono text-[12px] font-bold uppercase tracking-[0.20em] text-white/50 transition-colors hover:text-white/80"
          >
            DJHQ
          </Link>
          <p className="text-[11px] text-white/22">
            Built for electronic artists.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="text-[11px] text-white/28 transition-colors hover:text-white/55"
          >
            Login
          </Link>
          <p className="text-[11px] text-white/18">
            © {new Date().getFullYear()} DJHQ
          </p>
        </div>

      </div>
    </footer>
  )
}
