"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Layers3 } from "lucide-react"
import styles from "./home.module.css"
import { SiteHeader, SiteFooter } from "./site-shell"
import { message, type Locale } from "@/lib/i18n/messages"
import { usePageLocale } from "./use-page-locale"

export default function HomeClient({ initialLocale }: { initialLocale: Locale }) {
  const { locale, changeLocale } = usePageLocale(initialLocale, "metaTitle", "metaDescription")
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  return (
    <div className={styles.home} lang={locale}>
      <SiteHeader locale={locale} onLocaleChange={changeLocale} />

      <main>
        <section id="about" className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}> {t("create")} <span>•</span> {t("organize")} <span>•</span> {t("perform")}</p>
            <h1 id="hero-title"> {t("heroFirst")}<br />{t("heroSecond")}<span className={styles.orange}>.</span></h1>
            <p className={styles.heroDescription}> {t("heroDescription")}</p>
            <a className={styles.primaryAction} href="#products"> {t("exploreTools")} <ArrowRight size={20} aria-hidden="true" /></a>
          </div>
          <div className={styles.heroSpace} aria-hidden="true">
            <Image src="/images/djhq/djhq-hero.webp" alt="" fill sizes="(max-width: 600px) 100vw, 70vw" className={styles.heroImage} preload unoptimized />
          </div>
        </section>

        <section id="products" className={styles.products} aria-label={t("productArea")}>
          <div className={styles.featured}>
            <div className={styles.productCopy}>
              <p className={styles.eyebrow}> {t("featured")}</p>
              <h2 className={styles.productTitle}><Image src="/images/set2go/set2go-wordmark-dark.svg" alt="Set2Go" width={1205} height={300} className={styles.productWordmark} unoptimized /></h2>
              <p className={styles.productDescription}> {t("productDescription")}</p>
              <Link href="/set2go" className={styles.productLink}> {t("discover")} <ArrowRight size={22} aria-hidden="true" /></Link>
            </div>
            <div className={styles.previewSpace}>
              <Image src="/images/djhq/set2go-preview.webp" alt={t("previewAlt")} width={1672} height={941} loading="lazy" decoding="async" className={styles.previewImage} unoptimized />
            </div>
          </div>
          <div className={styles.upcoming}>
            <p className={styles.smallLabel}> {t("more")}</p>
            <Layers3 className={styles.layers} size={52} strokeWidth={1.2} aria-hidden="true" />
            <div className={styles.upcomingHeading}><h2>{t("artistWebsites")}</h2><span>{t("comingSoon")}</span></div>
            <p> {t("artistDescription")}</p>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
