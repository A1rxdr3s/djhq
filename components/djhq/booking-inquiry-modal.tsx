"use client"

import { useState, type ReactNode } from "react"
import { Check, Loader2, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type BookingInquiryModalProps = {
  artistHandle: string
  artistName: string
}

type PreferredContact = "WhatsApp" | "Email"

type FormState = {
  name: string
  email: string
  phone: string
  preferredContact: PreferredContact
  eventDate: string
  city: string
  country: string
  company: string
  message: string
  website: string // honeypot
}

type ModalState = "idle" | "submitting" | "success" | "error"

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  preferredContact: "WhatsApp",
  eventDate: "",
  city: "",
  country: "",
  company: "",
  message: "",
  website: "",
}

export function BookingInquiryModal({ artistHandle, artistName }: BookingInquiryModalProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [modalState, setModalState] = useState<ModalState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setForm(INITIAL_FORM)
      setModalState("idle")
      setErrorMessage("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setModalState("submitting")
    setErrorMessage("")

    try {
      const response = await fetch("/api/booking-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistHandle,
          name: form.name,
          email: form.email,
          phone: form.phone,
          preferredContact: form.preferredContact,
          eventDate: form.eventDate,
          city: form.city,
          country: form.country,
          company: form.company,
          message: form.message,
          website: form.website,
        }),
      })

      const data = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok) {
        setErrorMessage(data.error ?? "Could not send inquiry. Please try again.")
        setModalState("error")
        return
      }

      setModalState("success")
    } catch {
      setErrorMessage("Could not send inquiry. Please try again.")
      setModalState("error")
    }
  }

  const isSubmitting = modalState === "submitting"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-fit items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-semibold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/15 transition-colors hover:bg-accent/90 sm:h-12"
      >
        <Send className="h-3.5 w-3.5" />
        Bookings
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "max-w-lg border-white/[0.08] bg-[#0c0c0c] p-0 sm:max-w-lg",
            "[&>button]:text-white/30 [&>button:hover]:text-white/60",
          )}
        >
          <div className="max-h-[92dvh] overflow-y-auto p-6 sm:p-7">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-base font-semibold uppercase tracking-[0.10em] text-foreground/85">
                Booking Inquiry
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground/50">
                Send booking details directly to the {artistName} team.
              </DialogDescription>
            </DialogHeader>

            {modalState === "success" ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
                  <Check className="h-5 w-5 text-accent" />
                </div>
                <p className="max-w-[280px] text-sm leading-relaxed text-foreground/70">
                  Booking inquiry sent. The artist team will contact you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot — hidden from real users */}
                <div aria-hidden className="hidden">
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Your full name"
                      required
                      maxLength={100}
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                      required
                      maxLength={200}
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Phone Number" required>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+56 9 1234 5678"
                      required
                      maxLength={30}
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                    />
                  </Field>
                  <Field label="Preferred Contact" required>
                    <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
                      {(["WhatsApp", "Email"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update("preferredContact", opt)}
                          disabled={isSubmitting}
                          className={cn(
                            "flex-1 rounded-md py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-100",
                            form.preferredContact === opt
                              ? "bg-white/[0.08] text-foreground/80"
                              : "text-muted-foreground/40 hover:text-muted-foreground/60",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Event Date" required>
                    <Input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => update("eventDate", e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                  </Field>
                  <Field label="City" required>
                    <Input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Santiago"
                      required
                      maxLength={100}
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                    />
                  </Field>
                  <Field label="Country" required>
                    <Input
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      placeholder="Chile"
                      required
                      maxLength={100}
                      disabled={isSubmitting}
                      className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                    />
                  </Field>
                </div>

                <Field label="Club / Promoter / Production Company" required>
                  <Input
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Company or event name"
                    required
                    maxLength={200}
                    disabled={isSubmitting}
                    className="border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                  />
                </Field>

                <Field label="Message / Comments">
                  <Textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Lineup, expected attendance, budget range, technical notes, or any relevant details."
                    rows={3}
                    maxLength={2000}
                    disabled={isSubmitting}
                    className="resize-none border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30"
                  />
                </Field>

                {modalState === "error" && (
                  <p className="text-[13px] text-destructive/80">{errorMessage}</p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/15 transition-colors hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {isSubmitting ? "Sending..." : "Send Inquiry"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/50">
        {label}
        {required && <span className="ml-0.5 text-accent/60">*</span>}
      </p>
      {children}
    </div>
  )
}
