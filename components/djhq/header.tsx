"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Wordmark */}
        <Link
          href="/"
          className="font-mono text-[13px] font-bold uppercase tracking-[0.20em] text-foreground"
        >
          DJHQ
        </Link>

        {/* Desktop right */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/sign-in"
            className="text-[12px] text-white/38 transition-colors hover:text-white/65"
          >
            Login
          </Link>
          <a
            href="mailto:access@djhq.co"
            className="inline-flex h-9 items-center rounded-full bg-accent px-5 text-[12px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition-all duration-150 hover:bg-accent/90"
          >
            Request Access
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-white/50" />
          ) : (
            <Menu className="h-5 w-5 text-white/50" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.04] bg-background md:hidden">
          <nav id="mobile-navigation" className="flex flex-col gap-4 px-4 py-6">
            <Link
              href="/sign-in"
              className="text-[13px] text-white/38"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <a
              href="mailto:access@djhq.co"
              className="inline-flex h-10 items-center justify-center rounded-full bg-accent text-[12px] font-bold uppercase tracking-[0.08em] text-accent-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Request Access
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
