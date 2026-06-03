/**
 * Shared security helpers for API route handlers.
 *
 * - assertAllowedOrigin: CSRF defense-in-depth for mutating endpoints
 * - getClientIp: extracts real IP from Vercel / Cloudflare headers
 * - checkRateLimit: in-memory per-process bucket counter
 *
 * Rate limiter note: effective within a warm serverless instance.
 * For multi-region production deployments, replace with Upstash Redis:
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */

import { NextResponse } from "next/server"

const IS_PROD = process.env.NODE_ENV === "production"

// ─── Origin validation ───────────────────────────────────────────────────────

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>()
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
  if (raw) {
    try {
      origins.add(new URL(raw).origin)
    } catch {
      // malformed env — skip
    }
  }
  if (!IS_PROD) {
    origins.add("http://localhost:3000")
    origins.add("http://localhost:3001")
    origins.add("http://127.0.0.1:3000")
  }
  return origins
}

/**
 * Validates the Origin header for mutating requests (POST / PATCH / PUT / DELETE).
 *
 * Returns a 403 NextResponse if the origin is present and not in the allowlist.
 * Returns null when valid — caller continues normally.
 *
 * If no Origin header is sent (server-to-server, curl without -H Origin):
 *   the request is allowed through; Supabase session auth remains the primary gate.
 */
export function assertAllowedOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin")
  if (!origin) return null // absent → server-to-server or curl — allow
  const allowed = buildAllowedOrigins()
  if (allowed.has(origin) || origin.endsWith(".vercel.app")) return null
  return NextResponse.json({ error: "Forbidden." }, { status: 403 })
}

// ─── Client IP ───────────────────────────────────────────────────────────────

/** Extracts the real client IP from Vercel / Cloudflare / standard proxy headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("cf-connecting-ip")?.trim() ??
    "unknown"
  )
}

// ─── In-memory rate limiter ──────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Best-effort periodic cleanup — prevents unbounded map growth in long-lived processes.
// In serverless environments this interval may not fire between invocations.
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k)
  }
}, 60_000)
// Allow the process to exit even if this interval is pending (Node.js only).
if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
  ;(cleanupInterval as NodeJS.Timeout).unref()
}

/**
 * Returns true if the request is within the allowed rate; false if the limit
 * has been exceeded for this key within the current window.
 *
 * @param key       Unique bucket identifier (e.g. `booking:ip:1.2.3.4`)
 * @param limit     Maximum requests allowed per window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}
