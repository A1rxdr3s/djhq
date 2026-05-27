import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Redirect target for unresolvable custom domains.
// NEXT_PUBLIC_APP_URL must be set in production (e.g. "https://djhq.vercel.app").
const FALLBACK_APP_URL = "https://djhq.vercel.app"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_URL

// Hostnames that belong to DJHQ's own infrastructure — always pass through.
const DJHQ_OWNED_HOSTNAMES = new Set(["djhq.com", "www.djhq.com", "localhost", "127.0.0.1"])

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

  // Internally serve /[handle] while the browser URL stays on the custom domain.
  const url = request.nextUrl.clone()
  url.pathname = `/${artist.handle}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Exclude static assets, images, API routes, and internal auth/dashboard paths.
  // These must never be rewritten through custom domain middleware.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|sign-in|auth/).*)"],
}
