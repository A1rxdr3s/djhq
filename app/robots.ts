import { headers } from "next/headers"
import type { MetadataRoute } from "next"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

// Platform hostnames that should always use the DJHQ base URL in robots.txt.
// Custom domain requests use the requesting host so Search Console for that domain
// gets a sitemap URL on its own origin.
function isOwnedHost(hostname: string): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  let appHost = "djhq.app"
  try { appHost = new URL(appUrl).hostname } catch {}
  const owned = new Set(["djhq.app", "djhq.com", `www.djhq.app`, `www.djhq.com`, appHost])
  if (owned.has(hostname)) return true
  if (hostname.endsWith(".vercel.app") || hostname === "localhost" || hostname === "127.0.0.1") return true
  return false
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  let sitemapOrigin = getPublicBaseUrl()

  try {
    const headersList = await headers()
    const xForwardedHost = headersList.get("x-forwarded-host") ?? ""
    const host = headersList.get("host") ?? ""
    const hostname = (xForwardedHost || host).split(":")[0]
    if (hostname && !isOwnedHost(hostname)) {
      sitemapOrigin = `https://${hostname}`
    }
  } catch {
    // Static generation context — fall back to platform URL
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/hq/",
          "/api/",
          "/admin/",
        ],
      },
    ],
    sitemap: `${sitemapOrigin}/sitemap.xml`,
  }
}
