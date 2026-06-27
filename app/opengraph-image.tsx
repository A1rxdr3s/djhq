/**
 * Root-level OG image route at /opengraph-image.
 *
 * Primary use case: custom domains using Vercel path-prefix routing do NOT
 * hit this route — those requests are rewritten to /[handle]/opengraph-image
 * at the CDN layer. This route is a safety net for domains served at root
 * without path prefixing. It reads the Host header and resolves the artist
 * via the custom_domains table.
 *
 * Node.js runtime only — no `export const runtime = "edge"`.
 */

import { ImageResponse } from "next/og"
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

async function getArtistByDomain(domain: string): Promise<OgArtistData | null> {
  if (!domain) return null
  const client = makeSupabaseClient()
  if (!client) return null
  try {
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

    return (data as OgArtistData | null) ?? null
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
      const hostRaw =
        headersList.get("x-forwarded-host") ||
        headersList.get("host") ||
        ""
      // Strip port (e.g. "example.com:3000" → "example.com")
      const domain = hostRaw.split(":")[0].trim()
      console.log(`[og/root] host="${domain}"`)

      if (domain) {
        artist = await getArtistByDomain(domain)
        console.log(`[og/root] artist resolved: ${artist ? "yes" : "no"}`)
      }
    } catch (fetchErr) {
      console.error("[og/root] fetch error:", fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
    }

    return buildArtistOgImageResponse(artist, baseUrl)
  } catch (outerErr) {
    // Last resort: buildArtistOgImageResponse threw AND the panic card inside
    // it also threw. Return an ultra-minimal standalone ImageResponse.
    console.error("[og/root] outer catch:", outerErr instanceof Error ? outerErr.message : String(outerErr))
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090909",
        }}
      >
        <div style={{ display: "flex", color: "#ffffff", fontSize: 34, fontWeight: 700 }}>
          Artist Website
        </div>
        <div style={{ display: "flex", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 14 }}>
          Official Artist Profile  ·  DJHQ
        </div>
      </div>,
      { width: 1200, height: 630 },
    )
  }
}
