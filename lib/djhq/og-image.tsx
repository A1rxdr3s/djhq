/**
 * Shared dynamic OG image renderer for DJHQ artist profiles.
 *
 * Used by both:
 *   app/[handle]/opengraph-image.tsx  (handle-based route)
 *   app/opengraph-image.tsx           (root route for custom-domain support)
 *
 * Always runs in Node.js runtime (no edge runtime — Supabase JS requires Node).
 * Wraps all rendering in try/catch to guarantee a non-blank response.
 */

import { ImageResponse } from "next/og"
import { ACCENT_THEMES } from "@/lib/accent-themes"

// ─── Types ────────────────────────────────────────────────────────────────────

export type OgArtistData = {
  artist_name: string
  handle: string
  tagline: string | null
  genres: string[] | null
  location: string | null
  hero_image_url: string | null
  seo_canonical_url: string | null
  artist_accent_theme: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 1200
const H = 630
const IMG_W = 480
const CONTENT_W = W - IMG_W // 720
const DARK_BG = "#0c0c0c"
const FALLBACK_ACCENT = "#00E6A7"
const FALLBACK_ACCENT_RGB = "0, 230, 167"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Try to load a hero image URL; returns the URL if it responds OK, else null. */
async function safeHeroUrl(raw: string | null, baseUrl: string): Promise<string | null> {
  if (!raw) return null
  let url: string | null = null
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    url = raw
  } else if (raw.startsWith("/")) {
    url = `${baseUrl}${raw}`
  }
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return res.ok ? url : null
  } catch {
    return null
  }
}

/** Guaranteed non-blank dark card — used when everything else fails. */
function panicCard(name: string | null): Response {
  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: DARK_BG,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 3,
            background: FALLBACK_ACCENT,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {name ?? "ARTIST"}
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.35)",
            fontSize: 14,
            letterSpacing: "0.2em",
          }}
        >
          OFFICIAL ARTIST WEBSITE
        </div>
      </div>
    </div>,
    { width: W, height: H },
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Build a 1200×630 PNG ImageResponse for an artist OG card.
 * Never returns a blank image — always falls back to a dark card.
 */
export async function buildArtistOgImageResponse(
  artist: OgArtistData | null,
  baseUrl: string,
): Promise<Response> {
  // Outer catch: if even the JSX building fails, return a visible panic card.
  try {
    // ── Unknown/unpublished artist ───────────────────────────────────────────
    if (!artist) {
      return new ImageResponse(
        <div
          style={{
            width: W,
            height: H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: DARK_BG,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.3)",
              fontSize: 16,
              letterSpacing: "0.25em",
            }}
          >
            Artist profile unavailable
          </div>
        </div>,
        { width: W, height: H },
      )
    }

    // ── Resolve accent ───────────────────────────────────────────────────────
    const accentTheme =
      ACCENT_THEMES[(artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES] ??
      ACCENT_THEMES.matrix
    const accentHex = accentTheme.hex
    const accentRgb = accentTheme.glowRgb

    // ── Resolve display text ─────────────────────────────────────────────────
    const displayName = artist.artist_name.toUpperCase()
    const displayRole = artist.tagline ?? ""
    const displayGenres = (artist.genres ?? []).slice(0, 3).join("  ·  ")
    const displayLocation = artist.location ?? ""

    const rawUrl = artist.seo_canonical_url?.trim() || `${baseUrl}/${artist.handle}`
    const displayUrl = rawUrl.replace(/^https?:\/\//, "")

    // Name font size: scale down for long names to prevent overflow
    const nameFontSize =
      displayName.length > 20
        ? 54
        : displayName.length > 16
          ? 64
          : displayName.length > 12
            ? 76
            : 88

    // ── Hero image (optional, non-blocking) ──────────────────────────────────
    // Load before entering JSX to avoid ImageResponse fetch errors.
    const heroUrl = await safeHeroUrl(artist.hero_image_url, baseUrl)
    const contentW = heroUrl ? CONTENT_W : W

    // ── Render ───────────────────────────────────────────────────────────────
    return new ImageResponse(
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "row",
          background: `linear-gradient(135deg, ${DARK_BG} 0%, #111111 100%)`,
        }}
      >
        {/* ── Content column ────────────────────────────────────────────── */}
        <div
          style={{
            width: contentW,
            height: H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 56px 48px",
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
                borderRadius: 4,
                background: accentHex,
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

          {/* Middle: artist identity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Artist name */}
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: nameFontSize,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {displayName}
            </div>

            {/* Role / tagline */}
            {displayRole ? (
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 19,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                }}
              >
                {displayRole}
              </div>
            ) : null}

            {/* Location + genres */}
            {displayLocation || displayGenres ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  color: "rgba(255,255,255,0.28)",
                  fontSize: 13,
                  letterSpacing: "0.06em",
                }}
              >
                {displayLocation ? (
                  <div style={{ display: "flex" }}>{displayLocation}</div>
                ) : null}
                {displayLocation && displayGenres ? (
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.15)" }}>·</div>
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
              gap: 9,
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
                color: `rgba(${accentRgb}, 0.75)`,
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              {displayUrl}
            </div>
          </div>
        </div>

        {/* ── Hero image column ─────────────────────────────────────────── */}
        {heroUrl ? (
          <div
            style={{
              width: IMG_W,
              height: H,
              display: "flex",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              style={{
                width: IMG_W,
                height: H,
                objectFit: "cover",
                objectPosition: "center top",
              }}
              alt=""
            />
            {/* Left-edge gradient: image fades into the dark content column */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: IMG_W,
                height: H,
                background: `linear-gradient(to right, ${DARK_BG} 0%, rgba(12,12,12,0) 55%)`,
                display: "flex",
              }}
            />
          </div>
        ) : null}
      </div>,
      { width: W, height: H },
    )
  } catch {
    // Catastrophic fallback — guarantees a visible dark card on any render error.
    return panicCard(artist?.artist_name ?? null)
  }
}
