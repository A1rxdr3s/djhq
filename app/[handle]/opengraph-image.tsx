import { ImageResponse } from "next/og"
import { createClient } from "@supabase/supabase-js"
import { ACCENT_THEMES } from "@/lib/accent-themes"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// ─── Data ────────────────────────────────────────────────────────────────────

type OgRow = {
  artist_name: string
  handle: string
  tagline: string | null
  genres: string[] | null
  location: string | null
  hero_image_url: string | null
  seo_og_title: string | null
  seo_title: string | null
  seo_canonical_url: string | null
  artist_accent_theme: string | null
}

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getOgArtistData(handle: string): Promise<OgRow | null> {
  const client = makeSupabaseClient()
  if (!client) return null
  const { data } = await client
    .from("artists")
    .select(
      "artist_name, handle, tagline, genres, location, hero_image_url, seo_og_title, seo_title, seo_canonical_url, artist_accent_theme",
    )
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle()
  return (data as OgRow | null)
}

async function resolveHeroImageUrl(raw: string | null, baseUrl: string): Promise<string | null> {
  if (!raw) return null
  const url = raw.startsWith("http") ? raw : raw.startsWith("/") ? `${baseUrl}${raw}` : null
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return res.ok ? url : null
  } catch {
    return null
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default async function OgImage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const baseUrl = getPublicBaseUrl()

  const [artist, fontData] = await Promise.all([
    getOgArtistData(handle),
    fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2",
    )
      .then((r) => r.arrayBuffer())
      .catch(() => null),
  ])

  const fonts = fontData
    ? [{ name: "Inter", data: fontData, weight: 700 as const, style: "normal" as const }]
    : []

  const FALLBACK_GREEN = "#00E6A7"

  // Unknown / unpublished artist — return minimal branded dark image
  if (!artist) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d0d0d 0%, #111111 100%)",
          fontFamily: fontData ? "Inter" : "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.15)",
            fontSize: 16,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          DJHQ
        </div>
      </div>,
      { ...size, fonts },
    )
  }

  // ── Display values ────────────────────────────────────────────────────────

  const accentHex =
    ACCENT_THEMES[(artist.artist_accent_theme ?? "matrix") as keyof typeof ACCENT_THEMES]?.hex ??
    FALLBACK_GREEN

  const displayName = artist.artist_name
  const displayRole = artist.tagline ?? ""
  const displayGenres = (artist.genres ?? []).slice(0, 3).join("  ·  ")
  const displayLocation = artist.location ?? ""

  const rawUrl = artist.seo_canonical_url?.trim() || `${baseUrl}/${artist.handle}`
  const displayUrl = rawUrl.replace(/^https?:\/\//, "")

  // Name font size: adaptive to length to prevent overflow
  const nameFontSize = displayName.length > 18 ? 60 : displayName.length > 14 ? 72 : displayName.length > 10 ? 84 : 96

  // ── Hero image (validate before including in JSX to avoid render errors) ──
  const heroUrl = await resolveHeroImageUrl(artist.hero_image_url, baseUrl)
  const hasHero = !!heroUrl

  const fontFamily = fontData ? "Inter" : "system-ui, sans-serif"

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* ── Hero image panel (right side) ────────────────────────────────── */}
      {hasHero && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 552,
            height: 630,
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl!}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
            alt=""
          />
          {/* Left-edge fade: image → background */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "70%",
              height: "100%",
              background: "linear-gradient(to right, #0a0a0a, transparent)",
              display: "flex",
            }}
          />
          {/* Top + right corner darkening */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(160deg, rgba(10,10,10,0.55) 0%, transparent 35%, transparent 65%, rgba(10,10,10,0.35) 100%)",
              display: "flex",
            }}
          />
        </div>
      )}

      {/* ── Bottom gradient (always present) ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "38%",
          background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)",
          display: "flex",
        }}
      />

      {/* ── Accent glow: top-left corner ──────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentHex}18 0%, transparent 70%)`,
          display: "flex",
        }}
      />

      {/* ── Content column ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 56px 48px",
          width: hasHero ? 680 : 1200,
          height: "100%",
          zIndex: 1,
        }}
      >
        {/* Top: label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: accentHex,
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.22em",
              color: accentHex,
              textTransform: "uppercase",
            }}
          >
            Official Artist Website
          </span>
        </div>

        {/* Middle: artist identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.025em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            {displayName}
          </div>

          {displayRole ? (
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.01em",
                display: "flex",
              }}
            >
              {displayRole}
            </div>
          ) : null}

          {displayLocation || displayGenres ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "rgba(255,255,255,0.26)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {displayLocation ? <span>{displayLocation}</span> : null}
              {displayLocation && displayGenres ? (
                <span style={{ color: "rgba(255,255,255,0.14)", display: "flex" }}>·</span>
              ) : null}
              {displayGenres ? <span>{displayGenres}</span> : null}
            </div>
          ) : null}
        </div>

        {/* Bottom: sections + URL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div
            style={{
              display: "flex",
              fontSize: 10,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Shows · Releases · Booking · Artist Story
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              color: accentHex,
              opacity: 0.7,
              letterSpacing: "0.04em",
            }}
          >
            {displayUrl}
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts },
  )
}
