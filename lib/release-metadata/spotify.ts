import type { ImportedReleaseMetadata, ReleaseType } from "@/lib/release-metadata/types"
import { getMetaContent, getPageTitle } from "@/lib/release-metadata/html"

type SpotifyOEmbedResponse = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

const SPOTIFY_HOSTNAMES = new Set(["open.spotify.com", "spotify.link"])
/** Spotify IDs are 22 chars; path may include locale segments before track/album. */
const SPOTIFY_RELEASE_PATH = /\/(track|album)\/([a-zA-Z0-9]{22})/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function isSpotifyHostname(hostname: string) {
  return SPOTIFY_HOSTNAMES.has(hostname.toLowerCase())
}

export function isSupportedSpotifyReleaseUrl(url: URL) {
  return isSpotifyHostname(url.hostname) && SPOTIFY_RELEASE_PATH.test(url.pathname)
}

function matchSpotifyReleasePath(pathname: string) {
  return pathname.match(SPOTIFY_RELEASE_PATH)
}

export function inferSpotifyReleaseType(url: URL): ReleaseType | null {
  const match = matchSpotifyReleasePath(url.pathname)
  if (!match) {
    return null
  }

  return match[1] === "album" ? "album" : "single"
}

export function cleanSpotifyTitle(title: string | null, artistName?: string | null) {
  if (!title) {
    return null
  }

  let cleanedTitle = title
    .replace(/\s*\|\s*Spotify\s*$/i, "")
    .replace(/\s+on\s+Spotify\s*$/i, "")
    .replace(/\s*[-–—]\s*song and lyrics by.+$/i, "")
    .replace(/,?\s*a song by\s+.+$/i, "")
    .replace(/\s*[-–—]\s*Spotify\s*$/i, "")
    .trim()

  const normalizedArtist = artistName?.trim()

  if (normalizedArtist) {
    const escapedArtist = escapeRegExp(normalizedArtist)
    cleanedTitle = cleanedTitle
      .replace(new RegExp(`^${escapedArtist}\\s*[-–—·|]\\s*`, "i"), "")
      .replace(new RegExp(`\\s*[-–—·|]\\s*${escapedArtist}\\s*$`, "i"), "")
      .trim()

    if (cleanedTitle.includes(" - ")) {
      const [firstSegment, ...rest] = cleanedTitle.split(" - ")
      if (firstSegment.trim().toLowerCase() === normalizedArtist.toLowerCase()) {
        cleanedTitle = rest.join(" - ").trim()
      }
    }
  }

  return cleanedTitle || null
}

export function extractArtistFromOpenGraphTitle(title: string | null) {
  if (!title) {
    return null
  }

  const byArtistMatch = title.match(/\bby\s+([^|,]+?)(?:\s+on\s+Spotify|\s*\||\s*$)/i)
  if (byArtistMatch?.[1]) {
    return byArtistMatch[1].trim()
  }

  const prefixArtistMatch = title.match(/^([^|]+?)\s*[-–—·|]\s*.+?\s*\|\s*Spotify$/i)
  if (prefixArtistMatch?.[1] && !/^\d+$/.test(prefixArtistMatch[1])) {
    return prefixArtistMatch[1].trim()
  }

  return null
}

export async function resolveSpotifyUrl(url: URL) {
  let resolved = new URL(url.toString())
  resolved.hash = ""
  resolved.search = ""

  if (resolved.hostname.toLowerCase() !== "spotify.link") {
    return resolved
  }

  const response = await fetch(resolved.toString(), {
    headers: {
      Accept: "text/html",
      "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
    },
    redirect: "follow",
    next: {
      revalidate: 0,
    },
  })

  if (response.url) {
    resolved = new URL(response.url)
    resolved.hash = ""
    resolved.search = ""
  }

  return resolved
}

async function getSpotifyOEmbedMetadata(url: URL) {
  const oEmbedUrl = new URL("https://open.spotify.com/oembed")
  oEmbedUrl.searchParams.set("url", url.toString())

  const response = await fetch(oEmbedUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 0,
    },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as SpotifyOEmbedResponse
}

async function getOpenGraphMetadata(url: URL) {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html",
      "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
    },
    next: {
      revalidate: 0,
    },
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const title = getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html)
  const image = getMetaContent(html, ["og:image", "twitter:image"])

  return { title, image }
}

export async function importSpotifyReleaseMetadata(url: URL): Promise<ImportedReleaseMetadata> {
  const platformUrl = await resolveSpotifyUrl(url)

  if (!isSupportedSpotifyReleaseUrl(platformUrl)) {
    throw new Error("Unsupported Spotify URL. Use an open.spotify.com track or album link.")
  }

  const oEmbedMetadata = await getSpotifyOEmbedMetadata(platformUrl)
  const needsOpenGraphFallback = !oEmbedMetadata?.title || !oEmbedMetadata?.thumbnail_url
  const openGraphMetadata = needsOpenGraphFallback ? await getOpenGraphMetadata(platformUrl) : null

  const rawTitle = oEmbedMetadata?.title ?? openGraphMetadata?.title ?? null
  const artist =
    oEmbedMetadata?.author_name?.trim() ||
    extractArtistFromOpenGraphTitle(openGraphMetadata?.title ?? null) ||
    null
  const title = cleanSpotifyTitle(rawTitle, artist)
  const artworkUrl = oEmbedMetadata?.thumbnail_url ?? openGraphMetadata?.image ?? null

  return {
    provider: "spotify",
    title,
    artist,
    label: null,
    releaseDate: null,
    type: inferSpotifyReleaseType(platformUrl),
    platformUrl: platformUrl.toString(),
    artworkUrl,
  }
}
