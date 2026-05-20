"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
            <span className="text-sm font-bold text-accent-foreground">DJ</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#product" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Product
          </Link>
          <Link href="#profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Examples
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Login
          </Link>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="#pricing">Start Free</Link>
          </Button>
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
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav id="mobile-navigation" className="flex flex-col gap-4 px-4 py-6">
            <Link href="#product" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
              Product
            </Link>
            <Link href="#profile" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
              Examples
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            <hr className="border-border" />
            <Link href="#pricing" className="text-sm text-muted-foreground">
              Login
            </Link>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="#pricing">Start Free</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
