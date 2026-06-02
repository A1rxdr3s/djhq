"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ConnectSection() {
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
    setTimeout(() => setStatus("success"), 750)
  }

  return (
    <div className="border-t border-white/[0.06] py-10 text-center sm:py-12">

      {status === "success" ? (
        <div>
          <p className="text-[1.5rem] font-black tracking-[-0.02em] text-foreground">
            You&apos;re on the list.
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/28">
            We&apos;ll be in touch.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-[1.75rem] font-black leading-none tracking-[-0.02em] text-foreground sm:text-[2.25rem]">
            GET ON THE LIST
          </h2>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto mt-5 flex max-w-xs items-center gap-2.5 sm:max-w-sm"
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
                "h-9 min-w-0 flex-1 border-b bg-transparent px-0 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-white/20",
                status === "error"
                  ? "border-red-500/40 focus:border-red-500/60"
                  : "border-white/[0.14] focus:border-accent/40",
              )}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              aria-label="Subscribe"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-white/30 transition-all duration-150 hover:border-accent/40 hover:text-accent disabled:opacity-40"
            >
              {status === "loading" ? (
                <span className="text-[9px]">···</span>
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </button>
          </form>

          {status === "error" ? (
            <p className="mt-3 text-[10px] text-red-400/70">
              Please enter a valid email address.
            </p>
          ) : (
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/25">
              Guest Lists&nbsp;•&nbsp;Early Access&nbsp;•&nbsp;Free Downloads
            </p>
          )}
        </>
      )}

    </div>
  )
}
