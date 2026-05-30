"use client"

import { useState, type FormEvent } from "react"
import { cn } from "@/lib/utils"

export function JoinTheFamily({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error")
      return
    }
    setStatus("loading")
    // MVP placeholder — wire to a real email service in a future iteration
    setTimeout(() => {
      setStatus("success")
    }, 750)
  }

  if (status === "success") {
    return (
      <div className={cn(
        "flex items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]",
        compact ? "min-h-[80px] px-5 py-4" : "min-h-[200px] p-8 sm:p-12",
      )}>
        <div className="text-center">
          <p className={cn("font-black tracking-[-0.01em] text-foreground", compact ? "text-sm" : "text-lg sm:text-xl")}>
            You&apos;re on the list.
          </p>
          {!compact && <p className="mt-2 text-sm text-white/35">We&apos;ll be in touch.</p>}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex items-center gap-2.5"
        >
          <p className="shrink-0 text-sm font-black tracking-[-0.01em] text-foreground">
            Join the Family
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === "error") setStatus("idle")
            }}
            placeholder="your@email.com"
            aria-label="Email address"
            className={cn(
              "h-9 min-w-0 flex-1 rounded-full border bg-white/[0.04] px-4 text-sm text-foreground outline-none transition-all duration-150 placeholder:text-white/25",
              status === "error"
                ? "border-red-500/40 focus:border-red-500/60"
                : "border-white/[0.08] focus:border-accent/30",
            )}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="h-9 shrink-0 rounded-full bg-accent px-5 text-sm font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:[box-shadow:0_0_16px_color-mix(in_srgb,var(--accent)_22%,transparent)] disabled:opacity-60"
          >
            {status === "loading" ? "···" : "Join"}
          </button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-[11px] text-red-400/70">
            Please enter a valid email address.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8 text-center sm:p-12">
      <h2 className="text-2xl font-black tracking-[-0.01em] text-foreground sm:text-3xl">
        Join the Family
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/40">
        Get updates about new music, shows, radioshows, releases, guest lists and special events.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === "error") setStatus("idle")
          }}
          placeholder="email address"
          aria-label="Email address"
          className={cn(
            "h-11 flex-1 rounded-full border bg-white/[0.04] px-5 text-sm text-foreground outline-none transition-all duration-150 placeholder:text-white/28",
            status === "error"
              ? "border-red-500/40 focus:border-red-500/60"
              : "border-white/[0.08] focus:border-accent/30",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-11 rounded-full bg-accent px-7 text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)] disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === "loading" ? "···" : "Join"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-3 text-[11px] text-red-400/70">
          Please enter a valid email address.
        </p>
      )}
    </div>
  )
}
