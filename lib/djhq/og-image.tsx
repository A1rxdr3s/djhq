/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Routes that use this:
 *   app/[handle]/opengraph-image.tsx  — handle-based route
 *   app/opengraph-image.tsx           — root route for custom-domain support
 *
 * Runtime: Node.js only (no edge runtime — Supabase JS requires Node APIs).
 *
 * ─── STABILITY RULES ───────────────────────────────────────────────────────
 *
 * ImageResponse renders lazily via a ReadableStream. Satori/resvg-wasm runs
 * WHEN VERCEL CONSUMES THE BODY — after this function returns. Errors in that
 * streaming phase bypass ALL try/catch in user code and produce Vercel's 500
 * HTML page instead of image/png.
 *
 * To prevent streaming 500s, this renderer uses ONLY:
 *   - display: "flex" (no position: "absolute")
 *   - solid backgroundColor (no backgroundImage on the main layout)
 *   - individual padding properties (paddingTop etc.), no shorthand
 *   - fontWeight 400 or 700 only (no 800/900 without custom font loaded)
 *   - rgba() for semi-transparent colors (no opacity: on elements)
 *   - no <img> elements of any kind (data URLs can still crash resvg)
 *   - no external font fetches
 *   - no CSS variables, no Tailwind, no pseudo-elements
 *
 * Visual improvements (hero image, gradients, bento cards) can be
 * reintroduced incrementally once basic rendering is confirmed stable.
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
  hero_image_url: string | null
  seo_canonical_url: string | null
  seo_og_description: string | null
  seo_description: string | null
  artist_accent_theme: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 1200
const H = 630
const PL = 80    // paddingLeft
const PR = 80    // paddingRight
const PT = 56    // paddingTop
const PB = 50    // paddingBottom

const DARK_BG = "#090909"
const FALLBACK_ACCENT = "#00E6A7"
const FALLBACK_ACCENT_RGB = "0, 230, 167"
const SEO_ROLE_LIMIT = 80   // chars — skip SEO desc if longer than this

// ─── Pure panic card ──────────────────────────────────────────────────────────
// Absolute minimum: solid bg, two text nodes. Cannot fail in satori.

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
      <div style={{ display: "flex", color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 16 }}>
        Official Artist Profile  ·  DJHQ
      </div>
    </div>,
    { width: W, height: H },
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Returns a 1200×630 PNG ImageResponse. Never throws — any render failure
 * falls back to panicCard, and panicCard failures are re-thrown to the route's
 * own outer try/catch which produces a standalone fallback.
 *
 * Layout (pure flex, no absolute positioning, no images):
 *   Top:    ● OFFICIAL ARTIST WEBSITE                     DJHQ
 *   Middle: accent bar · artist name · tagline · location/genres
 *   Bottom: separator · sections nav · canonical URL
 */
export async function buildArtistOgImageResponse(
  artist: OgArtistData | null,
  baseUrl: string,
): Promise<Response> {
  try {
    // ── No artist ───────────────────────────────────────────────────────────
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
          <div style={{ display: "flex", color: "rgba(255,255,255,0.28)", fontSize: 15, letterSpacing: "0.22em" }}>
            Artist profile unavailable
          </div>
          <div style={{ display: "flex", color: "rgba(0,230,167,0.40)", fontSize: 11, marginTop: 14, letterSpacing: "0.18em" }}>
            DJHQ
          </div>
        </div>,
        { width: W, height: H },
      )
    }

    // ── Resolve accent ───────────────────────────────────────────────────────
    // Null-safe: fall back to matrix (DJHQ green) if theme is unknown.
    const accentKey = String(artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES
    const accentTheme = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES.matrix
    const accentHex: string = accentTheme.hex ?? FALLBACK_ACCENT
    const accentRgb: string = accentTheme.glowRgb ?? FALLBACK_ACCENT_RGB

    // ── Sanitize all display strings ─────────────────────────────────────────
    // Every value goes through null coalescing + .trim() + typed as string.
    // Never pass null/undefined to JSX text nodes.

    const displayName: string =
      ((artist.artist_name ?? "").trim() || "Artist").toUpperCase()

    const ogDescTrim = (artist.seo_og_description ?? "").trim()
    const seoDescTrim = (artist.seo_description ?? "").trim()
    const displayRole: string =
      (artist.hero_tagline ?? "").trim() ||
      (ogDescTrim.length > 0 && ogDescTrim.length <= SEO_ROLE_LIMIT ? ogDescTrim : "") ||
      (seoDescTrim.length > 0 && seoDescTrim.length <= SEO_ROLE_LIMIT ? seoDescTrim : "") ||
      "DJ & Producer"

    const displayGenres: string = Array.isArray(artist.genres)
      ? artist.genres
          .filter((g) => typeof g === "string" && (g as string).trim().length > 0)
          .slice(0, 3)
          .map((g) => (g as string).trim())
          .join("  ·  ")
      : ""

    const displayLocation: string = (artist.location ?? "").trim()

    let displayUrl: string
    try {
      const rawUrl = (artist.seo_canonical_url ?? "").trim() || (baseUrl + "/" + (artist.handle ?? ""))
      displayUrl = rawUrl.replace(/^https?:\/\//, "")
    } catch {
      displayUrl = (artist.handle ?? "").trim()
    }

    // ── Font size — scales for long display names ────────────────────────────
    const nameLen = displayName.length
    const nameFontSize: number =
      nameLen > 28 ? 46
      : nameLen > 22 ? 56
      : nameLen > 18 ? 66
      : nameLen > 14 ? 76
      : nameLen > 10 ? 88
      : 100

    console.log(`[og-image] rendering "${displayName}" ${nameLen}ch ${nameFontSize}px`)

    // ── Render ───────────────────────────────────────────────────────────────
    // Flat flex column. No position:absolute. No <img>. No shorthand padding.
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
          {/* Short accent bar */}
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
              marginBottom: displayLocation || displayGenres ? 12 : 0,
            }}
          >
            {displayRole}
          </div>

          {/* Location · genres — only if at least one is configured */}
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

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Separator */}
          <div
            style={{
              display: "flex",
              width: W - PL - PR,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.07)",
              marginBottom: 12,
            }}
          />

          {/* Sections + URL row */}
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
    console.error("[og-image] render error:", err instanceof Error ? err.message : String(err))
    try {
      return panicCard((artist?.artist_name ?? "").trim())
    } catch (panicErr) {
      console.error("[og-image] panic card failed:", panicErr instanceof Error ? panicErr.message : String(panicErr))
      throw panicErr   // escalates to route's own outer try/catch
    }
  }
}
