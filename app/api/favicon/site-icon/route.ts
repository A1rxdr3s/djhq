import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getArtistInitials } from "@/lib/artist-favicon"

export const runtime = "nodejs"

const MAX_LOGO_BYTES = 512 * 1024
const ICON_CACHE = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600"

// GET /api/favicon/site-icon?handle={handle}
//
// Called by proxy.ts for direct favicon URL requests on custom artist domains
// (e.g. andresherrera.music/favicon.ico → rewrite → /api/favicon/site-icon?handle=andresherrera).
//
// Resolves the artist's configured favicon from brand_asset_assignments, composites
// it on a solid dark background, and returns a self-contained SVG with the logo
// embedded as a base64 data URI. Falls back to an initials-based SVG when no
// custom favicon is configured or the upstream fetch fails.
//
// Content-Type is always image/svg+xml — Google and all modern browsers accept SVG
// served at any URL path (content-type takes precedence over the path extension).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const handle = searchParams.get("handle")?.trim().toLowerCase()

  if (!handle) {
    return new NextResponse("handle required.", { status: 400 })
  }

  let faviconUrl: string | null = null
  let resolvedName = handle

  try {
    const supabase = createSupabaseAdminClient()

    const { data: artistRow } = await supabase
      .from("artists")
      .select("id, artist_name, favicon_url, is_published")
      .eq("handle", handle)
      .maybeSingle()

    if (!artistRow || !artistRow.is_published) {
      return initialsIcon(handle.slice(0, 2).toUpperCase())
    }

    resolvedName = (artistRow.artist_name as string | null) ?? handle

    // brand_asset_assignments is the ground truth; artists.favicon_url is a fallback
    const { data: assignment } = await supabase
      .from("brand_asset_assignments")
      .select("variant_url")
      .eq("artist_id", artistRow.id)
      .eq("assignment_type", "favicon")
      .maybeSingle()

    faviconUrl =
      (assignment?.variant_url as string | null | undefined)?.trim() ||
      (artistRow.favicon_url as string | null | undefined)?.trim() ||
      null
  } catch {
    return initialsIcon(getArtistInitials(resolvedName))
  }

  if (!faviconUrl) {
    return initialsIcon(getArtistInitials(resolvedName))
  }

  // Composite the artist's logo on a solid dark background.
  // The SVG embeds the logo as a self-contained base64 data URI — no cross-origin
  // image reference is required when the SVG is rendered, which ensures Google's
  // favicon crawler can display it without following additional URLs.
  try {
    const res = await fetch(faviconUrl)
    if (!res.ok) return initialsIcon(getArtistInitials(resolvedName))

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_LOGO_BYTES) return initialsIcon(getArtistInitials(resolvedName))

    const base64 = Buffer.from(buf).toString("base64")
    const mimeType = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim()

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
      `<rect width="64" height="64" rx="8" fill="#0a0a0a"/>`,
      `<image href="data:${mimeType};base64,${base64}" x="6" y="6" width="52" height="52" preserveAspectRatio="xMidYMid meet"/>`,
      `</svg>`,
    ].join("")

    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": ICON_CACHE },
    })
  } catch {
    return initialsIcon(getArtistInitials(resolvedName))
  }
}

function initialsIcon(initials: string): NextResponse {
  const safe = initials.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "DJ"
  const fontSize = safe.length === 1 ? 32 : safe.length === 2 ? 26 : 20
  const yBaseline = safe.length === 1 ? 42 : 43

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    `<rect width="64" height="64" rx="8" fill="#0a0a0a"/>`,
    `<text x="32" y="${yBaseline}" text-anchor="middle"`,
    ` font-family="system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"`,
    ` font-weight="700" font-size="${fontSize}" letter-spacing="-0.5" fill="#ffffff">${safe}</text>`,
    `</svg>`,
  ].join("")

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": ICON_CACHE },
  })
}
