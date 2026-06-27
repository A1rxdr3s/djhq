import type { MetadataRoute } from "next"
import { getPublicBaseUrl } from "@/lib/djhq/seo"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/hq/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
