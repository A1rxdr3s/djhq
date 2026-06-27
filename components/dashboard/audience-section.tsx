"use client"

import { useEffect, useState } from "react"
import { Download, Users, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

type Subscriber = {
  id: string
  email: string
  status: "subscribed" | "unsubscribed"
  source: "footer" | "presskit" | "api"
  subscribed_at: string
}

type LoadState = "idle" | "loading" | "loaded" | "error"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  })
}

function thisMonthCount(subscribers: Subscriber[]) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return subscribers.filter(
    (s) => s.status === "subscribed" && new Date(s.subscribed_at).getTime() >= start
  ).length
}

function buildCsv(subscribers: Subscriber[], handle: string) {
  const rows = [
    ["email", "status", "source", "subscribed_at"],
    ...subscribers.map((s) => [
      s.email,
      s.status,
      s.source,
      s.subscribed_at,
    ]),
  ]
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `${handle}-subscribers.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AudienceSection({ artistId }: { artistId: string }) {
  const [loadState,   setLoadState]   = useState<LoadState>("idle")
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [handle,      setHandle]      = useState("")
  const [copiedId,    setCopiedId]    = useState<string | null>(null)

  useEffect(() => {
    if (loadState !== "idle") return
    setLoadState("loading")
    fetch(`/api/artists/subscribers?artistId=${artistId}`)
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers ?? [])
        setHandle(data.handle ?? "")
        setLoadState("loaded")
      })
      .catch(() => setLoadState("error"))
  }, [artistId, loadState])

  const active = subscribers.filter((s) => s.status === "subscribed")

  function copyEmail(id: string, email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
    })
  }

  if (loadState === "loading" || loadState === "idle") {
    return (
      <div className="flex items-center justify-center py-16 text-[12px] text-muted-foreground/40">
        Loading…
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col items-center gap-2 py-16">
        <p className="text-[13px] text-muted-foreground/60">Couldn&apos;t load subscribers.</p>
        <button
          onClick={() => setLoadState("idle")}
          className="text-[12px] text-accent/70 underline underline-offset-2 hover:text-accent"
        >
          Try again
        </button>
      </div>
    )
  }

  const newThisMonth = thisMonthCount(subscribers)
  const lastSignup   = active[0]?.subscribed_at
    ? formatDate(active[0].subscribed_at)
    : null

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
            Total
          </p>
          <p className="mt-1.5 text-[26px] font-bold leading-none text-foreground/90">
            {active.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
            This Month
          </p>
          <p className="mt-1.5 text-[26px] font-bold leading-none text-foreground/90">
            {newThisMonth}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card/40 p-4 sm:col-span-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
            Last Signup
          </p>
          <p className="mt-1.5 text-[14px] font-semibold leading-none text-foreground/90">
            {lastSignup ?? "—"}
          </p>
        </div>
      </div>

      {/* Subscriber list */}
      <div className="rounded-xl border border-border bg-card/40">

        {/* List header + export */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[12px] font-semibold text-foreground/80">
              Subscribers
            </span>
            {active.length > 0 && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent/80">
                {active.length}
              </span>
            )}
          </div>
          {active.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => buildCsv(subscribers, handle)}
              className="h-7 gap-1.5 px-2.5 text-[11px] text-muted-foreground/60 hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Empty state */}
        {subscribers.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-[13px] font-medium text-muted-foreground/50">No subscribers yet</p>
            <p className="max-w-[280px] text-[11px] leading-relaxed text-muted-foreground/35">
              Subscribers from your public Stay Connected form will appear here.
            </p>
          </div>
        )}

        {/* Rows */}
        {subscribers.length > 0 && (
          <div className="divide-y divide-border/50">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* Email + copy */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-foreground/80">{sub.email}</p>
                </div>

                {/* Source badge */}
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground/50">
                  {sub.source}
                </span>

                {/* Status badge — only show if unsubscribed */}
                {sub.status === "unsubscribed" && (
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400/70">
                    unsub
                  </span>
                )}

                {/* Joined date */}
                <span className="hidden shrink-0 text-[11px] text-muted-foreground/40 sm:block">
                  {formatDate(sub.subscribed_at)}
                </span>

                {/* Copy button */}
                <button
                  onClick={() => copyEmail(sub.id, sub.email)}
                  aria-label={`Copy ${sub.email}`}
                  className="shrink-0 rounded p-1 text-muted-foreground/30 transition-colors hover:text-muted-foreground/70"
                >
                  {copiedId === sub.id ? (
                    <Check className="h-3.5 w-3.5 text-accent/70" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {subscribers.length >= 500 && (
        <p className="text-center text-[11px] text-muted-foreground/35">
          Showing first 500 subscribers. Export CSV for the full list.
        </p>
      )}
    </div>
  )
}
