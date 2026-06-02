"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = {
  artistName: string
  location: string
  bookingEmail: string
  isPro: boolean
}

export function ProfileClosing({ artistName, location, bookingEmail, isPro }: Props) {
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

  const year = new Date().getFullYear()
  const hasBooking = !!bookingEmail.trim()
  const locationStr = location.replace(/\s*\/\s*/g, " • ")

  return (
    <div className="border-t border-white/[0.06] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ── Layer 1 + 2: Newsletter ── */}
        <div className="py-8 text-center sm:py-9">
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
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.12] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45 transition-all duration-150 hover:border-accent/40 hover:text-accent disabled:opacity-40"
                >
                  {status === "loading" ? "···" : (
                    <>Join <ArrowRight className="h-3 w-3" /></>
                  )}
                </button>
              </form>

              {status === "error" ? (
                <p className="mt-3 text-[10px] text-red-400/70">
                  Please enter a valid email address.
                </p>
              ) : (
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/30">
                  Guest Lists&nbsp;•&nbsp;Early Access&nbsp;•&nbsp;Free Downloads
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Layer 3: Artist signature ── */}
        <div className="border-t border-white/[0.04] pt-5 sm:pt-6">
          <div className="lg:flex lg:items-start lg:justify-between">

            {/* Left: name + location */}
            <div>
              <p className="text-[0.95rem] font-black uppercase leading-none tracking-[-0.02em] text-foreground/85">
                {artistName}
              </p>
              {locationStr && (
                <p className="mt-1.5 text-[11px] text-white/28">
                  {locationStr}
                </p>
              )}
            </div>

            {/* Right: booking */}
            {hasBooking && (
              <div className="mt-4 lg:mt-0 lg:text-right">
                <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-white/22">
                  Booking
                </p>
                <a
                  href={`mailto:${bookingEmail}`}
                  className="mt-1 block text-[11px] text-white/38 transition-colors duration-150 hover:text-accent"
                >
                  {bookingEmail}
                </a>
              </div>
            )}

          </div>

          {/* Copyright — full width below both columns */}
          <p className="mt-4 pb-6 text-[10px] text-white/16 sm:pb-7">
            © {year} {artistName}
          </p>
        </div>

      </div>

      {/* Free plan attribution — absent on pro */}
      {!isPro && (
        <div className="border-t border-white/[0.03] py-3.5 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/"
              className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/14 transition-colors duration-150 hover:text-white/32"
            >
              Powered by DJHQ
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
