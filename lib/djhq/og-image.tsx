/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Routes:
 *   app/[handle]/opengraph-image.tsx  — handle-based route
 *   app/opengraph-image.tsx           — root route (custom-domain safety net)
 *
 * Runtime: Node.js only. No `export const runtime = "edge"`.
 *
 * ─── STABILITY CONTRACT ────────────────────────────────────────────────────
 *
 * ImageResponse renders lazily inside a ReadableStream. Satori/resvg-wasm
 * executes WHEN VERCEL READS THE BODY — after this function has already
 * returned. Any error in that streaming phase bypasses all try/catch in
 * user code and Vercel serves its own 500 HTML page instead of image/png.
 *
 * To guarantee the route never 500s, this renderer uses ONLY features
 * confirmed safe in satori's streaming render phase:
 *
 *   ✓  display: "flex" layout (no position: "absolute")
 *   ✓  solid backgroundColor (hex or rgba())
 *   ✓  individual padding properties (paddingTop, paddingLeft, …)
 *   ✓  fontWeight 400 or 700 only
 *   ✓  rgba() in color strings (no opacity: property on elements)
 *   ✓  simple borders (borderLeftWidth + borderLeftStyle + borderLeftColor)
 *
 *   ✗  No <img> elements of any kind — even data-URL src crashes resvg
 *   ✗  No backgroundImage with url() — resvg decodes images during streaming
 *   ✗  No position: "absolute" — causes complex layout failures
 *   ✗  No padding shorthand — satori parser edge cases
 *   ✗  No external font fetches
 *   ✗  No remote image pre-fetch (Buffer.from is fine in Node, but the
 *       resulting data URL still crashes resvg if passed to background/img)
 *
 * Hero/profile images are intentionally excluded. Artists who want a richer
 * OG image can upload a custom URL in the HQ "Open Graph Image" field — that
 * bypasses this route entirely and is used as-is in <meta og:image>.
 */

import { ImageResponse } from "next/og"
import { ACCENT_THEMES } from "@/lib/accent-themes"

// ─── Types ────────────────────────────────────────────────────────────────────

export type OgArtistData = {
  artist_name: string
  handle: string
  hero_tagline: string | null
  genres: string[] | null
  location: string | null
  hero_image_url: string | null       // kept in type for future use; not rendered
  seo_canonical_url: string | null
  seo_og_description: string | null
  seo_description: string | null
  artist_accent_theme: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W  = 1200
const H  = 630
const PL = 80          // paddingLeft
const PR = 80          // paddingRight
const PT = 56          // paddingTop
const PB = 50          // paddingBottom

const DARK_BG       = "#090909"
const FALLBACK_HEX  = "#00E6A7"
const FALLBACK_RGB  = "0, 230, 167"
const SEO_MAX_CHARS = 80    // skip SEO description fields longer than this

// ─── Pure panic card ──────────────────────────────────────────────────────────
// Two text nodes on a solid background. No gradients, borders, or images.
// This is the absolute minimum that satori can render — used as last resort.

function panicCard(name: string): Response {
  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: DARK_BG,
      }}
    >
      <div style={{ display: "flex", color: "#ffffff", fontSize: 36, fontWeight: 700 }}>
        {name || "Artist Website"}
      </div>
      <div
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.35)",
          fontSize: 14,
          marginTop: 16,
        }}
      >
        Official Artist Profile  ·  DJHQ
      </div>
    </div>,
    { width: W, height: H },
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Build a 1200×630 PNG ImageResponse. Never throws — any render failure
 * falls back to panicCard(), and panicCard failures are re-thrown to the
 * route's own outer try/catch which returns a standalone standalone card.
 *
 * Layout: flat flex column, three sections (top / middle / bottom).
 * No images. No absolute positioning. No external font dependency.
 */
export async function buildArtistOgImageResponse(
  artist: OgArtistData | null,
  baseUrl: string,
): Promise<Response> {
  try {
    // ── No artist resolved ───────────────────────────────────────────────────
    if (!artist) {
      console.log("[og-image] no artist — unavailable fallback")
      return new ImageResponse(
        <div
          style={{
            width: W,
            height: H,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: DARK_BG,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.28)",
              fontSize: 15,
              letterSpacing: "0.22em",
            }}
          >
            Artist profile unavailable
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(0,230,167,0.40)",
              fontSize: 11,
              marginTop: 14,
              letterSpacing: "0.18em",
            }}
          >
            DJHQ
          </div>
        </div>,
        { width: W, height: H },
      )
    }

    // ── Accent theme ─────────────────────────────────────────────────────────
    const accentKey   = String(artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES
    const accentTheme = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES.matrix
    const accentHex   = accentTheme.hex    ?? FALLBACK_HEX
    const accentRgb   = accentTheme.glowRgb ?? FALLBACK_RGB

    // ── Sanitize all display strings ─────────────────────────────────────────
    // Null-coalescing + trim before every string operation. Never pass
    // null/undefined to JSX text nodes.

    const displayName: string =
      ((artist.artist_name ?? "").trim() || "Artist").toUpperCase()

    const ogDesc  = (artist.seo_og_description ?? "").trim()
    const seoDesc = (artist.seo_description    ?? "").trim()
    const displayRole: string =
      (artist.hero_tagline ?? "").trim() ||
      (ogDesc.length  > 0 && ogDesc.length  <= SEO_MAX_CHARS ? ogDesc  : "") ||
      (seoDesc.length > 0 && seoDesc.length <= SEO_MAX_CHARS ? seoDesc : "") ||
      "DJ & Producer"

    const displayGenres: string = Array.isArray(artist.genres)
      ? artist.genres
          .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
          .slice(0, 3)
          .map((g) => g.trim())
          .join("  ·  ")
      : ""

    const displayLocation: string = (artist.location ?? "").trim()

    let displayUrl: string
    try {
      const rawUrl =
        (artist.seo_canonical_url ?? "").trim() ||
        (baseUrl.replace(/\/$/, "") + "/" + (artist.handle ?? "").trim())
      displayUrl = rawUrl.replace(/^https?:\/\//, "")
    } catch {
      displayUrl = (artist.handle ?? "").trim()
    }

    // ── Font size for artist name ────────────────────────────────────────────
    // Safe text width = W - PL - PR = 1040px.
    const nameLen = displayName.length
    const nameFontSize =
      nameLen > 28 ? 46
      : nameLen > 22 ? 56
      : nameLen > 18 ? 68
      : nameLen > 14 ? 78
      : nameLen > 10 ? 90
      : 102

    console.log(`[og-image] "${displayName}" ${nameLen}ch ${nameFontSize}px`)

    // ── Render ───────────────────────────────────────────────────────────────
    // Flat flex column. No position:absolute. No images. No shorthand padding.
    return new ImageResponse(
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingTop: PT,
          paddingBottom: PB,
          paddingLeft: PL,
          paddingRight: PR,
          backgroundColor: DARK_BG,
        }}
      >
        {/* ── Top bar: eyebrow + DJHQ brand ──────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: accentHex,
                marginRight: 8,
              }}
            />
            <div
              style={{
                display: "flex",
                color: accentHex,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
              }}
            >
              OFFICIAL ARTIST WEBSITE
            </div>
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          {/* Brand */}
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.20)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.22em",
            }}
          >
            DJHQ
          </div>
        </div>

        {/* ── Identity block ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Accent bar */}
          <div
            style={{
              display: "flex",
              width: 28,
              height: 2,
              backgroundColor: accentHex,
              marginBottom: 18,
            }}
          />

          {/* Artist name */}
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: nameFontSize,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              maxWidth: W - PL - PR,
              marginBottom: 16,
            }}
          >
            {displayName}
          </div>

          {/* Tagline / role */}
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.52)",
              fontSize: 21,
              fontWeight: 400,
              letterSpacing: "0.005em",
              maxWidth: W - PL - PR,
              marginBottom: displayLocation || displayGenres ? 12 : 0,
            }}
          >
            {displayRole}
          </div>

          {/* Location · genres (hidden if neither is configured) */}
          {displayLocation || displayGenres ? (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
              {displayLocation ? (
                <div
                  style={{
                    display: "flex",
                    color: "rgba(255,255,255,0.30)",
                    fontSize: 14,
                    letterSpacing: "0.04em",
                  }}
                >
                  {displayLocation}
                </div>
              ) : null}
              {displayLocation && displayGenres ? (
                <div
                  style={{
                    display: "flex",
                    color: "rgba(255,255,255,0.15)",
                    fontSize: 14,
                    marginLeft: 10,
                    marginRight: 10,
                  }}
                >
                  ·
                </div>
              ) : null}
              {displayGenres ? (
                <div
                  style={{
                    display: "flex",
                    color: "rgba(255,255,255,0.30)",
                    fontSize: 14,
                    letterSpacing: "0.04em",
                  }}
                >
                  {displayGenres}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── Footer: separator + section nav + URL ───────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              width: W - PL - PR,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.07)",
              marginBottom: 12,
            }}
          />
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.22)",
                fontSize: 11,
                letterSpacing: "0.17em",
              }}
            >
              Shows  ·  Releases  ·  Booking  ·  Artist Story
            </div>
            <div style={{ display: "flex", flex: 1 }} />
            <div
              style={{
                display: "flex",
                color: "rgba(" + accentRgb + ", 0.80)",
                fontSize: 13,
                letterSpacing: "0.03em",
              }}
            >
              {displayUrl}
            </div>
          </div>
        </div>
      </div>,
      { width: W, height: H },
    )
  } catch (err) {
    console.error(
      "[og-image] render error:",
      err instanceof Error ? err.message : String(err),
    )
    try {
      return panicCard((artist?.artist_name ?? "").trim())
    } catch (panicErr) {
      console.error(
        "[og-image] panic failed:",
        panicErr instanceof Error ? panicErr.message : String(panicErr),
      )
      throw panicErr  // escalates to route's own outer try/catch
    }
  }
}
