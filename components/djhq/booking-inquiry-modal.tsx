"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"
import { Check, ChevronDown, Loader2, Send, Search, Ticket } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Country data — comprehensive ITU-T E.164 dial codes for all UN member states
// + key territories. Flag emoji computed from ISO 3166-1 alpha-2 code at runtime.
// ---------------------------------------------------------------------------
type Country = { name: string; iso: string; dialCode: string }

function flag(iso: string): string {
  return [...iso.toUpperCase()].map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65),
  ).join("")
}

const COUNTRIES: Country[] = [
  { name: "Chile", iso: "CL", dialCode: "+56" },
  { name: "United States", iso: "US", dialCode: "+1" },
  { name: "United Kingdom", iso: "GB", dialCode: "+44" },
  { name: "Spain", iso: "ES", dialCode: "+34" },
  { name: "Mexico", iso: "MX", dialCode: "+52" },
  { name: "Argentina", iso: "AR", dialCode: "+54" },
  { name: "Brazil", iso: "BR", dialCode: "+55" },
  { name: "Colombia", iso: "CO", dialCode: "+57" },
  { name: "Germany", iso: "DE", dialCode: "+49" },
  { name: "France", iso: "FR", dialCode: "+33" },
  { name: "Italy", iso: "IT", dialCode: "+39" },
  { name: "Netherlands", iso: "NL", dialCode: "+31" },
  { name: "Belgium", iso: "BE", dialCode: "+32" },
  { name: "Switzerland", iso: "CH", dialCode: "+41" },
  { name: "Austria", iso: "AT", dialCode: "+43" },
  { name: "Portugal", iso: "PT", dialCode: "+351" },
  // A
  { name: "Afghanistan", iso: "AF", dialCode: "+93" },
  { name: "Albania", iso: "AL", dialCode: "+355" },
  { name: "Algeria", iso: "DZ", dialCode: "+213" },
  { name: "Andorra", iso: "AD", dialCode: "+376" },
  { name: "Angola", iso: "AO", dialCode: "+244" },
  { name: "Antigua and Barbuda", iso: "AG", dialCode: "+1268" },
  { name: "Armenia", iso: "AM", dialCode: "+374" },
  { name: "Australia", iso: "AU", dialCode: "+61" },
  { name: "Azerbaijan", iso: "AZ", dialCode: "+994" },
  // B
  { name: "Bahamas", iso: "BS", dialCode: "+1242" },
  { name: "Bahrain", iso: "BH", dialCode: "+973" },
  { name: "Bangladesh", iso: "BD", dialCode: "+880" },
  { name: "Barbados", iso: "BB", dialCode: "+1246" },
  { name: "Belarus", iso: "BY", dialCode: "+375" },
  { name: "Belize", iso: "BZ", dialCode: "+501" },
  { name: "Benin", iso: "BJ", dialCode: "+229" },
  { name: "Bhutan", iso: "BT", dialCode: "+975" },
  { name: "Bolivia", iso: "BO", dialCode: "+591" },
  { name: "Bosnia and Herzegovina", iso: "BA", dialCode: "+387" },
  { name: "Botswana", iso: "BW", dialCode: "+267" },
  { name: "Brunei", iso: "BN", dialCode: "+673" },
  { name: "Bulgaria", iso: "BG", dialCode: "+359" },
  { name: "Burkina Faso", iso: "BF", dialCode: "+226" },
  { name: "Burundi", iso: "BI", dialCode: "+257" },
  // C
  { name: "Cabo Verde", iso: "CV", dialCode: "+238" },
  { name: "Cambodia", iso: "KH", dialCode: "+855" },
  { name: "Cameroon", iso: "CM", dialCode: "+237" },
  { name: "Canada", iso: "CA", dialCode: "+1" },
  { name: "Central African Republic", iso: "CF", dialCode: "+236" },
  { name: "Chad", iso: "TD", dialCode: "+235" },
  { name: "China", iso: "CN", dialCode: "+86" },
  { name: "Comoros", iso: "KM", dialCode: "+269" },
  { name: "Congo", iso: "CG", dialCode: "+242" },
  { name: "Congo (DRC)", iso: "CD", dialCode: "+243" },
  { name: "Costa Rica", iso: "CR", dialCode: "+506" },
  { name: "Croatia", iso: "HR", dialCode: "+385" },
  { name: "Cuba", iso: "CU", dialCode: "+53" },
  { name: "Cyprus", iso: "CY", dialCode: "+357" },
  { name: "Czechia", iso: "CZ", dialCode: "+420" },
  // D
  { name: "Denmark", iso: "DK", dialCode: "+45" },
  { name: "Djibouti", iso: "DJ", dialCode: "+253" },
  { name: "Dominica", iso: "DM", dialCode: "+1767" },
  { name: "Dominican Republic", iso: "DO", dialCode: "+1809" },
  // E
  { name: "Ecuador", iso: "EC", dialCode: "+593" },
  { name: "Egypt", iso: "EG", dialCode: "+20" },
  { name: "El Salvador", iso: "SV", dialCode: "+503" },
  { name: "Equatorial Guinea", iso: "GQ", dialCode: "+240" },
  { name: "Eritrea", iso: "ER", dialCode: "+291" },
  { name: "Estonia", iso: "EE", dialCode: "+372" },
  { name: "Eswatini", iso: "SZ", dialCode: "+268" },
  { name: "Ethiopia", iso: "ET", dialCode: "+251" },
  // F
  { name: "Fiji", iso: "FJ", dialCode: "+679" },
  { name: "Finland", iso: "FI", dialCode: "+358" },
  // G
  { name: "Gabon", iso: "GA", dialCode: "+241" },
  { name: "Gambia", iso: "GM", dialCode: "+220" },
  { name: "Georgia", iso: "GE", dialCode: "+995" },
  { name: "Ghana", iso: "GH", dialCode: "+233" },
  { name: "Greece", iso: "GR", dialCode: "+30" },
  { name: "Grenada", iso: "GD", dialCode: "+1473" },
  { name: "Guatemala", iso: "GT", dialCode: "+502" },
  { name: "Guinea", iso: "GN", dialCode: "+224" },
  { name: "Guinea-Bissau", iso: "GW", dialCode: "+245" },
  { name: "Guyana", iso: "GY", dialCode: "+592" },
  // H
  { name: "Haiti", iso: "HT", dialCode: "+509" },
  { name: "Honduras", iso: "HN", dialCode: "+504" },
  { name: "Hungary", iso: "HU", dialCode: "+36" },
  // I
  { name: "Iceland", iso: "IS", dialCode: "+354" },
  { name: "India", iso: "IN", dialCode: "+91" },
  { name: "Indonesia", iso: "ID", dialCode: "+62" },
  { name: "Iran", iso: "IR", dialCode: "+98" },
  { name: "Iraq", iso: "IQ", dialCode: "+964" },
  { name: "Ireland", iso: "IE", dialCode: "+353" },
  { name: "Israel", iso: "IL", dialCode: "+972" },
  { name: "Ivory Coast", iso: "CI", dialCode: "+225" },
  // J
  { name: "Jamaica", iso: "JM", dialCode: "+1876" },
  { name: "Japan", iso: "JP", dialCode: "+81" },
  { name: "Jordan", iso: "JO", dialCode: "+962" },
  // K
  { name: "Kazakhstan", iso: "KZ", dialCode: "+7" },
  { name: "Kenya", iso: "KE", dialCode: "+254" },
  { name: "Kiribati", iso: "KI", dialCode: "+686" },
  { name: "Kuwait", iso: "KW", dialCode: "+965" },
  { name: "Kyrgyzstan", iso: "KG", dialCode: "+996" },
  // L
  { name: "Laos", iso: "LA", dialCode: "+856" },
  { name: "Latvia", iso: "LV", dialCode: "+371" },
  { name: "Lebanon", iso: "LB", dialCode: "+961" },
  { name: "Lesotho", iso: "LS", dialCode: "+266" },
  { name: "Liberia", iso: "LR", dialCode: "+231" },
  { name: "Libya", iso: "LY", dialCode: "+218" },
  { name: "Liechtenstein", iso: "LI", dialCode: "+423" },
  { name: "Lithuania", iso: "LT", dialCode: "+370" },
  { name: "Luxembourg", iso: "LU", dialCode: "+352" },
  // M
  { name: "Madagascar", iso: "MG", dialCode: "+261" },
  { name: "Malawi", iso: "MW", dialCode: "+265" },
  { name: "Malaysia", iso: "MY", dialCode: "+60" },
  { name: "Maldives", iso: "MV", dialCode: "+960" },
  { name: "Mali", iso: "ML", dialCode: "+223" },
  { name: "Malta", iso: "MT", dialCode: "+356" },
  { name: "Marshall Islands", iso: "MH", dialCode: "+692" },
  { name: "Mauritania", iso: "MR", dialCode: "+222" },
  { name: "Mauritius", iso: "MU", dialCode: "+230" },
  { name: "Micronesia", iso: "FM", dialCode: "+691" },
  { name: "Moldova", iso: "MD", dialCode: "+373" },
  { name: "Monaco", iso: "MC", dialCode: "+377" },
  { name: "Mongolia", iso: "MN", dialCode: "+976" },
  { name: "Montenegro", iso: "ME", dialCode: "+382" },
  { name: "Morocco", iso: "MA", dialCode: "+212" },
  { name: "Mozambique", iso: "MZ", dialCode: "+258" },
  { name: "Myanmar", iso: "MM", dialCode: "+95" },
  // N
  { name: "Namibia", iso: "NA", dialCode: "+264" },
  { name: "Nauru", iso: "NR", dialCode: "+674" },
  { name: "Nepal", iso: "NP", dialCode: "+977" },
  { name: "New Zealand", iso: "NZ", dialCode: "+64" },
  { name: "Nicaragua", iso: "NI", dialCode: "+505" },
  { name: "Niger", iso: "NE", dialCode: "+227" },
  { name: "Nigeria", iso: "NG", dialCode: "+234" },
  { name: "North Korea", iso: "KP", dialCode: "+850" },
  { name: "North Macedonia", iso: "MK", dialCode: "+389" },
  { name: "Norway", iso: "NO", dialCode: "+47" },
  // O
  { name: "Oman", iso: "OM", dialCode: "+968" },
  // P
  { name: "Pakistan", iso: "PK", dialCode: "+92" },
  { name: "Palau", iso: "PW", dialCode: "+680" },
  { name: "Panama", iso: "PA", dialCode: "+507" },
  { name: "Papua New Guinea", iso: "PG", dialCode: "+675" },
  { name: "Paraguay", iso: "PY", dialCode: "+595" },
  { name: "Peru", iso: "PE", dialCode: "+51" },
  { name: "Philippines", iso: "PH", dialCode: "+63" },
  { name: "Poland", iso: "PL", dialCode: "+48" },
  { name: "Qatar", iso: "QA", dialCode: "+974" },
  // R
  { name: "Romania", iso: "RO", dialCode: "+40" },
  { name: "Russia", iso: "RU", dialCode: "+7" },
  { name: "Rwanda", iso: "RW", dialCode: "+250" },
  // S
  { name: "Saint Kitts and Nevis", iso: "KN", dialCode: "+1869" },
  { name: "Saint Lucia", iso: "LC", dialCode: "+1758" },
  { name: "Saint Vincent and the Grenadines", iso: "VC", dialCode: "+1784" },
  { name: "Samoa", iso: "WS", dialCode: "+685" },
  { name: "San Marino", iso: "SM", dialCode: "+378" },
  { name: "São Tomé and Príncipe", iso: "ST", dialCode: "+239" },
  { name: "Saudi Arabia", iso: "SA", dialCode: "+966" },
  { name: "Senegal", iso: "SN", dialCode: "+221" },
  { name: "Serbia", iso: "RS", dialCode: "+381" },
  { name: "Seychelles", iso: "SC", dialCode: "+248" },
  { name: "Sierra Leone", iso: "SL", dialCode: "+232" },
  { name: "Singapore", iso: "SG", dialCode: "+65" },
  { name: "Slovakia", iso: "SK", dialCode: "+421" },
  { name: "Slovenia", iso: "SI", dialCode: "+386" },
  { name: "Solomon Islands", iso: "SB", dialCode: "+677" },
  { name: "Somalia", iso: "SO", dialCode: "+252" },
  { name: "South Africa", iso: "ZA", dialCode: "+27" },
  { name: "South Korea", iso: "KR", dialCode: "+82" },
  { name: "South Sudan", iso: "SS", dialCode: "+211" },
  { name: "Sri Lanka", iso: "LK", dialCode: "+94" },
  { name: "Sudan", iso: "SD", dialCode: "+249" },
  { name: "Suriname", iso: "SR", dialCode: "+597" },
  { name: "Sweden", iso: "SE", dialCode: "+46" },
  { name: "Syria", iso: "SY", dialCode: "+963" },
  // T
  { name: "Taiwan", iso: "TW", dialCode: "+886" },
  { name: "Tajikistan", iso: "TJ", dialCode: "+992" },
  { name: "Tanzania", iso: "TZ", dialCode: "+255" },
  { name: "Thailand", iso: "TH", dialCode: "+66" },
  { name: "Timor-Leste", iso: "TL", dialCode: "+670" },
  { name: "Togo", iso: "TG", dialCode: "+228" },
  { name: "Tonga", iso: "TO", dialCode: "+676" },
  { name: "Trinidad and Tobago", iso: "TT", dialCode: "+1868" },
  { name: "Tunisia", iso: "TN", dialCode: "+216" },
  { name: "Turkey", iso: "TR", dialCode: "+90" },
  { name: "Turkmenistan", iso: "TM", dialCode: "+993" },
  { name: "Tuvalu", iso: "TV", dialCode: "+688" },
  // U
  { name: "Uganda", iso: "UG", dialCode: "+256" },
  { name: "Ukraine", iso: "UA", dialCode: "+380" },
  { name: "United Arab Emirates", iso: "AE", dialCode: "+971" },
  { name: "Uruguay", iso: "UY", dialCode: "+598" },
  { name: "Uzbekistan", iso: "UZ", dialCode: "+998" },
  // V
  { name: "Vanuatu", iso: "VU", dialCode: "+678" },
  { name: "Venezuela", iso: "VE", dialCode: "+58" },
  { name: "Vietnam", iso: "VN", dialCode: "+84" },
  // Y
  { name: "Yemen", iso: "YE", dialCode: "+967" },
  // Z
  { name: "Zambia", iso: "ZM", dialCode: "+260" },
  { name: "Zimbabwe", iso: "ZW", dialCode: "+263" },
]

const DEFAULT_COUNTRY = COUNTRIES[0] // Chile

// ---------------------------------------------------------------------------
// CountrySelect — custom searchable dropdown, dark-theme styled
// ---------------------------------------------------------------------------
type CountrySelectProps = {
  value: string // dialCode
  onChange: (dialCode: string) => void
  disabled?: boolean
}

function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = COUNTRIES.find((c) => c.iso === value) ?? DEFAULT_COUNTRY

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search),
      )
    : COUNTRIES

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); setSearch("") }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 transition-colors duration-150 hover:border-white/[0.14] focus:border-accent/40 focus:outline-none disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[18px] leading-none">{flag(selected.iso)}</span>
        <span className="min-w-[2.5rem] text-left text-[12px] font-medium text-foreground/75">{selected.dialCode}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] shadow-2xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <p className="px-4 py-5 text-center text-[11px] text-muted-foreground/35">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  role="option"
                  aria-selected={selected.iso === c.iso}
                  onClick={() => { onChange(c.iso); setOpen(false); setSearch("") }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 hover:bg-white/[0.04]",
                    selected.iso === c.iso ? "bg-white/[0.03]" : "",
                  )}
                >
                  <span className="text-[16px] leading-none">{flag(c.iso)}</span>
                  <span className={cn("flex-1 truncate text-[12px]", selected.iso === c.iso ? "text-foreground/90" : "text-foreground/60")}>
                    {c.name}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/38">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal types
// ---------------------------------------------------------------------------
type BookingInquiryModalProps = {
  artistHandle: string
  artistName: string
  pressKitUrl?: string
}

type PreferredContact = "WhatsApp" | "Email"

type FormState = {
  name: string
  email: string
  countryIso: string // ISO 2-letter code — drives CountrySelect
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

const BUDGET_OPTIONS = [
  { value: "", label: "Select a range" },
  { value: "Under $1,000", label: "Under $1,000" },
  { value: "$1,000 – $3,000", label: "$1,000 – $3,000" },
  { value: "$3,000 – $5,000", label: "$3,000 – $5,000" },
  { value: "$5,000 – $10,000", label: "$5,000 – $10,000" },
  { value: "$10,000+", label: "$10,000+" },
  { value: "Prefer not to say", label: "Prefer not to say" },
]

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  countryIso: "CL", // default: Chile
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

const inputClass =
  "h-11 border-white/[0.08] bg-white/[0.03] text-foreground placeholder:text-muted-foreground/30 focus-visible:border-accent/40 focus-visible:ring-0 transition-colors duration-150"
const fieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/50"

// ---------------------------------------------------------------------------
// BookingInquiryModal
// ---------------------------------------------------------------------------
export function BookingInquiryModal({
  artistHandle,
  artistName,
  pressKitUrl,
}: BookingInquiryModalProps) {
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

    const selectedCountry = COUNTRIES.find((c) => c.iso === form.countryIso) ?? DEFAULT_COUNTRY
    const fullPhone = form.phone.trim()
      ? `${selectedCountry.dialCode} ${form.phone.trim()}`
      : ""

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
              <SuccessScreen
                artistName={artistName}
                pressKitUrl={pressKitUrl}
                onClose={() => handleOpenChange(false)}
              />
            ) : (
              <>
                <DialogHeader className="mb-7 text-left">
                  <DialogTitle className="text-base font-semibold uppercase tracking-[0.10em] text-foreground/85">
                    Booking Inquiry
                  </DialogTitle>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground/55">
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
                        <CountrySelect
                          value={form.countryIso}
                          onChange={(iso) => update("countryIso", iso)}
                          disabled={isSubmitting}
                        />
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="9 1234 5678"
                          required
                          maxLength={20}
                          disabled={isSubmitting}
                          className={cn(inputClass, "flex-1 min-w-0")}
                        />
                      </div>
                    </Field>
                    <Field label="Preferred Contact" required>
                      <div className="flex h-11 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
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
                          "h-11 w-full appearance-none rounded-md border border-white/[0.08] bg-white/[0.03] px-3 pr-9 text-[13px] transition-colors duration-150 focus:border-accent/40 focus:outline-none",
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
                  <p className="text-[10px] leading-relaxed text-muted-foreground/28">
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

// ---------------------------------------------------------------------------
// SuccessScreen
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------
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
