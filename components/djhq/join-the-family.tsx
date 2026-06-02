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
        "flex items-center overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]",
        compact ? "min-h-[64px] px-5 py-4" : "min-h-[120px] p-6 sm:p-8",
      )}>
        <div className={compact ? "" : "text-left"}>
          <p className={cn("font-black tracking-[-0.01em] text-foreground", compact ? "text-sm" : "text-base")}>
            You&apos;re on the list.
          </p>
          {!compact && <p className="mt-1 text-[13px] text-white/35">We&apos;ll be in touch.</p>}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex items-center gap-2.5"
        >
          <p className="shrink-0 text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/70">
            Direct to Inbox
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
            {status === "loading" ? "···" : "Subscribe"}
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
    <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <p className="text-[13px] leading-[1.75] text-white/40">
        New music. Upcoming shows.<br />Guest list announcements.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 flex max-w-sm flex-col gap-3 sm:flex-row"
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
            "h-10 flex-1 rounded-full border bg-white/[0.04] px-5 text-sm text-foreground outline-none transition-all duration-150 placeholder:text-white/28",
            status === "error"
              ? "border-red-500/40 focus:border-red-500/60"
              : "border-white/[0.08] focus:border-accent/30",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-10 rounded-full bg-accent px-6 text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)] disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === "loading" ? "···" : "Subscribe"}
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
