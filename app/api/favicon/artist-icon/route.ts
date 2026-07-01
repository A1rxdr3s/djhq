import { NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_LOGO_BYTES = 512 * 1024

// Only fetch images that live on this project's own Supabase storage.
// Validates that the hostname matches NEXT_PUBLIC_SUPABASE_URL to prevent SSRF.
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname } catch { return null }
})()

function isTrustedLogoUrl(url: string): boolean {
  if (!SUPABASE_HOST || !url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && parsed.hostname === SUPABASE_HOST
  } catch {
    return false
  }
}

// GET /api/favicon/artist-icon?url={supabase_storage_url}&v={cache_key}
//
// Composites the artist's custom logo PNG onto a solid dark background and
// returns a self-contained SVG with the logo embedded as a base64 data URI.
// This solves the white-circle favicon problem: white/transparent logos
// become invisible when Google composites them on its white search results
// background. The compositor wraps the logo in #0a0a0a so it is always
// visible regardless of platform rendering environment.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get("url") ?? ""

  if (!rawUrl || !isTrustedLogoUrl(rawUrl)) {
    return new NextResponse("Invalid url.", { status: 400 })
  }

  let base64: string
  let mimeType: string
  try {
    const res = await fetch(rawUrl)
    if (!res.ok) return new NextResponse("Upstream error.", { status: 502 })

    const contentLength = Number(res.headers.get("content-length") ?? 0)
    if (contentLength > MAX_LOGO_BYTES) return new NextResponse("Logo too large.", { status: 413 })

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_LOGO_BYTES) return new NextResponse("Logo too large.", { status: 413 })

    base64  = Buffer.from(buf).toString("base64")
    mimeType = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim()
  } catch {
    return new NextResponse("Failed to fetch logo.", { status: 502 })
  }

  // The SVG embeds the logo as a self-contained data URI so no cross-origin
  // image load is required when rendering the SVG — Google's favicon renderer
  // and all browsers can display it without following additional URLs.
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    `<rect width="64" height="64" rx="8" fill="#0a0a0a"/>`,
    `<image href="data:${mimeType};base64,${base64}" x="6" y="6" width="52" height="52" preserveAspectRatio="xMidYMid meet"/>`,
    `</svg>`,
  ].join("")

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
    },
  })
}
