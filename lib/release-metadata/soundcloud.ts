import type { ImportedReleaseMetadata } from "@/lib/release-metadata/types"
import { getMetaContent, getPageTitle } from "@/lib/release-metadata/html"

type SoundCloudOEmbedResponse = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

const SOUNDCLOUD_HOSTNAMES = new Set([
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
  "on.soundcloud.com",
])

export function isSoundCloudUrl(url: URL): boolean {
  return SOUNDCLOUD_HOSTNAMES.has(url.hostname.toLowerCase())
}

// Resolves on.soundcloud.com short links to canonical soundcloud.com URLs.
export async function resolveSoundCloudUrl(url: URL): Promise<URL> {
  let resolved = new URL(url.toString())
  resolved.hash = ""
  resolved.search = ""

  if (resolved.hostname.toLowerCase() !== "on.soundcloud.com") {
    return resolved
  }

  const response = await fetch(resolved.toString(), {
    headers: {
      Accept: "text/html",
      "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
    },
    redirect: "follow",
    next: { revalidate: 0 },
  })

  if (response.url) {
    resolved = new URL(response.url)
    resolved.hash = ""
    resolved.search = ""
  }

  return resolved
}

async function getSoundCloudOEmbedMetadata(url: URL): Promise<SoundCloudOEmbedResponse | null> {
  const oEmbedUrl = new URL("https://soundcloud.com/oembed")
  oEmbedUrl.searchParams.set("url", url.toString())
  oEmbedUrl.searchParams.set("format", "json")

  const response = await fetch(oEmbedUrl.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as SoundCloudOEmbedResponse
}

function extractPublishedDateFromHtml(html: string): string | null {
  // SoundCloud pages typically expose article:published_time (ISO 8601 timestamp)
  const pubTime = getMetaContent(html, ["article:published_time", "og:published_time"])
  if (pubTime) {
    const match = pubTime.trim().match(/^(\d{4}-\d{2}-\d{2})/)
    if (match?.[1]) return match[1]
  }

  // JSON-LD datePublished fallback
  const jsonLdMatch = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/)
  if (jsonLdMatch?.[1]) return jsonLdMatch[1]

  return null
}

async function getSoundCloudPageMetadata(url: URL) {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html",
      "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const title = getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html)
  const image = getMetaContent(html, ["og:image", "twitter:image"])
  const publishedDate = extractPublishedDateFromHtml(html)

  return { title, image, publishedDate }
}

export async function importSoundCloudSetMetadata(url: URL): Promise<ImportedReleaseMetadata> {
  const platformUrl = await resolveSoundCloudUrl(url)

  // Fetch oEmbed (title/artist/artwork) and page HTML (date) in parallel.
  const [oEmbedMetadata, pageMetadata] = await Promise.all([
    getSoundCloudOEmbedMetadata(platformUrl),
    getSoundCloudPageMetadata(platformUrl),
  ])

  const title = (oEmbedMetadata?.title ?? pageMetadata?.title ?? null)?.trim() || null
  const artist = oEmbedMetadata?.author_name?.trim() || null
  const artworkUrl = oEmbedMetadata?.thumbnail_url ?? pageMetadata?.image ?? null
  const releaseDate = pageMetadata?.publishedDate ?? null

  return {
    provider: "soundcloud",
    title,
    artist,
    label: null,
    releaseDate,
    type: null,
    platformUrl: platformUrl.toString(),
    artworkUrl,
  }
}
