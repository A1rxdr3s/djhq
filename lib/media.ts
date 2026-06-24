// ── Google Drive URL normalization ────────────────────────────────────────────
//
// Google Drive share links (/file/d/ID/view, /open?id=ID, etc.) are HTML pages,
// not image assets. This module normalizes them into renderable thumbnail URLs.
//
// Supported input shapes:
//   https://drive.google.com/file/d/<ID>/view?usp=drive_link
//   https://drive.google.com/file/d/<ID>/view
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
//   https://drive.google.com/thumbnail?id=<ID>&sz=w800
//
// Render URL:
//   https://drive.google.com/thumbnail?id=<ID>&sz=w1600
//
// Drive thumbnail URLs respond with a redirect to lh3.googleusercontent.com.
// Use unoptimized={true} on next/image for Drive images to let the browser
// follow redirects directly without going through Next.js image optimization.

export type ImageSource = "google-drive" | "external" | "unknown"

export type NormalizedImageResult = {
  originalUrl:  string
  renderUrl:    string
  source:       ImageSource
  fileId?:      string
  isRenderable: boolean
}

const DRIVE_FILE_PATH_RE = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
const DRIVE_ID_PARAM_RE  = /[?&]id=([a-zA-Z0-9_-]+)/

export function extractGoogleDriveFileId(url: string): string | null {
  const fileMatch = url.match(DRIVE_FILE_PATH_RE)
  if (fileMatch) return fileMatch[1]
  const idMatch = url.match(DRIVE_ID_PARAM_RE)
  if (idMatch) return idMatch[1]
  return null
}

export function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com")
}

export function normalizeExternalImageUrl(url: string): NormalizedImageResult {
  const trimmed = url?.trim() ?? ""
  if (!trimmed) {
    return { originalUrl: url ?? "", renderUrl: "", source: "unknown", isRenderable: false }
  }

  if (isGoogleDriveUrl(trimmed)) {
    // Already a valid thumbnail URL — use as-is (just ensure we mark source)
    if (trimmed.includes("/thumbnail?")) {
      const fileId = extractGoogleDriveFileId(trimmed) ?? undefined
      return { originalUrl: trimmed, renderUrl: trimmed, source: "google-drive", fileId, isRenderable: true }
    }

    const fileId = extractGoogleDriveFileId(trimmed)
    if (fileId) {
      const renderUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
      return { originalUrl: trimmed, renderUrl, source: "google-drive", fileId, isRenderable: true }
    }

    // Unrecognized Drive URL format — cannot extract ID
    return { originalUrl: trimmed, renderUrl: trimmed, source: "google-drive", isRenderable: false }
  }

  return { originalUrl: trimmed, renderUrl: trimmed, source: "external", isRenderable: true }
}
