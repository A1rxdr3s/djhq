"use client"

import { useState } from "react"
import Link from "next/link"
import { LegalModal } from "@/components/legal/legal-modal"
import type { LegalArtist } from "@/components/legal/legal-content"

type Props = {
  artistName: string
  contactEmail: string | null
  year: number
  showBranding: boolean
}

export function PressKitLegalFooter({ artistName, contactEmail, year, showBranding }: Props) {
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | "cookies" | null>(null)

  const artist: LegalArtist = { artistName, contactEmail }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[11px] text-white/30">
          © {year} {artistName}
          {showBranding && (
            <>
              {" · "}
              <Link
                href="/"
                className="transition-colors duration-150 hover:text-white/50"
              >
                Powered by DJHQ
              </Link>
            </>
          )}
        </p>

        <div className="flex items-center gap-x-4">
          <button
            type="button"
            onClick={() => setLegalModal("privacy")}
            className="cursor-pointer text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => setLegalModal("terms")}
            className="cursor-pointer text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44"
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => setLegalModal("cookies")}
            className="cursor-pointer text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44"
          >
            Cookies
          </button>
        </div>
      </div>

      <LegalModal
        open={legalModal !== null}
        type={legalModal}
        artist={artist}
        onClose={() => setLegalModal(null)}
      />
    </>
  )
}
