"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SocialLink } from "@/types/djhq"

type Props = {
  bookingEmail: string
  bookingUrl?: string
  socialLinks: SocialLink[]
}

export function ConnectSection({ bookingEmail, bookingUrl, socialLinks }: Props) {
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

  const hasBooking = !!bookingEmail.trim()
  const hasSocials = socialLinks.length > 0

  return (
    <div className="border-t border-white/[0.06] py-8 sm:py-10 lg:grid lg:grid-cols-[1fr_1.5fr] lg:gap-14">

      {/* Left: eyebrow + description */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent/55">
          Connect
        </p>
        <p className="mt-3 text-[13px] leading-[1.75] text-white/32">
          For bookings,{" "}
          <span className="inline lg:hidden">collaborations and updates.</span>
          <span className="hidden lg:inline">
            <br />collaborations and updates.
          </span>
        </p>
      </div>

      {/* Right: contacts + links + form */}
      <div className="mt-7 lg:mt-0">

        {/* Booking email */}
        {hasBooking && (
          <div className="mb-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-white/25">
              Booking
            </p>
            <a
              href={bookingUrl ?? `mailto:${bookingEmail}`}
              target={bookingUrl ? "_blank" : undefined}
              rel={bookingUrl ? "noopener noreferrer" : undefined}
              className="mt-1.5 block text-[13px] text-white/58 transition-colors duration-150 hover:text-accent"
            >
              {bookingEmail}
            </a>
          </div>
        )}

        {/* Social links */}
        {hasSocials && (
          <div className={cn("border-t border-white/[0.04] pt-4", !hasBooking && "border-t-0 pt-0")}>
            <div className="space-y-2.5">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[13px] text-white/42 transition-colors duration-150 hover:text-white/78"
                >
                  <span>{link.label}</span>
                  <span className="text-[12px] text-white/18 transition-colors duration-150 group-hover:text-accent/55">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Email form */}
        <div className="mt-5 border-t border-white/[0.04] pt-5">
          {status === "success" ? (
            <p className="text-[12px] text-white/40">You&apos;re on the list.</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex items-center gap-3"
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
                  "h-8 min-w-0 flex-1 border-b bg-transparent px-0 text-[12px] text-foreground outline-none transition-colors duration-150 placeholder:text-white/15",
                  status === "error"
                    ? "border-red-500/40 focus:border-red-500/60"
                    : "border-white/[0.10] focus:border-accent/35",
                )}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                aria-label="Subscribe"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-white/28 transition-all duration-150 hover:border-accent/40 hover:text-accent disabled:opacity-40"
              >
                {status === "loading" ? (
                  <span className="text-[9px]">···</span>
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="mt-1.5 text-[10px] text-red-400/70">
              Please enter a valid email address.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
