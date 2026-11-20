"use client"
/* Full document navigation reads the latest locale cookie on the destination route. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import styles from "./home.module.css"
import { message, type Locale } from "@/lib/i18n/messages"
import LanguageSwitch from "./language-switch"

export default function MobileNav({ locale, onLocaleChange, productsHref = "#products", onAbout = false }: { locale: Locale; onLocaleChange: (locale: Locale) => void; productsHref?: string; onAbout?: boolean }) {
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <div className={styles.mobileNav}>
      <button ref={button} type="button" className={styles.menuButton} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t("closeMenu") : t("openMenu")} onClick={() => setOpen(!open)}>
        {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
      </button>
      <nav id="mobile-navigation" className={styles.mobilePanel} aria-label={t("mobileNavigation")} hidden={!open}>
        <a href={productsHref} onClick={() => setOpen(false)}>{t("products")}</a>
        <a href="/about" aria-current={onAbout ? "page" : undefined} onClick={() => setOpen(false)}>{t("about")}</a>
        <Link href="/login" className={styles.navAction} onClick={() => setOpen(false)}>{t("logIn")}</Link>
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
      </nav>
    </div>
  )
}
