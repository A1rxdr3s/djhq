"use client"

import type { Locale } from "@/lib/i18n/messages"
import { message } from "@/lib/i18n/messages"
import styles from "./home.module.css"

export default function LanguageSwitch({ locale, onChange, className = "" }: { locale: Locale; onChange: (locale: Locale) => void; className?: string }) {
  return <div className={`${styles.languageSwitch} ${className}`} role="group" aria-label={message(locale, "language")}>
    <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale === "en"} onClick={() => onChange("en")}>EN</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="es" aria-label="Cambiar a español" aria-pressed={locale === "es"} onClick={() => onChange("es")}>ES</button>
  </div>
}
