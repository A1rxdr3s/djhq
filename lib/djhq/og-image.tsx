/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Used by both:
 *   app/[handle]/opengraph-image.tsx  (handle-based route)
 *   app/opengraph-image.tsx           (root route for custom-domain support)
 *
 * Always runs in Node.js runtime (no edge runtime — Supabase JS requires Node).
 *
 * Hero image deliberately excluded from this renderer to avoid a satori
 * streaming-layer 500: satori fetches <img> URLs lazily during body
 * consumption, AFTER the function returns, so those failures bypass all
 * try/catch. Hero images can be re-enabled once basic rendering is stable.
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
const DARK_BG = "#0c0c0c"
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
      <div
        style={{
          display: "flex",
          color: "#ffffff",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        {label ?? "Artist Website"}
      </div>
      <div
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.38)",
          fontSize: 15,
          letterSpacing: "0.18em",
        }}
      >
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
 * Layout: full-width (no hero image) dark premium card.
 * Falls back to `minimalFallbackCard` on any render error.
 * Does not throw — callers can call this unconditionally.
 */
export async function buildArtistOgImageResponse(
  artist: OgArtistData | null,
  baseUrl: string,
): Promise<Response> {
  try {
    // ── Unknown/unpublished artist ──────────────────────────────────────────
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
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.28)",
              fontSize: 16,
              letterSpacing: "0.25em",
            }}
          >
            Artist profile unavailable
          </div>
          <div
            style={{
              display: "flex",
              color: `rgba(${FALLBACK_ACCENT_RGB}, 0.4)`,
              fontSize: 11,
              letterSpacing: "0.2em",
            }}
          >
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

    // ── Resolve display text (all null-safe) ─────────────────────────────────
    const rawName = artist.artist_name?.trim() || "Artist"
    const displayName = rawName.toUpperCase()

    // Secondary line fallback chain — only real configured data, never invented copy.
    // 1. HQ-editable tagline (hero_tagline) — what the artist set in HQ
    // 2. seo_og_description — if short enough to fit the card (≤ 80 chars)
    // 3. seo_description — if short enough (≤ 80 chars)
    // 4. Generic safe fallback
    const SEO_LENGTH_LIMIT = 80
    const displayRole =
      artist.hero_tagline?.trim() ||
      (artist.seo_og_description?.trim() && (artist.seo_og_description.trim().length <= SEO_LENGTH_LIMIT)
        ? artist.seo_og_description.trim()
        : null) ||
      (artist.seo_description?.trim() && (artist.seo_description.trim().length <= SEO_LENGTH_LIMIT)
        ? artist.seo_description.trim()
        : null) ||
      "DJ & Producer"
    const displayGenres = Array.isArray(artist.genres)
      ? artist.genres.slice(0, 3).join("  ·  ")
      : ""
    const displayLocation = artist.location?.trim() || ""

    const rawUrl = artist.seo_canonical_url?.trim() || `${baseUrl}/${artist.handle}`
    const displayUrl = rawUrl.replace(/^https?:\/\//, "")

    // Name font size: scale down for very long names
    const nameFontSize =
      displayName.length > 22
        ? 52
        : displayName.length > 18
          ? 62
          : displayName.length > 14
            ? 74
            : displayName.length > 10
              ? 84
              : 96

    console.log(`[og-image] rendering card for "${rawName}"`)

    // ── Full-width layout (no hero image) ────────────────────────────────────
    return new ImageResponse(
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 80px 52px",
          backgroundColor: DARK_BG,
        }}
      >
        {/* Top: "Official Artist Website" label */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: accentHex,
              display: "flex",
            }}
          />
          <div
            style={{
              display: "flex",
              color: accentHex,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.22em",
            }}
          >
            OFFICIAL ARTIST WEBSITE
          </div>
        </div>

        {/* Middle: artist name + role + location/genres */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: nameFontSize,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {displayName}
          </div>

          {displayRole ? (
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.5)",
                fontSize: 21,
                fontWeight: 400,
                letterSpacing: "0.005em",
              }}
            >
              {displayRole}
            </div>
          ) : null}

          {displayLocation || displayGenres ? (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                color: "rgba(255,255,255,0.28)",
                fontSize: 14,
                letterSpacing: "0.05em",
              }}
            >
              {displayLocation ? (
                <div style={{ display: "flex" }}>{displayLocation}</div>
              ) : null}
              {displayLocation && displayGenres ? (
                <div style={{ display: "flex", color: "rgba(255,255,255,0.16)" }}>·</div>
              ) : null}
              {displayGenres ? (
                <div style={{ display: "flex" }}>{displayGenres}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Bottom: sections + URL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.22)",
              fontSize: 10,
              letterSpacing: "0.2em",
            }}
          >
            Shows · Releases · Booking · Artist Story
          </div>
          <div
            style={{
              display: "flex",
              color: `rgba(${accentRgb}, 0.78)`,
              fontSize: 14,
              letterSpacing: "0.04em",
            }}
          >
            {displayUrl}
          </div>
        </div>
      </div>,
      { width: W, height: H },
    )
  } catch (err) {
    // Inner catch: main rendering failed — try a panic card.
    // This catch is for synchronous errors only (async stream errors bypass this).
    console.error("[og-image] render error:", err instanceof Error ? err.message : String(err))
    try {
      return minimalFallbackCard(artist?.artist_name ?? null)
    } catch (panicErr) {
      // panicCard also failed — last resort Response with empty dark PNG body.
      // This should never happen in practice, but if it does, let it propagate
      // to the route's own outer try/catch.
      console.error("[og-image] panic card also failed:", panicErr instanceof Error ? panicErr.message : String(panicErr))
      throw panicErr
    }
  }
}
