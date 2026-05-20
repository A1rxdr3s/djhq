import Link from "next/link"
import { Instagram, Youtube } from "lucide-react"

const footerLinks = [
  { label: "Examples", href: "#profile" },
  { label: "Pricing", href: "#pricing" },
  { label: "Login", href: "#pricing" },
  { label: "Start Free", href: "#pricing" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
                <span className="text-sm font-bold text-accent-foreground">DJ</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A premium link-in-bio and electronic press kit page built specifically for DJs.
            </p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/" aria-label="DJHQ on Instagram" className="text-muted-foreground transition-colors hover:text-foreground">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.youtube.com/" aria-label="DJHQ on YouTube" className="text-muted-foreground transition-colors hover:text-foreground">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DJHQ. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for DJs, electronic artists, and bookers.
          </p>
        </div>
      </div>
    </footer>
  )
}
