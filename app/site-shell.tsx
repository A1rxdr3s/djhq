"use client"
/* Full document navigation reads the latest locale cookie on the destination route. */
/* eslint-disable @next/next/no-html-link-for-pages */

import Image from "next/image"
import Link from "next/link"
import { message, type Locale } from "@/lib/i18n/messages"
import LanguageSwitch from "./language-switch"
import MobileNav from "./mobile-nav"
import styles from "./home.module.css"

function Wordmark() {
  return <Image src="/images/djhq/djhq-wordmark.svg" alt="" width={2048} height={430} className={styles.wordmark} unoptimized />
}

export function SiteHeader({ locale, onLocaleChange, onAbout = false, subpage = false }: { locale: Locale; onLocaleChange: (locale: Locale) => void; onAbout?: boolean; subpage?: boolean }) {
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  const productsHref = onAbout || subpage ? "/#products" : "#products"
  return <header className={styles.header}>
    <a href="/" aria-label={t("home")} className={styles.brand}><Wordmark /></a>
    <span className={styles.tagline}>{t("tagline")}</span>
    <nav className={styles.nav} aria-label={t("mainNavigation")}>
      <a href={productsHref}>{t("products")}</a>
      <a href="/about" aria-current={onAbout ? "page" : undefined}>{t("about")}</a>
      <Link href="/login" className={styles.navAction}>{t("logIn")}</Link>
    </nav>
    <LanguageSwitch locale={locale} onChange={onLocaleChange} className={styles.desktopLanguage} />
    <MobileNav locale={locale} onLocaleChange={onLocaleChange} productsHref={productsHref} onAbout={onAbout} />
  </header>
}

export function SiteFooter({ locale, onAbout = false, subpage = false }: { locale: Locale; onAbout?: boolean; subpage?: boolean }) {
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  return <footer className={styles.footer}>
    <div className={styles.footerIdentity}><a href="/" aria-label={t("home")}><Wordmark /></a><span className={styles.footerTagline}>{t("tagline")}</span></div>
    <nav className={styles.footerNav} aria-label={t("footerNavigation")}><a href={onAbout || subpage ? "/#products" : "#products"}>{t("products")}</a><a href="/about" aria-current={onAbout ? "page" : undefined}>{t("about")}</a><Link href="/set2go">Set2Go</Link></nav>
    <p className={styles.copyright}>{t("copyright")}</p>
  </footer>
}
