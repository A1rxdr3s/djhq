"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Layers3 } from "lucide-react"
import { message, type Locale } from "@/lib/i18n/messages"
import { SiteHeader, SiteFooter } from "../site-shell"
import { usePageLocale } from "../use-page-locale"
import shared from "../home.module.css"
import styles from "./about.module.css"

export default function AboutClient({ initialLocale }: { initialLocale: Locale }) {
  const { locale, changeLocale } = usePageLocale(initialLocale, "aboutMetaTitle", "aboutMetaDescription")
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  return <div className={shared.home} lang={locale}>
    <SiteHeader locale={locale} onLocaleChange={changeLocale} onAbout />
    <main>
      <section className={styles.hero} aria-labelledby="purpose-heading">
        <div className={styles.heroImage} aria-hidden="true"><Image src="/images/djhq/djhq-hero.png" alt="" fill sizes="100vw" className={styles.photo} unoptimized /></div>
        <div className={styles.heroCopy}><p className={styles.label}>{t("purposeLabel")}</p><h1 id="purpose-heading">{t("purposeHeading")}</h1><p>{t("purposeText")}</p></div>
      </section>
      <section className={styles.editorial} aria-labelledby="why-heading"><p className={styles.label}>{t("whyLabel")}</p><div><h2 id="why-heading">{t("whyHeading")}</h2><p className={styles.body}>{t("whyText")}</p></div></section>
      <section className={styles.founder} aria-labelledby="founder-heading">
        <div className={styles.founderCopy}><p className={styles.label}>{t("founderLabel")}</p><h2 id="founder-heading">{t("founderHeading")}</h2><p className={styles.founderName}>ANDRES:HERRERA</p><p className={styles.role}>{t("founderRole")}</p><p className={styles.body}>{t("founderText")}</p><a className={styles.textLink} href="https://andresherrera.music">{t("founderLink")} <ArrowUpRight size={18} aria-hidden="true" /></a></div>
        <div className={styles.founderPhoto}><Image src="/images/djhq/djhq-founder-andres-herrera.jpg" alt={t("founderPhotoAlt")} fill sizes="(max-width: 700px) 90vw, 68vw" className={styles.founderImage} unoptimized /></div>
      </section>
      <section className={styles.productSection} aria-labelledby="products-heading"><p className={styles.label}>{t("aboutProductsLabel")}</p><h2 id="products-heading">{t("aboutProductsHeading")}</h2><div className={styles.productGrid}>
        <article><h3><Image src="/images/set2go/set2go-wordmark-dark.svg" alt="Set2Go" width={1205} height={300} className={styles.productLogo} unoptimized /></h3><p className={styles.body}>{t("aboutSet2go")}</p><Link href="/set2go" className={styles.textLink}>{t("discover")} <ArrowRight size={19} aria-hidden="true" /></Link></article>
        <article><Layers3 size={42} strokeWidth={1.2} aria-hidden="true" /><div className={styles.productHeading}><h3>{t("artistWebsites")}</h3><span>{t("comingSoon")}</span></div><p className={styles.body}>{t("artistDescription")}</p></article>
      </div></section>
    </main>
    <SiteFooter locale={locale} onAbout />
  </div>
}
