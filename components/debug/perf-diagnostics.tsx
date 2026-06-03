"use client"

import { useEffect } from "react"

type Props = {
  page: "artist-home" | "presskit"
}

/**
 * Temporary client-side performance diagnostics.
 * Only active when ?debug=1 is in the URL. Renders nothing visible.
 * Remove after performance analysis is complete.
 */
export function PerfDiagnostics({ page }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("debug") !== "1") return

    const prefix = page === "artist-home" ? "[artist-home-client]" : "[presskit-client]"

    const report = () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[]

      // LCP — buffered PerformanceObserver
      try {
        const lcpObs = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (!entries.length) return
          // PerformanceEntry doesn't expose .url natively; cast to access it
          const lcp = entries[entries.length - 1] as PerformanceEntry & { url?: string }
          console.info(prefix, JSON.stringify({
            metric: "LCP",
            url: lcp.url ?? "unknown",
            startMs: Math.round(lcp.startTime),
          }))
          lcpObs.disconnect()
        })
        lcpObs.observe({ type: "largest-contentful-paint", buffered: true })
      } catch {
        // LCP API unavailable in this browser
      }

      // 10 slowest resources by duration
      const slowest = [...resources]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map((e) => ({
          name: e.name.replace(window.location.origin, ""),
          durationMs: Math.round(e.duration),
          transferSize: e.transferSize,
          decodedBodySize: e.decodedBodySize,
          initiatorType: e.initiatorType,
        }))
      console.info(prefix, JSON.stringify({ metric: "slowest-10", resources: slowest }))

      // All /_next/image requests with timing and size
      const nextImages = resources
        .filter((e) => e.name.includes("/_next/image"))
        .map((e) => ({
          url: e.name.replace(window.location.origin, ""),
          durationMs: Math.round(e.duration),
          transferSize: e.transferSize,
          decodedBodySize: e.decodedBodySize,
        }))
      console.info(prefix, JSON.stringify({
        metric: "next-images",
        count: nextImages.length,
        images: nextImages,
      }))
    }

    if (document.readyState === "complete") {
      report()
    } else {
      window.addEventListener("load", report, { once: true })
    }
  }, [page])

  return null
}
