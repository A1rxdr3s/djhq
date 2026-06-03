/**
 * Fetch helpers with timeout and response-size guards for metadata import.
 * Applied to all external fetches in the metadata import pipelines.
 */

export const FETCH_TIMEOUT_MS = 6_000
export const MAX_BODY_BYTES = 1_024 * 1_024 // 1 MB

/** Wraps fetch() with an AbortController timeout. Throws on timeout. */
export async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetches text from a URL with a 6-second timeout and a 1 MB body size cap.
 * Throws on non-2xx, timeout, or oversized response.
 */
export async function fetchTextWithGuards(url: string, init?: RequestInit): Promise<string> {
  const response = await fetchWithTimeout(url, init)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  // Fast-path: reject via content-length header before reading the body.
  const cl = response.headers.get("content-length")
  if (cl && parseInt(cl, 10) > MAX_BODY_BYTES) throw new Error("Response too large.")

  // Streaming read with a running byte counter — prevents buffering large bodies.
  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    if (text.length > MAX_BODY_BYTES) throw new Error("Response too large.")
    return text
  }
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {})
      throw new Error("Response too large.")
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(merged)
}

/**
 * Fetches JSON from a URL with a 6-second timeout.
 * Returns null on non-2xx responses.
 */
export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  const response = await fetchWithTimeout(url, init)
  if (!response.ok) return null
  return response.json() as Promise<T>
}
