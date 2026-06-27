import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

type ArtistSlugRow = {
  handle: string
  updated_at: string
  seo_canonical_url: string | null
}

async function getPublishedArtistHandles(): Promise<ArtistSlugRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return []

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data } = await supabase
    .from("artists")
    .select("handle, updated_at, seo_canonical_url")
    .eq("is_published", true)
    .returns<ArtistSlugRow[]>()

  return data ?? []
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl   = getPublicBaseUrl()
  const artists   = await getPublishedArtistHandles()

  const artistEntries: MetadataRoute.Sitemap = artists.map((a) => ({
    // Use canonical URL if configured; otherwise fall back to DJHQ-hosted profile URL
    url:          a.seo_canonical_url?.trim() || `${baseUrl}/${a.handle}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.9,
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
