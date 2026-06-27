/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Used by both:
 *   app/[handle]/opengraph-image.tsx  (handle-based route)
 *   app/opengraph-image.tsx           (root route for custom-domain support)
 *
 * Always runs in Node.js runtime (no edge runtime — Supabase JS requires Node).
 *
 * Hero image safety: images are pre-fetched and converted to base64 data URLs
 * BEFORE creating the ImageResponse. This means satori never makes network
 * requests during the lazy streaming render phase, which was the root cause of
 * the previous 500 errors. If the pre-fetch fails for any reason, we render
 * without the image — the route never crashes.
 */

import { ImageResponse } from "next/og"
import { ACCENT_THEMES } from "@/lib/accent-themes"

// ─── Types ────────────────────────────────────────────────────────────────────

export type OgArtistData = {
  artist_name: string
  handle: string
  hero_tagline: string | null    // HQ-editable tagline (Hero section)
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
const PAD_X = 88   // horizontal safe-area padding
const PAD_Y = 54   // vertical padding (top/bottom)
const DARK_BG = "#090909"
const FALLBACK_ACCENT_RGB = "0, 230, 167"

// Max raw image size we'll accept — prevents OOM in satori/resvg.
const MAX_IMAGE_BYTES = 6_000_000
// Network timeout for hero image pre-fetch.
const IMAGE_FETCH_TIMEOUT_MS = 3500

// ─── Hero image pre-fetch ─────────────────────────────────────────────────────
//
// Called before new ImageResponse() so satori never makes network requests
// during the streaming render phase. Returns a data URL or null.

async function fetchHeroImageDataUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("https://")) return null
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (!res.ok) return null
    // Skip oversized images.
    const cl = res.headers.get("content-length")
    if (cl && parseInt(cl, 10) > MAX_IMAGE_BYTES) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_IMAGE_BYTES) return null
    const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0]
    const b64 = Buffer.from(buf).toString("base64")
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

// ─── Ultra-minimal panic card ─────────────────────────────────────────────────
// No external resources whatsoever — cannot fail in satori.

function minimalFallbackCard(label: string | null): Response {
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
        gap: 16,
      }}
    >
      <div style={{ display: "flex", color: "#ffffff", fontSize: 40, fontWeight: 700 }}>
        {label ?? "Artist Website"}
      </div>
      <div style={{ display: "flex", color: "rgba(255,255,255,0.38)", fontSize: 15, letterSpacing: "0.18em" }}>
        Official Artist Profile
      </div>
    </div>,
    { width: W, height: H },
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Build a 1200×630 PNG ImageResponse for an artist OG card.
 *
 * Visual layout: hero-style full-canvas cinematic composition.
 *   Background  — near-black base + optional hero image as dark atmosphere
 *   Top bar     — eyebrow (● OFFICIAL ARTIST WEBSITE) + DJHQ brand
 *   Middle      — artist identity: accent bar, name, tagline, location/genres
 *   Bottom      — separator, section labels, canonical URL
 *
 * Falls back to minimalFallbackCard on any render error. Does not throw.
 */
export async function buildArtistOgImageResponse(
  artist: OgArtistData | null,
  baseUrl: string,
): Promise<Response> {
  try {
    // ── No artist ───────────────────────────────────────────────────────────
    if (!artist) {
      console.log("[og-image] artist not resolved — rendering unavailable fallback")
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
            gap: 16,
          }}
        >
          <div style={{ display: "flex", color: "rgba(255,255,255,0.28)", fontSize: 16, letterSpacing: "0.25em" }}>
            Artist profile unavailable
          </div>
          <div style={{ display: "flex", color: `rgba(${FALLBACK_ACCENT_RGB}, 0.4)`, fontSize: 11, letterSpacing: "0.2em" }}>
            DJHQ
          </div>
        </div>,
        { width: W, height: H },
      )
    }

    // ── Resolve accent ───────────────────────────────────────────────────────
    const accentKey = (artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES
    const accentTheme = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES.matrix
    const accentHex = accentTheme.hex
    const accentRgb = accentTheme.glowRgb

    // ── Pre-fetch hero image (safe, outside streaming phase) ─────────────────
    const heroDataUrl = await fetchHeroImageDataUrl(artist.hero_image_url)
    console.log(`[og-image] hero image: ${heroDataUrl ? "loaded" : "absent"}`)

    // ── Resolve display text ─────────────────────────────────────────────────
    const rawName = artist.artist_name?.trim() || "Artist"
    const displayName = rawName.toUpperCase()

    // Secondary line: only configured data, strict fallback chain, no invented copy.
    const SEO_LENGTH_LIMIT = 80
    const displayRole =
      artist.hero_tagline?.trim() ||
      (artist.seo_og_description?.trim() && artist.seo_og_description.trim().length <= SEO_LENGTH_LIMIT
        ? artist.seo_og_description.trim()
        : null) ||
      (artist.seo_description?.trim() && artist.seo_description.trim().length <= SEO_LENGTH_LIMIT
        ? artist.seo_description.trim()
        : null) ||
      "DJ & Producer"

    const displayGenres = Array.isArray(artist.genres)
      ? artist.genres.slice(0, 3).join("  ·  ")
      : ""
    const displayLocation = artist.location?.trim() || ""

    const rawUrl = artist.seo_canonical_url?.trim() || `${baseUrl}/${artist.handle}`
    const displayUrl = rawUrl.replace(/^https?:\/\//, "")

    // Name font size: safe-text-width = W - 2 * PAD_X = 1024px.
    // Scales down for longer display names.
    const nameLen = displayName.length
    const nameFontSize =
      nameLen > 28 ? 48
      : nameLen > 22 ? 58
      : nameLen > 18 ? 68
      : nameLen > 14 ? 80
      : nameLen > 10 ? 92
      : 104

    console.log(`[og-image] rendering "${rawName}" (${nameLen} chars, ${nameFontSize}px)`)

    // ── Render ───────────────────────────────────────────────────────────────
    return new ImageResponse(

      // ── Canvas ─────────────────────────────────────────────────────────────
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          display: "flex",
          backgroundColor: DARK_BG,
        }}
      >
        {/* ── Layer 1: Hero image (pre-fetched data URL — no satori network fetch) */}
        {heroDataUrl ? (
          <img
            src={heroDataUrl}
            width={W}
            height={H}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              objectFit: "cover",
              // Keep it very subtle — atmosphere, not dominant
              opacity: 0.22,
            }}
          />
        ) : null}

        {/* ── Layer 2a: Bottom-up gradient (footer legibility) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            backgroundImage:
              "linear-gradient(to top, rgba(9,9,9,1) 0%, rgba(9,9,9,0.88) 28%, rgba(9,9,9,0.4) 60%, rgba(9,9,9,0.15) 100%)",
          }}
        />

        {/* ── Layer 2b: Left-to-right gradient (text-area legibility) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(9,9,9,0.88) 0%, rgba(9,9,9,0.55) 40%, rgba(9,9,9,0.10) 100%)",
          }}
        />

        {/* ── Layer 2c: Accent glow — top-left corner (when no image) */}
        {!heroDataUrl ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              display: "flex",
              backgroundImage: `linear-gradient(145deg, rgba(${accentRgb}, 0.055) 0%, transparent 45%)`,
            }}
          />
        ) : null}

        {/* ── Layer 3: Left accent edge line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 2,
            height: H,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom, ${accentHex} 0%, rgba(${accentRgb}, 0.0) 100%)`,
            opacity: 0.55,
          }}
        />

        {/* ── Layer 4: Content ────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            flexDirection: "column",
            padding: `${PAD_Y}px ${PAD_X}px ${PAD_Y - 4}px`,
          }}
        >
          {/* ── Top bar: eyebrow + DJHQ ─────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            {/* Eyebrow */}
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: accentHex,
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
            {/* DJHQ brand mark */}
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.22)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
              }}
            >
              DJHQ
            </div>
          </div>

          {/* ── Flex spacer: pushes identity block toward lower third ───── */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* ── Artist identity block ────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Short accent bar above name */}
            <div
              style={{
                display: "flex",
                width: 28,
                height: 2,
                backgroundColor: accentHex,
                opacity: 0.9,
              }}
            />

            {/* Artist name — full safe-text-width, no overflow container */}
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: nameFontSize,
                fontWeight: 800,
                letterSpacing: "-0.022em",
                lineHeight: 1,
                // Explicit max width to prevent layout artifacts
                maxWidth: W - PAD_X * 2,
              }}
            >
              {displayName}
            </div>

            {/* Tagline / role */}
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.55)",
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "0.01em",
                maxWidth: W - PAD_X * 2,
              }}
            >
              {displayRole}
            </div>

            {/* Location · genres (only if configured) */}
            {displayLocation || displayGenres ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 2,
                }}
              >
                {displayLocation ? (
                  <div
                    style={{
                      display: "flex",
                      color: "rgba(255,255,255,0.32)",
                      fontSize: 14,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {displayLocation}
                  </div>
                ) : null}
                {displayLocation && displayGenres ? (
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.16)", fontSize: 14 }}>
                    ·
                  </div>
                ) : null}
                {displayGenres ? (
                  <div
                    style={{
                      display: "flex",
                      color: "rgba(255,255,255,0.32)",
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

          {/* ── Fixed gap between identity and footer ──────────────────── */}
          <div style={{ display: "flex", height: 32 }} />

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {/* Separator */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
            {/* Sections row + URL */}
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.22)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                }}
              >
                Shows  ·  Releases  ·  Booking  ·  Artist Story
              </div>
              <div style={{ display: "flex", flex: 1 }} />
              <div
                style={{
                  display: "flex",
                  color: `rgba(${accentRgb}, 0.82)`,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                }}
              >
                {displayUrl}
              </div>
            </div>
          </div>
        </div>
      </div>,

      { width: W, height: H },
    )
  } catch (err) {
    console.error("[og-image] render error:", err instanceof Error ? err.message : String(err))
    try {
      return minimalFallbackCard(artist?.artist_name ?? null)
    } catch (panicErr) {
      console.error("[og-image] panic card failed:", panicErr instanceof Error ? panicErr.message : String(panicErr))
      throw panicErr
    }
  }
}
