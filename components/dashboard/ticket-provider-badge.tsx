// Detects the ticket provider from a URL and renders a compact badge.
// Architecture: extend PROVIDERS array to add new platforms without changing consumers.

const PROVIDERS = [
  { test: (h: string) => h === "ra.co" || h.endsWith(".ra.co"), label: "RA" },
  { test: (h: string) => h === "dice.fm" || h.endsWith(".dice.fm"), label: "Dice" },
  { test: (h: string) => h === "shotgun.live" || h.endsWith(".shotgun.live"), label: "Shotgun" },
  { test: (h: string) => /(?:^|\.)eventbrite\./.test(h), label: "Eventbrite" },
  { test: (h: string) => h === "tixr.com" || h.endsWith(".tixr.com"), label: "Tixr" },
  { test: (h: string) => h === "seetickets.com" || h.endsWith(".seetickets.com"), label: "See" },
]

function detectProvider(url: string): string | null {
  if (!url.trim()) return null
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`
    const { hostname } = new URL(normalized)
    for (const { test, label } of PROVIDERS) {
      if (test(hostname)) return label
    }
  } catch {
    // Incomplete or invalid URL — not an error state
  }
  return null
}

export function TicketProviderBadge({ url }: { url: string }) {
  const provider = detectProvider(url)
  if (!provider) return null

  return (
    <span className="inline-flex shrink-0 items-center rounded border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
      {provider}
    </span>
  )
}
