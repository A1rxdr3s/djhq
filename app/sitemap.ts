import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

// Force dynamic so the host header is read fresh on every request — never statically generated.
export const dynamic    = "force-dynamic"
export const revalidate = 0

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key (server-only, never exposed to clients) so that the
  // custom_domains lookup works the same way as proxy.ts — the anon key may be
  // blocked by RLS on that table.  Falls back to anon key so that the artists
  // direct query works in environments where the secret is not configured.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  const { data, error } = await supabase
    .from("artists")
    .select("handle, updated_at, seo_canonical_url")
    .eq("is_published", true)
    .returns<ArtistSlugRow[]>()
  if (error) console.error("[sitemap] getPublishedArtistHandles error:", error.message)
  return data ?? []
}

type DomainArtistRow = {
  artists: {
    handle: string
    is_published: boolean
    plan: string
  }
}

type ArtistProfileRow = {
  updated_at: string
  press_kit_enabled: boolean
}

// ─── Custom-domain sitemap ────────────────────────────────────────────────────

async function buildCustomDomainSitemap(hostname: string): Promise<MetadataRoute.Sitemap> {
  const origin   = `https://${hostname}`
  const fallback = [{ url: `${origin}/`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 }]

  const supabase = buildClient()
  if (!supabase) {
    console.error("[sitemap] buildClient() returned null — env vars missing")
    return fallback
  }

  // Step 1: Resolve artist handle from custom domain (mirrors proxy.ts query).
  const { data: domainData, error: domainError } = await supabase
    .from("custom_domains")
    .select("artists!inner(handle, is_published, plan)")
    .eq("domain", hostname)
    .eq("status", "active")
    .maybeSingle<DomainArtistRow>()

  if (domainError) console.error("[sitemap] custom_domains query error:", domainError.message)
  console.error("[sitemap] hostname:", hostname, "| domainData:", JSON.stringify(domainData))

  const domainArtist = domainData?.artists
  console.error("[sitemap] domainArtist:", JSON.stringify(domainArtist))

  if (!domainArtist?.is_published || domainArtist.plan !== "pro") {
    console.error("[sitemap] domainArtist failed published/pro gate — returning fallback (homepage only)")
    return fallback
  }

  // Step 2: Fetch press_kit_enabled directly from the artists table.
  // Avoids PostgREST join column-visibility issues with the anon key.
  const { data: artistData, error: artistError } = await supabase
    .from("artists")
    .select("updated_at, press_kit_enabled")
    .eq("handle", domainArtist.handle)
    .eq("is_published", true)
    .maybeSingle<ArtistProfileRow>()

  if (artistError) console.error("[sitemap] artists query error:", artistError.message)
  console.error(
    "[sitemap] artistData:", JSON.stringify(artistData),
    "| press_kit_enabled:", artistData?.press_kit_enabled,
    "| typeof:", typeof artistData?.press_kit_enabled,
  )

  const lastModified = artistData?.updated_at ? new Date(artistData.updated_at) : new Date()

  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
  ]

  if (artistData?.press_kit_enabled) {
    entries.push({ url: `${origin}/presskit`, lastModified, changeFrequency: "monthly", priority: 0.7 })
  }

  console.error("[sitemap] final URLs:", entries.map((e) => e.url))
  return entries
}

// ─── Sitemap entry point ──────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let hostname = ""
  try {
    const headersList = await headers()
    const xfh  = headersList.get("x-forwarded-host") ?? ""
    const host = headersList.get("host") ?? ""
    hostname = (xfh || host).split(":")[0]
  } catch {
    // Static generation context — fall through to platform sitemap.
  }

  console.error("[sitemap] resolved hostname:", JSON.stringify(hostname), "| isPlatform:", isPlatformHost(hostname))

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
