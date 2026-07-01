"use client"

import { useEffect, useState } from "react"
import { Download, Users, Copy, Check, UserMinus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Subscriber = {
  id: string
  email: string
  status: "subscribed" | "unsubscribed"
  source: "footer" | "presskit" | "api"
  subscribed_at: string
  unsubscribed_at: string | null
}

type Filter = "subscribed" | "unsubscribed" | "all"
type LoadState = "idle" | "loading" | "loaded" | "error"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  })
}

function subscribedCount(subscribers: Subscriber[]) {
  return subscribers.filter((s) => s.status === "subscribed").length
}

function thisMonthCount(subscribers: Subscriber[]) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return subscribers.filter(
    (s) => s.status === "subscribed" && new Date(s.subscribed_at).getTime() >= start,
  ).length
}

function buildCsv(subscribers: Subscriber[], handle: string, filter: Filter) {
  const rows = [
    ["email", "status", "source", "subscribed_at", "unsubscribed_at"],
    ...subscribers.map((s) => [
      s.email,
      s.status,
      s.source,
      s.subscribed_at,
      s.unsubscribed_at ?? "",
    ]),
  ]
  const csv  = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `${handle}-audience-${filter}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const FILTER_LABELS: Record<Filter, string> = {
  subscribed:   "Subscribed",
  unsubscribed: "Unsubscribed",
  all:          "All",
}

export function AudienceSection({ artistId }: { artistId: string }) {
  const [loadState,    setLoadState]    = useState<LoadState>("idle")
  const [subscribers,  setSubscribers]  = useState<Subscriber[]>([])
  const [handle,       setHandle]       = useState("")
  const [filter,       setFilter]       = useState<Filter>("subscribed")
  const [copiedId,     setCopiedId]     = useState<string | null>(null)
  const [confirmingId,       setConfirmingId]       = useState<string | null>(null)
  const [deletingConfirmId,  setDeletingConfirmId]  = useState<string | null>(null)
  const [pendingId,          setPendingId]          = useState<string | null>(null)
  const [actionError,        setActionError]        = useState<string | null>(null)

  // ── Data fetch ──────────────────────────────────────────────────────────────
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

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalSubscribed = subscribedCount(subscribers)
  const newThisMonth    = thisMonthCount(subscribers)
  const lastSignupSub   = subscribers.find((s) => s.status === "subscribed")
  const lastSignup      = lastSignupSub ? formatDate(lastSignupSub.subscribed_at) : null

  const filtered = subscribers.filter((s) => {
    if (filter === "all") return true
    return s.status === filter
  })

  // ── Actions ─────────────────────────────────────────────────────────────────
  function copyEmail(id: string, email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
    })
  }

  async function handleDelete(subscriberId: string) {
    setDeletingConfirmId(null)
    setPendingId(subscriberId)
    setActionError(null)
    try {
      const res = await fetch("/api/artists/subscribers", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ artistId, subscriberId }),
      })
      if (!res.ok) throw new Error("request failed")
      setSubscribers((prev) => prev.filter((s) => s.id !== subscriberId))
    } catch {
      setActionError(subscriberId)
      setTimeout(() => setActionError(null), 3000)
    } finally {
      setPendingId(null)
    }
  }

  async function handleAction(subscriberId: string, action: "unsubscribe" | "resubscribe") {
    setConfirmingId(null)
    setPendingId(subscriberId)
    setActionError(null)
    try {
      const res = await fetch("/api/artists/subscribers", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ artistId, subscriberId, action }),
      })
      if (!res.ok) throw new Error("request failed")
      // Optimistic update — mutate local state directly.
      const now = new Date().toISOString()
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id !== subscriberId
            ? s
            : action === "unsubscribe"
              ? { ...s, status: "unsubscribed", unsubscribed_at: now }
              : { ...s, status: "subscribed",   unsubscribed_at: null },
        ),
      )
    } catch {
      setActionError(subscriberId)
      setTimeout(() => setActionError(null), 3000)
    } finally {
      setPendingId(null)
    }
  }

  // ── Loading / error shells ──────────────────────────────────────────────────
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

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
            Subscribed
          </p>
          <p className="mt-1.5 text-[26px] font-bold leading-none text-foreground/90">
            {totalSubscribed}
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

      {/* ── List panel ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/40">

        {/* Header row: count badge + filter pills + export */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">

          {/* Count + filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
              {totalSubscribed > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent/80">
                  {totalSubscribed}
                </span>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex rounded-lg bg-secondary/60 p-0.5">
              {(["subscribed", "unsubscribed", "all"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFilter(f); setConfirmingId(null); setDeletingConfirmId(null) }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    filter === f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground/50 hover:text-muted-foreground",
                  )}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Export CSV — only when there's something to export */}
          {filtered.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => buildCsv(filtered, handle, filter)}
              className="h-7 gap-1.5 px-2.5 text-[11px] text-muted-foreground/60 hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Empty state — depends on filter */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20" />
            {subscribers.length === 0 ? (
              <>
                <p className="text-[13px] font-medium text-muted-foreground/50">No subscribers yet</p>
                <p className="max-w-[280px] text-[11px] leading-relaxed text-muted-foreground/35">
                  Subscribers from your public Stay Connected form will appear here.
                </p>
              </>
            ) : (
              <p className="text-[13px] font-medium text-muted-foreground/50">
                No {filter === "all" ? "" : FILTER_LABELS[filter].toLowerCase() + " "}subscribers.
              </p>
            )}
          </div>
        )}

        {/* Subscriber rows */}
        {filtered.length > 0 && (
          <div className="divide-y divide-border/50">
            {filtered.map((sub) => {
              const isConfirming       = confirmingId      === sub.id
              const isDeleteConfirming = deletingConfirmId === sub.id
              const isPending          = pendingId         === sub.id
              const hasError           = actionError       === sub.id
              const isSubscribed       = sub.status        === "subscribed"

              return (
                <div
                  key={sub.id}
                  className={cn(
                    "flex min-h-[40px] items-center gap-2 px-4 py-2.5 transition-colors",
                    isPending && "opacity-50",
                  )}
                >
                  {/* Email */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "truncate text-[12px]",
                      isSubscribed ? "text-foreground/80" : "text-muted-foreground/50 line-through",
                    )}>
                      {sub.email}
                    </p>
                    {hasError && (
                      <p className="text-[10px] text-red-400/70">Failed. Try again.</p>
                    )}
                  </div>

                  {/* Status badge */}
                  {isSubscribed ? (
                    <span className="hidden shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent/60 sm:inline">
                      active
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground/45">
                      removed
                    </span>
                  )}

                  {/* Source badge */}
                  <span className="hidden shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground/40 sm:inline">
                    {sub.source}
                  </span>

                  {/* Date */}
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground/40 md:block">
                    {formatDate(sub.subscribed_at)}
                  </span>

                  {/* Copy email */}
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

                  {/* Action area — unsubscribe trigger or confirm */}
                  {!isDeleteConfirming && isSubscribed && !isConfirming && (
                    <button
                      onClick={() => { setConfirmingId(sub.id); setDeletingConfirmId(null) }}
                      disabled={isPending}
                      aria-label="Remove subscriber"
                      className="shrink-0 rounded p-1 text-muted-foreground/25 transition-colors hover:text-red-400/60 disabled:cursor-not-allowed"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {!isDeleteConfirming && isSubscribed && isConfirming && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="hidden text-[10px] text-muted-foreground/50 sm:block">
                        Remove?
                      </span>
                      <button
                        onClick={() => handleAction(sub.id, "unsubscribe")}
                        className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400/80 transition-colors hover:bg-red-500/20"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                      >
                        No
                      </button>
                    </div>
                  )}

                  {!isDeleteConfirming && !isSubscribed && (
                    <button
                      onClick={() => handleAction(sub.id, "resubscribe")}
                      disabled={isPending}
                      aria-label="Restore subscriber"
                      className="shrink-0 rounded p-1 text-muted-foreground/25 transition-colors hover:text-accent/60 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Permanent delete — hidden while unsubscribe confirm is open */}
                  {!isConfirming && (
                    isDeleteConfirming ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="hidden text-[10px] text-muted-foreground/50 sm:block">
                          Delete forever?
                        </span>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400/80 transition-colors hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingConfirmId(null)}
                          className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDeletingConfirmId(sub.id); setConfirmingId(null) }}
                        disabled={isPending}
                        aria-label="Permanently delete subscriber"
                        className="shrink-0 rounded p-1 text-muted-foreground/25 transition-colors hover:text-red-500/80 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </div>
              )
            })}
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
