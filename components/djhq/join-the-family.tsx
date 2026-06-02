"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function JoinTheFamily() {
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
      <div className="border-t border-white/[0.06] py-6">
        <p className="text-[13px] font-semibold tracking-[-0.005em] text-foreground/80">
          You&apos;re on the list.
        </p>
        <p className="mt-1 text-[12px] text-white/30">We&apos;ll be in touch.</p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/[0.06] py-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent/55">
        Join the list
      </p>

      <p className="mt-3 text-[13px] leading-[1.75] text-white/38">
        New music.<br />
        Upcoming dates.<br />
        Guest list access.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-4 flex items-center gap-3"
      >
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
            "h-9 min-w-0 flex-1 border-b bg-transparent px-0 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-white/18",
            status === "error"
              ? "border-red-500/40 focus:border-red-500/60"
              : "border-white/[0.12] focus:border-accent/35",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-white/35 transition-all duration-150 hover:border-accent/40 hover:text-accent disabled:opacity-40"
        >
          {status === "loading" ? (
            <span className="text-[10px] tracking-widest">···</span>
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
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
