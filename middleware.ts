import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Redirect target for unresolvable custom domains.
// NEXT_PUBLIC_APP_URL must be set to the canonical production URL (e.g. "https://djhq.app").
const FALLBACK_APP_URL = "https://djhq.app"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_URL

// Derive the canonical hostname from APP_URL so it is always treated as
// an owned host regardless of which domain is set as canonical.
// This prevents a redirect loop when NEXT_PUBLIC_APP_URL points to a custom
// domain (e.g. djhq.app): middleware would otherwise see that host as an
// unknown custom domain and redirect back to itself indefinitely.
let APP_HOST = "djhq.app"
try {
  APP_HOST = new URL(APP_URL).hostname
} catch {
  // malformed NEXT_PUBLIC_APP_URL — keep the fallback hostname
}

// Hostnames that belong to DJHQ's own infrastructure — always pass through.
const DJHQ_OWNED_HOSTNAMES = new Set([
  APP_HOST,           // canonical host derived from NEXT_PUBLIC_APP_URL (e.g. djhq.app)
  `www.${APP_HOST}`,  // www variant — Vercel handles the 308, but safe to allow here too
  "djhq.com",
  "www.djhq.com",
  "localhost",
  "127.0.0.1",
])

function isDjhqOwnedHost(hostname: string): boolean {
  if (DJHQ_OWNED_HOSTNAMES.has(hostname)) return true
  // Vercel preview, staging, and production deployments
  if (hostname.endsWith(".vercel.app")) return true
  return false
}

type DomainLookup = {
  artists: {
    handle: string
    is_published: boolean
    plan: string
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? ""
  const hostname = host.split(":")[0] // strip port for local dev

  if (isDjhqOwnedHost(hostname)) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(APP_URL)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data } = await supabase
    .from("custom_domains")
    .select("artists!inner(handle, is_published, plan)")
    .eq("domain", hostname)
    .eq("status", "active")
    .maybeSingle<DomainLookup>()

  const artist = data?.artists

  if (!artist || !artist.is_published || artist.plan !== "pro") {
    return NextResponse.redirect(APP_URL)
  }

  // Internally serve /[handle][/sub-path] while the browser URL stays on the custom domain.
  // e.g. artistname.com/ → /[handle]
  //      artistname.com/presskit → /[handle]/presskit
  const url = request.nextUrl.clone()
  const originalPath = url.pathname
  if (originalPath === "/" || originalPath === `/${artist.handle}`) {
    url.pathname = `/${artist.handle}`
  } else {
    url.pathname = `/${artist.handle}${originalPath}`
  }
  return NextResponse.rewrite(url)
}

export const config = {
  // Exclude static assets, images, API routes, and internal auth/dashboard paths.
  // These must never be rewritten through custom domain middleware.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|sign-in|auth/).*)"],
}
