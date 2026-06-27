/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Used by both:
 *   app/[handle]/opengraph-image.tsx  (handle-based route)
 *   app/opengraph-image.tsx           (root route for custom-domain support)
 *
 * Always runs in Node.js runtime (no edge runtime — Supabase JS requires Node).
 *
 * Hero image is not included in the main JSX to avoid a satori streaming-layer
 * 500: satori fetches <img> URLs lazily, after the function returns, so those
 * failures bypass all try/catch. Hero images can be re-enabled once basic
 * rendering is fully confirmed stable in production.
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
const LEFT_W = 640
const RIGHT_W = 560       // W - LEFT_W
const DARK_BG = "#090909"
const FALLBACK_ACCENT_RGB = "0, 230, 167"

// ─── Ultra-minimal panic card ─────────────────────────────────────────────────
// No external resources, no images, no gradients — cannot fail in satori.

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
 * Visual layout:
 *   Left 640px  — artist identity: eyebrow, name, tagline, location/genres, section nav, URL
 *   Right 560px — site preview stack: SHOWS, ARTIST STORY, RELEASES, BOOKING bento cards
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

    // Name font size: scale down for longer names
    const nameFontSize =
      displayName.length > 22 ? 50
      : displayName.length > 18 ? 60
      : displayName.length > 14 ? 72
      : displayName.length > 10 ? 82
      : 94

    console.log(`[og-image] rendering card for "${rawName}" (${displayName.length} chars, ${nameFontSize}px)`)

    // ── Render ───────────────────────────────────────────────────────────────
    return new ImageResponse(
      // ── Canvas ─────────────────────────────────────────────────────────────
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "row",
          backgroundColor: DARK_BG,
          // Very subtle accent gradient in the top-left corner
          backgroundImage: `linear-gradient(145deg, rgba(${accentRgb}, 0.028) 0%, transparent 45%)`,
        }}
      >
        {/* ── LEFT: Artist identity (640px) ─────────────────────────────── */}
        <div
          style={{
            width: LEFT_W,
            height: H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 56px 48px",
          }}
        >
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

          {/* Main identity block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Artist name */}
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: nameFontSize,
                fontWeight: 800,
                letterSpacing: "-0.022em",
                lineHeight: 1,
              }}
            >
              {displayName}
            </div>

            {/* Tagline / role */}
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.52)",
                fontSize: 19,
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
            >
              {displayRole}
            </div>

            {/* Location · genres */}
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
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.30)", fontSize: 13, letterSpacing: "0.04em" }}>
                    {displayLocation}
                  </div>
                ) : null}
                {displayLocation && displayGenres ? (
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.14)", fontSize: 13 }}>·</div>
                ) : null}
                {displayGenres ? (
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.30)", fontSize: 13, letterSpacing: "0.04em" }}>
                    {displayGenres}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Bottom: section nav + URL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.07)" }} />
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.20)",
                fontSize: 10,
                letterSpacing: "0.19em",
              }}
            >
              Shows  ·  Releases  ·  Booking  ·  Artist Story
            </div>
            <div
              style={{
                display: "flex",
                color: `rgba(${accentRgb}, 0.80)`,
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              {displayUrl}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Site preview stack (560px) ─────────────────────────── */}
        <div
          style={{
            width: RIGHT_W,
            height: H,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 18,
            backgroundColor: "#0d0d0d",
            borderLeft: "1px solid rgba(255,255,255,0.055)",
          }}
        >
          {/* ── SHOWS card ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: 226,
              backgroundColor: "#111111",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {/* Accent top strip */}
            <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: accentHex }} />

            {/* Card inner */}
            <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px", flex: 1, gap: 14 }}>
              {/* Label row */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <div style={{ display: "flex", color: "rgba(255,255,255,0.20)", fontSize: 9, fontWeight: 700, letterSpacing: "0.24em" }}>
                  SHOWS
                </div>
                <div style={{ display: "flex", flex: 1 }} />
                <div style={{ display: "flex", width: 5, height: 5, borderRadius: "50%", backgroundColor: accentHex, opacity: 0.65 }} />
              </div>

              {/* Mock event rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {/* Row 1 */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", width: 38, height: 6, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 2 }} />
                  <div style={{ display: "flex", width: 110, height: 6, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 2 }} />
                  <div style={{ display: "flex", flex: 1 }} />
                  <div style={{ display: "flex", width: 64, height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }} />
                </div>
                {/* Row 2 */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", width: 38, height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                  <div style={{ display: "flex", width: 130, height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2 }} />
                  <div style={{ display: "flex", flex: 1 }} />
                  <div style={{ display: "flex", width: 52, height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                </div>
                {/* Row 3 */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", width: 38, height: 6, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
                  <div style={{ display: "flex", width: 90, height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }} />
                  <div style={{ display: "flex", flex: 1 }} />
                  <div style={{ display: "flex", width: 70, height: 6, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
                </div>
                {/* Row 4 – faintest */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", width: 38, height: 6, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 2 }} />
                  <div style={{ display: "flex", width: 100, height: 6, backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 2 }} />
                  <div style={{ display: "flex", flex: 1 }} />
                  <div style={{ display: "flex", width: 56, height: 6, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 2 }} />
                </div>
              </div>

              <div style={{ display: "flex", flex: 1 }} />

              {/* Bottom accent line */}
              <div style={{ display: "flex", width: 36, height: 1, backgroundColor: `rgba(${accentRgb}, 0.28)` }} />
            </div>
          </div>

          {/* ── Bento row: ARTIST STORY + RELEASES ─────────────────────── */}
          <div style={{ display: "flex", flexDirection: "row", gap: 8, width: "100%", height: 194 }}>
            {/* ARTIST STORY card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#101010",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                overflow: "hidden",
                padding: "16px 18px",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", color: "rgba(255,255,255,0.18)", fontSize: 8, fontWeight: 700, letterSpacing: "0.24em" }}>
                ARTIST STORY
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", width: "88%", height: 5, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 2 }} />
                <div style={{ display: "flex", width: "72%", height: 5, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                <div style={{ display: "flex", width: "60%", height: 5, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
                <div style={{ display: "flex", width: "78%", height: 5, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                <div style={{ display: "flex", width: "50%", height: 5, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", flex: 1 }} />
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", width: 4, height: 4, borderRadius: "50%", backgroundColor: accentHex, opacity: 0.5 }} />
                <div style={{ display: "flex", width: "45%", height: 4, backgroundColor: `rgba(${accentRgb}, 0.11)`, borderRadius: 2 }} />
              </div>
            </div>

            {/* RELEASES card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#121212",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                overflow: "hidden",
                padding: "16px 18px",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <div style={{ display: "flex", color: "rgba(255,255,255,0.18)", fontSize: 8, fontWeight: 700, letterSpacing: "0.24em" }}>
                  RELEASES
                </div>
                <div style={{ display: "flex", flex: 1 }} />
                <div style={{ display: "flex", width: 4, height: 4, borderRadius: "50%", backgroundColor: accentHex, opacity: 0.55 }} />
              </div>
              {/* Mock release items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", width: 30, height: 30, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", width: 72, height: 5, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2 }} />
                    <div style={{ display: "flex", width: 50, height: 4, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", width: 30, height: 30, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 3 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", width: 60, height: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }} />
                    <div style={{ display: "flex", width: 42, height: 4, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── BOOKING strip ───────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              backgroundColor: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 6,
              padding: "0 20px",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", width: 5, height: 5, borderRadius: "50%", backgroundColor: accentHex, opacity: 0.75 }} />
            <div style={{ display: "flex", color: "rgba(255,255,255,0.22)", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em" }}>
              BOOKING
            </div>
            <div style={{ display: "flex", color: "rgba(255,255,255,0.10)", fontSize: 9 }}>·</div>
            <div style={{ display: "flex", color: "rgba(255,255,255,0.14)", fontSize: 9, letterSpacing: "0.18em" }}>
              PRESS
            </div>
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", color: `rgba(${accentRgb}, 0.35)`, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em" }}>
              DJHQ
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
