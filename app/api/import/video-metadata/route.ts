import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getMetaContent, getPageTitle } from "@/lib/release-metadata/html"
import { fetchTextWithGuards } from "@/lib/release-metadata/fetch"

type VideoImportPayload = {
  url?: string
}

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
])

function isYouTubeUrl(url: URL): boolean {
  return YOUTUBE_HOSTNAMES.has(url.hostname.toLowerCase())
}

function extractYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase()

  // youtu.be/ID
  if (hostname === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0]
    return id || null
  }

  // youtube.com/watch?v=ID
  const vParam = url.searchParams.get("v")
  if (vParam) return vParam

  // youtube.com/embed/ID  youtube.com/shorts/ID  youtube.com/live/ID
  const match = url.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/)
  if (match?.[2]) return match[2]

  return null
}

async function fetchYouTubeTitle(canonicalUrl: URL): Promise<string | null> {
  try {
    const html = await fetchTextWithGuards(canonicalUrl.toString(), {
      headers: {
        Accept: "text/html",
        "User-Agent": "DJHQ metadata importer (+https://djhq.com)",
      },
    })
    return getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html) ?? null
  } catch {
    return null
  }
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: VideoImportPayload

  try {
    payload = (await request.json()) as VideoImportPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  if (!payload.url?.trim()) {
    return badRequest("Video URL is required.")
  }

  let videoUrl: URL

  try {
    videoUrl = new URL(payload.url)
  } catch {
    return badRequest("A valid video URL is required.")
  }

  if (videoUrl.protocol !== "https:") {
    return badRequest("Only HTTPS URLs are supported.")
  }

  if (!isYouTubeUrl(videoUrl)) {
    return badRequest("Only YouTube URLs are supported for video import.")
  }

  const videoId = extractYouTubeVideoId(videoUrl)

  if (!videoId) {
    return badRequest("Could not extract a video ID from the YouTube URL.")
  }

  const canonicalUrl = new URL(`https://www.youtube.com/watch?v=${videoId}`)

  // hqdefault.jpg (480×360) is always present for any public YouTube video.
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  const title = await fetchYouTubeTitle(canonicalUrl)

  return NextResponse.json({
    title,
    thumbnailUrl,
    platformUrl: canonicalUrl.toString(),
  })
}
