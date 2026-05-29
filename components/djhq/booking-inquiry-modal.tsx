"use client"

import { useState, type ReactNode } from "react"
import { Check, ChevronDown, Loader2, Send, Ticket } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type BookingInquiryModalProps = {
  artistHandle: string
  artistName: string
  pressKitUrl?: string
}

type PreferredContact = "WhatsApp" | "Email"

type FormState = {
  name: string
  email: string
  countryCode: string
  phone: string
  preferredContact: PreferredContact
  eventDate: string
  city: string
  country: string
  company: string
  budget: string
  message: string
  website: string // honeypot
}

type ModalState = "idle" | "submitting" | "success" | "error"

const COUNTRY_CODES = [
  { code: "+56", label: "🇨🇱 +56" },
  { code: "+1",  label: "🇺🇸 +1" },
  { code: "+34", label: "🇪🇸 +34" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+52", label: "🇲🇽 +52" },
  { code: "+54", label: "🇦🇷 +54" },
  { code: "+55", label: "🇧🇷 +55" },
]

const BUDGET_OPTIONS = [
  { value: "",             label: "Select a range" },
  { value: "Under $1,000",  label: "Under $1,000" },
  { value: "$1,000 – $3,000", label: "$1,000 – $3,000" },
  { value: "$3,000 – $5,000", label: "$3,000 – $5,000" },
  { value: "$5,000 – $10,000", label: "$5,000 – $10,000" },
  { value: "$10,000+",    label: "$10,000+" },
  { value: "Prefer not to say", label: "Prefer not to say" },
]

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  countryCode: "+56",
  phone: "",
  preferredContact: "WhatsApp",
  eventDate: "",
  city: "",
  country: "",
  company: "",
  budget: "",
  message: "",
  website: "",
}

const inputClass = "h-11 border-white/[0.08] bg-white/[0.03] text-foreground placeholder:text-muted-foreground/30 focus-visible:border-accent/40 focus-visible:ring-0 transition-colors duration-150"
const fieldLabelClass = "text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/50"

export function BookingInquiryModal({ artistHandle, artistName, pressKitUrl }: BookingInquiryModalProps) {
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

    const fullPhone = form.phone.trim() ? `${form.countryCode} ${form.phone.trim()}` : ""

    try {
      const response = await fetch("/api/booking-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistHandle,
          name: form.name,
          email: form.email,
          phone: fullPhone,
          preferredContact: form.preferredContact,
          eventDate: form.eventDate,
          city: form.city,
          country: form.country,
          company: form.company,
          message: form.budget
            ? `[Budget: ${form.budget}]\n\n${form.message}`
            : form.message,
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
            "max-w-2xl border-white/[0.08] bg-[#0c0c0c] p-0 sm:max-w-2xl",
            "[&>button]:text-white/30 [&>button:hover]:text-white/60",
          )}
        >
          <div className="max-h-[92dvh] overflow-y-auto p-6 sm:p-8">

            {modalState === "success" ? (
              <SuccessScreen artistName={artistName} pressKitUrl={pressKitUrl} onClose={() => handleOpenChange(false)} />
            ) : (
              <>
                <DialogHeader className="mb-7 text-left">
                  <DialogTitle className="text-base font-semibold uppercase tracking-[0.10em] text-foreground/85">
                    Booking Inquiry
                  </DialogTitle>
                  <p className="mt-1.5 text-[13px] text-muted-foreground/55 leading-relaxed">
                    Bring {artistName} to your venue, club, festival or private event.
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground/35">
                    Typical response time: 24–48 hours
                  </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
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

                  {/* Row 1: Name + Email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Your full name"
                        required
                        maxLength={100}
                        disabled={isSubmitting}
                        className={inputClass}
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
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  {/* Row 2: Phone + Preferred Contact */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Phone Number" required>
                      <div className="flex gap-2">
                        <div className="relative">
                          <select
                            value={form.countryCode}
                            onChange={(e) => update("countryCode", e.target.value)}
                            disabled={isSubmitting}
                            className="h-11 appearance-none rounded-md border border-white/[0.08] bg-white/[0.03] pl-3 pr-7 text-[12px] text-foreground/80 focus:border-accent/40 focus:outline-none transition-colors duration-150"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code} className="bg-[#0c0c0c]">
                                {c.code}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
                        </div>
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="9 1234 5678"
                          required
                          maxLength={20}
                          disabled={isSubmitting}
                          className={cn(inputClass, "flex-1")}
                        />
                      </div>
                    </Field>
                    <Field label="Preferred Contact" required>
                      <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1 h-11">
                        {(["WhatsApp", "Email"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => update("preferredContact", opt)}
                            disabled={isSubmitting}
                            className={cn(
                              "flex-1 h-full rounded-md py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-100",
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

                  {/* Row 3: Date + City + Country */}
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Event Date" required>
                      <Input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => update("eventDate", e.target.value)}
                        required
                        disabled={isSubmitting}
                        className={cn(inputClass, "text-foreground/80")}
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
                        className={inputClass}
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
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  {/* Row 4: Company */}
                  <Field label="Club / Promoter / Production Company" required>
                    <Input
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                      placeholder="Company or event name"
                      required
                      maxLength={200}
                      disabled={isSubmitting}
                      className={inputClass}
                    />
                  </Field>

                  {/* Row 5: Budget */}
                  <Field label="Estimated Budget">
                    <div className="relative">
                      <select
                        value={form.budget}
                        onChange={(e) => update("budget", e.target.value)}
                        disabled={isSubmitting}
                        className={cn(
                          "w-full appearance-none rounded-md border border-white/[0.08] bg-white/[0.03] px-3 pr-9 text-[13px] transition-colors duration-150 focus:border-accent/40 focus:outline-none",
                          "h-11",
                          form.budget ? "text-foreground" : "text-muted-foreground/40",
                        )}
                      >
                        {BUDGET_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-[#0c0c0c] text-foreground">
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                    </div>
                  </Field>

                  {/* Row 6: Message */}
                  <Field label="Message / Comments">
                    <Textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Lineup, expected attendance, technical notes, or any relevant details."
                      rows={3}
                      maxLength={2000}
                      disabled={isSubmitting}
                      className="resize-none border-white/[0.08] bg-white/[0.03] placeholder:text-muted-foreground/30 focus-visible:border-accent/40 focus-visible:ring-0 transition-colors duration-150"
                    />
                  </Field>

                  {modalState === "error" && (
                    <p className="text-[13px] text-destructive/80">{errorMessage}</p>
                  )}

                  {/* Trust line */}
                  <p className="text-[10px] text-muted-foreground/28 leading-relaxed">
                    This information helps us evaluate availability, routing, venue requirements and the best way to contact you regarding your event.
                  </p>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/15 transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Inquiry...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Inquiry
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuccessScreen({
  artistName,
  pressKitUrl,
  onClose,
}: {
  artistName: string
  pressKitUrl?: string
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
        <Check className="h-6 w-6 text-accent" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold uppercase tracking-[0.08em] text-foreground/85">
          Inquiry Sent Successfully
        </p>
        <p className="max-w-[300px] text-[13px] leading-relaxed text-muted-foreground/60">
          Thank you for reaching out. The {artistName} team has received your request and will review the details shortly.
        </p>
        <p className="text-[11px] text-muted-foreground/35">
          Typical response time is 24–48 hours.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-fit items-center rounded-full border border-white/[0.12] px-6 text-sm font-medium text-white/60 transition-colors hover:border-white/[0.22] hover:text-white/80"
        >
          Close
        </button>
        {pressKitUrl && (
          <a
            href={pressKitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-fit items-center gap-2 px-4 text-[12px] text-accent/60 transition-colors hover:text-accent/80"
          >
            <Ticket className="h-3.5 w-3.5" />
            Download Press Kit
          </a>
        )}
      </div>
    </div>
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
      <p className={fieldLabelClass}>
        {label}
        {required && <span className="ml-0.5 text-accent/60">*</span>}
      </p>
      {children}
    </div>
  )
}
