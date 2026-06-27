/**
 * Root-level OG image route.
 *
 * Handles requests to /opengraph-image at the root.
 *
 * Primary use case: custom domains configured with Vercel path-prefix routing
 * do NOT use this route (requests are rewritten to /[handle]/opengraph-image).
 * This route is a safety net for custom domains served at root without path
 * prefixing — it reads the Host header and resolves the artist by domain.
 */

import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { buildArtistOgImageResponse, type OgArtistData } from "@/lib/djhq/og-image"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// ─── Data ────────────────────────────────────────────────────────────────────

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Look up an artist via the custom_domains table by their domain name. */
async function getArtistByDomain(domain: string): Promise<OgArtistData | null> {
  if (!domain) return null
  const client = makeSupabaseClient()
  if (!client) return null
  try {
    // Join through custom_domains to find the artist for this domain.
    const { data: domainRow } = await client
      .from("custom_domains")
      .select("artist_id")
      .eq("domain", domain)
      .maybeSingle()

    if (!domainRow?.artist_id) return null

    const { data } = await client
      .from("artists")
      .select(
        "artist_name, handle, hero_tagline, genres, location, hero_image_url, seo_canonical_url, seo_og_description, seo_description, artist_accent_theme",
      )
      .eq("id", domainRow.artist_id)
      .eq("is_published", true)
      .maybeSingle()

    return (data as OgArtistData | null)
  } catch {
    return null
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export default async function OgImage() {
  try {
    const baseUrl = getPublicBaseUrl()

    let artist: OgArtistData | null = null
    try {
      const headersList = await headers()
      // x-forwarded-host is set by Vercel; host is the raw header.
      const hostRaw =
        headersList.get("x-forwarded-host") || headersList.get("host") || ""
      // Strip port number (e.g., "example.com:3000" → "example.com").
      const domain = hostRaw.split(":")[0].trim()
      console.log(`[og-image/root] received host: "${domain}"`)

      if (domain) {
        artist = await getArtistByDomain(domain)
        console.log(`[og-image/root] artist resolved: ${artist ? "yes" : "no"}`)
      }
    } catch (err) {
      console.error("[og-image/root] data fetch error:", err instanceof Error ? err.message : String(err))
      // artist stays null → renderer returns "unavailable" fallback card
    }

    return buildArtistOgImageResponse(artist, baseUrl)
  } catch (outerErr) {
    // Last-resort catch: buildArtistOgImageResponse itself threw (both main
    // render and panic card failed). Return absolute minimal standalone card.
    console.error("[og-image/root] outer catch:", outerErr instanceof Error ? outerErr.message : String(outerErr))
    const { ImageResponse } = await import("next/og")
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0c0c",
        }}
      >
        <div style={{ display: "flex", color: "#ffffff", fontSize: 36, fontWeight: 700 }}>
          Artist Website
        </div>
      </div>,
      { width: 1200, height: 630 },
    )
  }
}
