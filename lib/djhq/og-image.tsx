/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Routes:
 *   app/[handle]/opengraph-image.tsx  — handle-based route
 *   app/opengraph-image.tsx           — root route for custom-domain support
 *
 * Runtime: Node.js only. No `export const runtime = "edge"`.
 *
 * ─── STABILITY CONTRACT ────────────────────────────────────────────────────
 *
 * ImageResponse renders lazily inside a ReadableStream. Satori/resvg-wasm
 * runs when Vercel consumes the body — AFTER this function returns. Errors
 * in that streaming phase bypass all try/catch in user code and surface as
 * Vercel 500 HTML. To prevent this:
 *
 *   1. No <img> elements of any kind (even data-URL src can crash resvg).
 *   2. No position:"absolute" (causes complex layout calculation failures).
 *   3. Hero image is passed as CSS `backgroundImage: url(data:...)` on the
 *      canvas div, which satori/resvg handles via CSS compositing — a
 *      different, more reliable code path than an <img> node.
 *   4. No padding shorthand. Use paddingTop/paddingLeft/etc. individually.
 *   5. No opacity: on elements. Use rgba() inside color/background strings.
 *   6. fontWeight 400 or 700 only (no 800+ without a loaded custom font).
 *   7. All display strings fully sanitized (null → "", unknown types → "").
 *
 * ─── VISUAL APPROACH ───────────────────────────────────────────────────────
 *
 * Hero-based split composition (1200×630):
 *
 *   Canvas (flex row):
 *     backgroundImage: url(heroDataUrl) — covers full canvas
 *     backgroundSize: cover, backgroundPosition: center
 *
 *   Left panel  660px — dark overlay + all text content
 *   Right panel 540px — lighter overlay → hero image shows through as
 *                       cinematic atmosphere (no text clutter)
 *
 * No-image fallback: both panels solid dark, right panel has subtle accent
 * gradient. Result is a premium typographic card that still reads clearly.
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

// ─── Layout constants ─────────────────────────────────────────────────────────

const W = 1200
const H = 630
const LEFT_W  = 660    // content panel
const RIGHT_W = 540    // atmospheric panel

const PL   = 80        // left panel: padding-left
const PR_L = 64        // left panel: padding-right
const PT   = 56        // both panels: padding-top
const PB   = 50        // both panels: padding-bottom

const DARK_BG          = "#090909"
const FALLBACK_ACCENT  = "#00E6A7"
const FALLBACK_RGB     = "0, 230, 167"
const SEO_ROLE_LIMIT   = 80   // chars — skip SEO description if longer

// ─── Hero image pre-fetch ─────────────────────────────────────────────────────
//
// Pre-fetching converts the remote URL to a base64 data URL before
// ImageResponse is created. The data URL is then used as CSS backgroundImage
// on the canvas div — never as an <img> src attribute, which would be fetched
// by satori during the streaming render phase.

const MAX_IMG_BYTES    = 3_500_000   // 3.5 MB raw → ~4.7 MB base64
const IMG_FETCH_TIMEOUT = 4_000      // ms

async function fetchHeroImageDataUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("https://")) return null
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), IMG_FETCH_TIMEOUT)
    const res  = await fetch(url, { signal: ctrl.signal })
    clearTimeout(tid)

    if (!res.ok) return null

    // Only accept standard image types that resvg handles reliably.
    const ct = (res.headers.get("content-type") || "").toLowerCase()
    const isImage =
      ct.includes("jpeg") || ct.includes("jpg") ||
      ct.includes("png")  || ct.includes("webp")
    if (!isImage) return null

    // Reject oversized images before reading the body.
    const cl = res.headers.get("content-length")
    if (cl && parseInt(cl, 10) > MAX_IMG_BYTES) return null

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_IMG_BYTES) return null

    const mime = ct.split(";")[0].trim() || "image/jpeg"
    const b64  = Buffer.from(buf).toString("base64")
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

// ─── Pure panic card ──────────────────────────────────────────────────────────
// Minimum possible render surface. No gradients, no images, no borders.

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

    // ── Accent ───────────────────────────────────────────────────────────────
    const accentKey   = String(artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES
    const accentTheme = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES.matrix
    const accentHex   = accentTheme.hex   ?? FALLBACK_ACCENT
    const accentRgb   = accentTheme.glowRgb ?? FALLBACK_RGB

    // ── Pre-fetch hero image ─────────────────────────────────────────────────
    // Happens before new ImageResponse(), so resvg never makes network
    // requests during the streaming render phase.
    const heroDataUrl = await fetchHeroImageDataUrl(artist.hero_image_url ?? null)
    console.log(`[og-image] hero image ${heroDataUrl ? "loaded" : "absent"}`)

    // ── Sanitize display strings ─────────────────────────────────────────────
    // All values null-coalesced before trim/toUpperCase. Never passes
    // null/undefined to JSX text nodes.

    const displayName: string =
      ((artist.artist_name ?? "").trim() || "Artist").toUpperCase()

    const ogDesc  = (artist.seo_og_description ?? "").trim()
    const seoDesc = (artist.seo_description   ?? "").trim()
    const displayRole: string =
      (artist.hero_tagline ?? "").trim() ||
      (ogDesc.length  > 0 && ogDesc.length  <= SEO_ROLE_LIMIT ? ogDesc  : "") ||
      (seoDesc.length > 0 && seoDesc.length <= SEO_ROLE_LIMIT ? seoDesc : "") ||
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
      const rawUrl = (artist.seo_canonical_url ?? "").trim() ||
        (baseUrl.replace(/\/$/, "") + "/" + (artist.handle ?? "").trim())
      displayUrl = rawUrl.replace(/^https?:\/\//, "")
    } catch {
      displayUrl = (artist.handle ?? "").trim()
    }

    // ── Font size — fits safe-text width (LEFT_W - PL - PR_L = 516px) ───────
    const nameLen      = displayName.length
    const nameFontSize =
      nameLen > 28 ? 44
      : nameLen > 22 ? 54
      : nameLen > 18 ? 64
      : nameLen > 14 ? 74
      : nameLen > 10 ? 86
      : 98

    console.log(`[og-image] "${displayName}" ${nameLen}ch ${nameFontSize}px hero=${heroDataUrl ? "yes" : "no"}`)

    // ── Canvas background style ──────────────────────────────────────────────
    // When hero image available: CSS background covers the full 1200×630.
    // The child panels act as semi-transparent overlays — standard CSS
    // compositing, handled entirely inside resvg without any <img> node.
    const canvasStyle = heroDataUrl
      ? {
          width: W,
          height: H,
          display: "flex",
          flexDirection: "row" as const,
          backgroundColor: DARK_BG,
          backgroundImage: `url(${heroDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {
          width: W,
          height: H,
          display: "flex",
          flexDirection: "row" as const,
          backgroundColor: DARK_BG,
        }

    // ── Overlay opacities (vary by image presence) ───────────────────────────
    // Left panel: heavier overlay → text always readable.
    // Right panel: lighter overlay → hero image visible as atmosphere.
    const leftBg  = heroDataUrl ? "rgba(9,9,9,0.86)" : DARK_BG
    // No-image right panel gets a very faint accent gradient for visual interest.
    const rightBg = heroDataUrl
      ? "rgba(9,9,9,0.38)"
      : "rgba(9,9,9,1)"

    // ── Render ───────────────────────────────────────────────────────────────
    return new ImageResponse(

      // Canvas: flex row. Background image (if available) fills it.
      <div style={canvasStyle}>

        {/* ── LEFT PANEL: all content ───────────────────────────────────── */}
        <div
          style={{
            width: LEFT_W,
            height: H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingTop: PT,
            paddingBottom: PB,
            paddingLeft: PL,
            paddingRight: PR_L,
            backgroundColor: leftBg,
          }}
        >
          {/* Top bar: eyebrow + DJHQ */}
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

          {/* Identity block */}
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

            {/* Artist name
                maxWidth prevents layout overflow — text will wrap at LEFT_W - PL - PR_L */}
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: nameFontSize,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                maxWidth: LEFT_W - PL - PR_L,
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
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: "0.005em",
                maxWidth: LEFT_W - PL - PR_L,
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
                      fontSize: 13,
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
                      fontSize: 13,
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
                      fontSize: 13,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {displayGenres}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Footer: separator + section nav + URL */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                width: LEFT_W - PL - PR_L,
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
                  fontSize: 12,
                  letterSpacing: "0.03em",
                }}
              >
                {displayUrl}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: atmospheric ─────────────────────────────────── */}
        {/* No text content. When hero image is loaded, the lower opacity here
            lets the image show through as cinematic atmosphere. When no image,
            this panel is a plain dark surface with faint right-edge accent. */}
        <div
          style={{
            width: RIGHT_W,
            height: H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            paddingBottom: PB,
            paddingRight: 36,
            backgroundColor: rightBg,
            borderLeftWidth: 1,
            borderLeftStyle: "solid",
            borderLeftColor: heroDataUrl
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.06)",
            // No-image: faint accent gradient as right-panel visual interest
            backgroundImage: heroDataUrl
              ? undefined
              : `linear-gradient(135deg, rgba(${accentRgb}, 0.04) 0%, transparent 55%)`,
          }}
        >
          {/* Subtle brand mark — bottom right */}
          <div
            style={{
              display: "flex",
              color: heroDataUrl
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.16)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.24em",
            }}
          >
            DJHQ
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
      console.error("[og-image] panic failed:", panicErr instanceof Error ? panicErr.message : String(panicErr))
      throw panicErr   // escalates to route's outer try/catch
    }
  }
}
