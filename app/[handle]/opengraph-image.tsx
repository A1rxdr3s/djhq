/**
 * Dynamic OG image for artist profiles at /{handle}/opengraph-image.
 *
 * Node.js runtime only — Supabase JS uses Node crypto/storage APIs.
 * Do NOT add `export const runtime = "edge"`.
 */

import { ImageResponse } from "next/og"
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

async function getOgArtistData(handle: string): Promise<OgArtistData | null> {
  if (!handle) return null
  const client = makeSupabaseClient()
  if (!client) return null
  try {
    const { data } = await client
      .from("artists")
      .select(
        "artist_name, handle, hero_tagline, genres, location, hero_image_url, seo_canonical_url, seo_og_description, seo_description, artist_accent_theme",
      )
      .eq("handle", handle)
      .eq("is_published", true)
      .maybeSingle()
    return (data as OgArtistData | null) ?? null
  } catch {
    return null
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export default async function OgImage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  try {
    const { handle } = await params
    const safeHandle = (handle ?? "").trim()
    console.log(`[og/handle] handle="${safeHandle}"`)

    const baseUrl = getPublicBaseUrl()

    let artist: OgArtistData | null = null
    try {
      artist = await getOgArtistData(safeHandle)
      console.log(`[og/handle] artist resolved: ${artist ? "yes" : "no"}`)
    } catch (fetchErr) {
      console.error("[og/handle] fetch error:", fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
    }

    return buildArtistOgImageResponse(artist, baseUrl)
  } catch (outerErr) {
    // Last resort: buildArtistOgImageResponse threw AND the panic card inside
    // it also threw. Return an ultra-minimal standalone ImageResponse.
    console.error("[og/handle] outer catch:", outerErr instanceof Error ? outerErr.message : String(outerErr))
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
