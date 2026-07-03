/**
 * Production-safe rate limiter.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set:
 *   Uses Upstash Redis REST API — fixed-window INCR + EXPIRE pipeline.
 *   No npm dependency required; native fetch only.
 *
 * When env vars are missing (local dev or unconfigured production):
 *   Falls back to the in-memory checkRateLimit() from lib/request-security.
 *   Per-instance only — not shared across Vercel function instances.
 */

import { createHash } from "crypto"
import { checkRateLimit } from "./request-security"

const REDIS_URL   = (process.env.UPSTASH_REDIS_REST_URL   ?? "").replace(/\/$/, "")
const REDIS_TOKEN =  process.env.UPSTASH_REDIS_REST_TOKEN  ?? ""
const HAS_REDIS   = Boolean(REDIS_URL && REDIS_TOKEN)

if (process.env.NODE_ENV === "production" && !HAS_REDIS) {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. " +
    "Rate limiting will fall back to per-instance in-memory counters, which are not " +
    "shared across Vercel function instances. Set env vars for production-safe limiting."
  )
}

/**
 * Builds a namespaced, SHA-256-hashed Redis key.
 * Hashing avoids storing raw IPs or email addresses in Redis.
 *
 * @param prefix      Namespace, e.g. "djhq:rl:booking:ip"
 * @param identifier  Raw value to hash (IP address, email+handle composite, etc.)
 */
export function buildRateLimitKey(prefix: string, identifier: string): string {
  const hash = createHash("sha256").update(`djhq:rl:${identifier}`).digest("hex")
  return `${prefix}:${hash}`
}

/**
 * Checks the rate limit for a key.
 *
 * Uses Redis (fixed-window INCR + EXPIRE NX) when UPSTASH_REDIS env vars are set.
 * Falls back to the in-memory checkRateLimit() otherwise.
 *
 * Fails open on Redis errors: logs a server-side warning and allows the request through.
 *
 * @param key        Pre-built key (use buildRateLimitKey)
 * @param limit      Maximum requests allowed per window
 * @param windowSec  Window duration in seconds
 * @returns          true = request ALLOWED, false = request BLOCKED
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (HAS_REDIS) {
    return redisRateLimit(key, limit, windowSec)
  }
  return checkRateLimit(key, limit, windowSec * 1000)
}

async function redisRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    // Pipeline: INCR the counter, then set the expiry only on the first request
    // in the window (NX = only if the key has no TTL yet).
    // EXPIRE ... NX requires Redis 7+, which Upstash managed Redis supports.
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
    })

    if (!res.ok) {
      console.warn(`[rate-limit] Redis pipeline returned ${res.status} ${res.statusText} — failing open`)
      return true // fail open: don't block legitimate traffic on Redis error
    }

    const data = (await res.json()) as Array<{ result: unknown }>
    const count = data[0]?.result
    return typeof count === "number" ? count <= limit : true
  } catch (err) {
    console.warn(
      "[rate-limit] Redis unavailable — failing open:",
      err instanceof Error ? err.message : String(err)
    )
    return true // fail open
  }
}
