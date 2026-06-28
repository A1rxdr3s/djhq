import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { brand } from "@/lib/brand"
import { resolveLegalArtistContext } from "@/lib/legal-artist-context"
import { LegalContent } from "@/components/legal/legal-content"

export const metadata: Metadata = {
  title:       `Privacy — ${brand.name}`,
  description: `How personal data is collected and handled on artist websites powered by ${brand.name}.`,
}

export default async function PrivacyPage() {
  const artist = await resolveLegalArtistContext()
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-[680px] px-6 pb-20 pt-10 sm:pt-14">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30 transition-colors duration-150 hover:text-white/60"
        >
          <ArrowLeft className="h-3 w-3" />
          {artist?.artistName ?? brand.name}
        </Link>
        <LegalContent type="privacy" artist={artist} />
      </div>
    </main>
  )
}
