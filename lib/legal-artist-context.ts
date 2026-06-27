import { headers } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type LegalArtistContext = {
  artistName: string
  contactEmail: string | null
}

// Derive the canonical app hostname from NEXT_PUBLIC_APP_URL (matches proxy.ts logic).
function resolveOwnedHostnames(): Set<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.app"
  let appHost = "djhq.app"
  try {
    appHost = new URL(appUrl).hostname
  } catch {
    // keep fallback
  }
  return new Set([appHost, `www.${appHost}`, "djhq.com", "www.djhq.com", "localhost", "127.0.0.1"])
}

function isOwnedHost(hostname: string): boolean {
  if (resolveOwnedHostnames().has(hostname)) return true
  if (hostname.endsWith(".vercel.app")) return true
  if (hostname.endsWith(".djhq.app")) return true
  if (hostname.endsWith(".djhq.com")) return true
  return false
}

type DomainRow = {
  artists: {
    artist_name: string
    booking_email: string
    footer_contact_email: string | null
  }
}

/**
 * Reads the Host header and resolves artist context from an active custom domain record.
 * Returns null when accessed via DJHQ-owned domains (platform fallback copy is shown).
 * Silently catches any DB/env error so legal pages always render.
 */
export async function resolveLegalArtistContext(): Promise<LegalArtistContext | null> {
  try {
    const h = await headers()
    const hostname = (h.get("host") ?? "").split(":")[0]
    if (!hostname || isOwnedHost(hostname)) return null

    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("custom_domains")
      .select("artists!inner(artist_name, booking_email, footer_contact_email)")
      .eq("domain", hostname)
      .eq("status", "active")
      .maybeSingle<DomainRow>()

    const artist = data?.artists
    if (!artist) return null

    return {
      artistName: artist.artist_name,
      contactEmail: artist.footer_contact_email ?? artist.booking_email ?? null,
    }
  } catch {
    return null
  }
}
