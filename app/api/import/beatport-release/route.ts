import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type BeatportReleaseImportPayload = {
  url?: string
}

type ReleaseType = "single" | "ep" | "album"

type ImportedMetadata = {
  title: string | null
  label: string | null
  releaseDate: string | null
  type: ReleaseType | null
  platformUrl: string
  artworkUrl: string | null
  warning?: string
}

const beatportHostnames = new Set(["beatport.com", "www.beatport.com"])

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2])
  }

  return attributes
}

function getMetaContent(html: string, names: string[]) {
  const expectedNames = new Set(names.map((name) => name.toLowerCase()))
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of metaTags) {
    const attributes = getTagAttributes(tag)
    const metaName = attributes.property ?? attributes.name ?? attributes.itemprop

    if (metaName && expectedNames.has(metaName.toLowerCase()) && attributes.content) {
      return attributes.content
    }
  }

  return null
}

function getPageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1] ? decodeHtml(match[1]) : null
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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: BeatportReleaseImportPayload

  try {
    payload = (await request.json()) as BeatportReleaseImportPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  if (!payload.url?.trim()) {
    return badRequest("Beatport URL is required.")
  }

  let beatportUrl: URL

  try {
    beatportUrl = new URL(payload.url)
  } catch {
    return badRequest("A valid Beatport URL is required.")
  }

  if (beatportUrl.protocol !== "https:" || !beatportHostnames.has(beatportUrl.hostname.toLowerCase())) {
    return badRequest("Only Beatport release URLs are supported.")
  }

  try {
    const response = await fetch(beatportUrl.toString(), {
      headers: {
        Accept: "text/html",
        "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
      },
      next: {
        revalidate: 0,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to fetch Beatport release metadata." }, { status: 502 })
    }

    const html = await response.text()
    if (isCloudflareChallengePage(html)) {
      const blockedMetadata: ImportedMetadata = {
        title: null,
        label: null,
        releaseDate: null,
        type: null,
        platformUrl: beatportUrl.toString(),
        artworkUrl: null,
        warning: "Beatport may block full metadata. Complete label, date, and type manually.",
      }

      return NextResponse.json(blockedMetadata)
    }

    const titleMetadata = cleanBeatportTitle(getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html))
    const artworkUrl = getMetaContent(html, ["og:image", "twitter:image"])
    const structuredMetadata = getStructuredMetadata(html)
    const importedMetadata: ImportedMetadata = {
      title: titleMetadata.title,
      label: structuredMetadata.label ?? titleMetadata.bracketedLabel,
      releaseDate: structuredMetadata.releaseDate,
      type: structuredMetadata.type,
      platformUrl: beatportUrl.toString(),
      artworkUrl,
    }

    return NextResponse.json(importedMetadata)
  } catch {
    return NextResponse.json({ error: "Unable to import Beatport metadata." }, { status: 502 })
  }
}
