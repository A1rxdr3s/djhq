/**
 * Centralized safe URL validation for user-configurable URLs.
 *
 * Apply resolveSafeHref() before rendering any user-provided value as <a href>
 * to prevent XSS via javascript:, data:, blob:, vbscript:, and similar schemes.
 */

const BLOCKED_PROTOCOLS = /^(javascript|data|blob|file|vbscript):/i
const CONTROL_CHARS = /[\x00-\x1F\x7F]/
const PROTOCOL_RELATIVE = /^\/\//

/** True for safe https:// or http:// external URLs. */
export function isSafeExternalUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false
  const v = value.trim()
  if (!v || CONTROL_CHARS.test(v) || PROTOCOL_RELATIVE.test(v) || BLOCKED_PROTOCOLS.test(v)) return false
  try {
    const { protocol } = new URL(v)
    return protocol === "https:" || protocol === "http:"
  } catch {
    return false
  }
}

/** True for safe mailto: URLs with no control characters or header-injection sequences. */
export function isSafeMailtoUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false
  const v = value.trim()
  return (
    !!v &&
    !CONTROL_CHARS.test(v) &&
    v.toLowerCase().startsWith("mailto:") &&
    !/[\r\n]/.test(v)
  )
}

/** True for internal paths starting with / but not // (no protocol-relative). */
export function isSafeInternalPath(value: string): boolean {
  if (!value || typeof value !== "string") return false
  const v = value.trim()
  return !!v && !CONTROL_CHARS.test(v) && v.startsWith("/") && !PROTOCOL_RELATIVE.test(v)
}

/**
 * Returns a safe href string or null if the value is unsafe.
 *
 * Accepts:
 *   - https:// or http:// external URLs
 *   - mailto: links
 *   - Internal paths starting with /
 *
 * Blocks:
 *   - javascript:, data:, blob:, file:, vbscript:
 *   - Protocol-relative //
 *   - Control characters and newline injection
 *   - Malformed values that cannot be parsed as a URL or path
 */
export function resolveSafeHref(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null
  const v = value.trim()
  if (!v || CONTROL_CHARS.test(v) || PROTOCOL_RELATIVE.test(v) || BLOCKED_PROTOCOLS.test(v)) return null
  try {
    const { protocol } = new URL(v)
    if (protocol === "https:" || protocol === "http:" || protocol === "mailto:") return v
    return null
  } catch {
    return isSafeInternalPath(v) ? v : null
  }
}
