import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

// ─── Platform host detection (mirrors robots.ts) ──────────────────────────────

function isPlatformHost(hostname: string): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  let appHost = "djhq.app"
  try { appHost = new URL(appUrl).hostname } catch {}
  const owned = new Set([
    "djhq.app", "djhq.com",
    `www.djhq.app`, `www.djhq.com`,
    appHost, `www.${appHost}`,
  ])
  if (owned.has(hostname)) return true
  if (hostname.endsWith(".vercel.app")) return true
  if (hostname === "localhost" || hostname === "127.0.0.1") return true
  return false
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function buildClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type ArtistSlugRow = {
  handle: string
  updated_at: string
  seo_canonical_url: string | null
}

async function getPublishedArtistHandles(): Promise<ArtistSlugRow[]> {
  const supabase = buildClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("artists")
    .select("handle, updated_at, seo_canonical_url")
    .eq("is_published", true)
    .returns<ArtistSlugRow[]>()
  return data ?? []
}

type CustomDomainLookup = {
  artists: {
    handle: string
    updated_at: string
    press_kit_enabled: boolean
    is_published: boolean
    plan: string
  }
}

async function getArtistByCustomDomain(domain: string): Promise<CustomDomainLookup["artists"] | null> {
  const supabase = buildClient()
  if (!supabase) return null
  const { data } = await supabase
    .from("custom_domains")
    .select("artists!inner(handle, updated_at, press_kit_enabled, is_published, plan)")
    .eq("domain", domain)
    .eq("status", "active")
    .maybeSingle<CustomDomainLookup>()
  const artist = data?.artists
  if (!artist?.is_published || artist.plan !== "pro") return null
  return artist
}

// ─── Custom-domain sitemap ────────────────────────────────────────────────────

async function buildCustomDomainSitemap(hostname: string): Promise<MetadataRoute.Sitemap> {
  const origin = `https://${hostname}`
  const artist = await getArtistByCustomDomain(hostname)

  if (!artist) {
    // Domain exists in the system but artist is unpublished/non-pro — return minimal valid sitemap.
    return [{ url: `${origin}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 }]
  }

  const lastModified = artist.updated_at ? new Date(artist.updated_at) : new Date()

  const entries: MetadataRoute.Sitemap = [
    {
      url:             `${origin}/`,
      lastModified,
      changeFrequency: "weekly",
      priority:        1.0,
    },
  ]

  if (artist.press_kit_enabled) {
    entries.push({
      url:             `${origin}/presskit`,
      lastModified,
      changeFrequency: "monthly",
      priority:        0.7,
    })
  }

  return entries
}

// ─── Sitemap entry point ──────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Detect the requesting host. Custom-domain requests get a focused per-artist
  // sitemap; platform-domain requests get the full platform sitemap.
  let hostname = ""
  try {
    const headersList = await headers()
    const xfh  = headersList.get("x-forwarded-host") ?? ""
    const host = headersList.get("host") ?? ""
    hostname = (xfh || host).split(":")[0]
  } catch {
    // Static generation context — fall through to platform sitemap.
  }

  if (hostname && !isPlatformHost(hostname)) {
    return buildCustomDomainSitemap(hostname)
  }

  // ── Platform sitemap ────────────────────────────────────────────────────────
  const baseUrl = getPublicBaseUrl()
  const artists = await getPublishedArtistHandles()

  const artistEntries: MetadataRoute.Sitemap = artists.map((a) => ({
    url:             a.seo_canonical_url?.trim() || `${baseUrl}/${a.handle}`,
    lastModified:    a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority:        0.9,
  }))

  return [
    {
      url:             baseUrl,
      lastModified:    new Date(),
      changeFrequency: "monthly",
      priority:        0.5,
    },
    ...artistEntries,
  ]
}
