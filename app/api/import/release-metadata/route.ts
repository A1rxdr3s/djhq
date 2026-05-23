import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { decodeHtml, getMetaContent, getPageTitle } from "@/lib/release-metadata/html"
import { importSpotifyReleaseMetadata, isSpotifyHostname } from "@/lib/release-metadata/spotify"
import type { ImportedReleaseMetadata, ReleaseProvider, ReleaseType } from "@/lib/release-metadata/types"

type ReleaseImportPayload = {
  url?: string
}

const beatportHostnames = new Set(["beatport.com", "www.beatport.com"])

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function extractBracketedLabel(title: string) {
  const match = title.match(/\s*\[([^\]]+)\]\s*$/)
  return match?.[1]?.trim() || null
}

function cleanBeatportTitle(title: string | null) {
  if (!title) {
    return { title: null, bracketedLabel: null }
  }

  let cleanedTitle = title
    .replace(/\s*\|\s*Music\s*&\s*Downloads\s*$/i, "")
    .replace(/\s*\|\s*Beatport\s*$/i, "")
    .replace(/\s*Music\s*&\s*Downloads\s*$/i, "")
    .replace(/\s*[|-]\s*Beatport(?:\s*.*)?$/i, "")
    .replace(/\s+on\s+Beatport$/i, "")
    .trim()

  const bracketedLabel = extractBracketedLabel(cleanedTitle)

  cleanedTitle = cleanedTitle.replace(/\s*\[[^\]]+\]\s*$/g, "").trim()

  if (cleanedTitle.includes(" - ")) {
    cleanedTitle = cleanedTitle.split(" - ").slice(1).join(" - ").trim()
  }

  return { title: cleanedTitle || null, bracketedLabel }
}

function normalizeReleaseType(value: string | null): ReleaseType | null {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue === "single" || /\bsingle\b/.test(normalizedValue)) {
    return "single"
  }

  if (normalizedValue === "ep" || /\bep\b/.test(normalizedValue)) {
    return "ep"
  }

  if (normalizedValue === "album" || /\balbum\b/.test(normalizedValue)) {
    return "album"
  }

  return null
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

function extractJsonLd(html: string) {
  const jsonLdBlocks: unknown[] = []
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptPattern.exec(html))) {
    try {
      jsonLdBlocks.push(JSON.parse(decodeHtml(match[1])))
    } catch {
      // Ignore malformed third-party structured data.
    }
  }

  return jsonLdBlocks
}

function walkJson(value: unknown, visit: (record: Record<string, unknown>) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visit))
    return
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    visit(record)
    Object.values(record).forEach((item) => walkJson(item, visit))
  }
}

function getNamedValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const name = (value as Record<string, unknown>).name
    return typeof name === "string" && name.trim() ? name.trim() : null
  }

  return null
}

function getStructuredMetadata(html: string) {
  let label: string | null = null
  let releaseDate: string | null = null
  let type: ReleaseType | null = null

  for (const jsonLd of extractJsonLd(html)) {
    walkJson(jsonLd, (record) => {
      if (!label) {
        label = getNamedValue(record.recordLabel) ?? getNamedValue(record.recordLabelName)
      }

      if (!releaseDate) {
        releaseDate =
          normalizeDate(getNamedValue(record.releaseDate)) ??
          normalizeDate(getNamedValue(record.datePublished)) ??
          normalizeDate(getNamedValue(record.dateCreated))
      }

      if (!type) {
        type = normalizeReleaseType(getNamedValue(record.releaseType) ?? getNamedValue(record.albumReleaseType))
      }
    })
  }

  return { label, releaseDate, type }
}

function isCloudflareChallengePage(html: string) {
  return (
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html) ||
    html.includes("__cf_chl_") ||
    html.includes("challenges.cloudflare.com")
  )
}

function detectProvider(url: URL): ReleaseProvider | null {
  const hostname = url.hostname.toLowerCase()

  if (beatportHostnames.has(hostname)) {
    return "beatport"
  }

  if (isSpotifyHostname(hostname)) {
    return "spotify"
  }

  return null
}

async function importBeatportMetadata(url: URL): Promise<ImportedReleaseMetadata> {
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
    throw new Error("Unable to fetch Beatport release metadata.")
  }

  const html = await response.text()

  if (isCloudflareChallengePage(html)) {
    return {
      provider: "beatport",
      title: null,
      artist: null,
      label: null,
      releaseDate: null,
      type: null,
      platformUrl: url.toString(),
      artworkUrl: null,
    }
  }

  const titleMetadata = cleanBeatportTitle(getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html))
  const artworkUrl = getMetaContent(html, ["og:image", "twitter:image"])
  const structuredMetadata = getStructuredMetadata(html)

  return {
    provider: "beatport",
    title: titleMetadata.title,
    artist: null,
    label: structuredMetadata.label ?? titleMetadata.bracketedLabel,
    releaseDate: structuredMetadata.releaseDate,
    type: structuredMetadata.type,
    platformUrl: url.toString(),
    artworkUrl,
  }
}

async function importReleaseMetadata(provider: ReleaseProvider, url: URL): Promise<ImportedReleaseMetadata> {
  if (provider === "beatport") {
    return importBeatportMetadata(url)
  }

  return importSpotifyReleaseMetadata(url)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: ReleaseImportPayload

  try {
    payload = (await request.json()) as ReleaseImportPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  if (!payload.url?.trim()) {
    return badRequest("Release URL is required.")
  }

  let releaseUrl: URL

  try {
    releaseUrl = new URL(payload.url)
  } catch {
    return badRequest("A valid release URL is required.")
  }

  if (releaseUrl.protocol !== "https:") {
    return badRequest("Only HTTPS release URLs are supported.")
  }

  const provider = detectProvider(releaseUrl)

  if (!provider) {
    return badRequest("Only Beatport and Spotify release URLs are supported right now.")
  }

  try {
    return NextResponse.json(await importReleaseMetadata(provider, releaseUrl))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unsupported Spotify")) {
      return badRequest(error.message)
    }

    return NextResponse.json({ error: "Unable to import release metadata. Please verify the URL and try again." }, { status: 502 })
  }
}
