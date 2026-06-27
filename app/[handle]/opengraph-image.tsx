import { createClient } from "@supabase/supabase-js"
import { buildArtistOgImageResponse, type OgArtistData } from "@/lib/djhq/og-image"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

// Node.js runtime — Supabase JS client requires Node APIs not available in edge runtime.
// Do NOT add `export const runtime = "edge"` here.

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
    return (data as OgArtistData | null)
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
    console.log(`[og-image/handle] received handle: "${handle}"`)

    const baseUrl = getPublicBaseUrl()

    let artist: OgArtistData | null = null
    try {
      artist = await getOgArtistData(handle)
      console.log(`[og-image/handle] artist resolved: ${artist ? "yes" : "no"}`)
    } catch (err) {
      console.error("[og-image/handle] data fetch error:", err instanceof Error ? err.message : String(err))
    }

    return buildArtistOgImageResponse(artist, baseUrl)
  } catch (outerErr) {
    // Last-resort catch: buildArtistOgImageResponse itself threw (both main
    // render and panic card failed). Return absolute minimal standalone card.
    console.error("[og-image/handle] outer catch:", outerErr instanceof Error ? outerErr.message : String(outerErr))
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
