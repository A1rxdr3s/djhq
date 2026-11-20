"use client"

import { SiteHeader, SiteFooter } from './site-shell'
import Image from 'next/image'
import { Mail } from 'lucide-react'
import { usePageLocale } from './use-page-locale'
import { message, type Locale } from '@/lib/i18n/messages'
import styles from './account-shell.module.css'
import shared from './home.module.css'

export default function AccountShell({ initialLocale, email, mode }: { initialLocale: Locale; email?: string | null; mode: 'login' | 'account' }) {
  const { locale, changeLocale } = usePageLocale(initialLocale, mode === 'login' ? 'loginTitle' : 'accountTitle', mode === 'login' ? 'loginDescription' : 'accountDescription')
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  return <div className={`${shared.home} ${styles.page}`} lang={locale}>
    <SiteHeader locale={locale} onLocaleChange={changeLocale} subpage />
    <main className={styles.main}>
      {mode === 'login' ? <section className={`${styles.content} ${styles.login}`} aria-labelledby="login-heading">
        <h1 id="login-heading">{t('loginTitle')}</h1>
        <p>{t('loginDescription')}</p>
        <p className={styles.notice}>{t('loginPreview')}</p>
        <div className={styles.actions}>
          <button type="button" disabled><Image className={styles.googleIcon} src="/images/djhq/google-g.png" alt="" width={200} height={204} unoptimized />{t('loginGoogle')}</button>
          <div className={styles.separator}><span>{t('loginOr')}</span></div>
          <label htmlFor="login-email">{t('loginEmail')}</label>
          <input id="login-email" type="email" autoComplete="email" placeholder={t('loginPlaceholder')} disabled />
          <button type="button" disabled><Mail size={18} aria-hidden="true" />{t('loginCode')}</button>
        </div>
        <p className={styles.invitation}>{t('loginInvitation')}</p>
      </section> : <section className={styles.content} aria-labelledby="account-heading">
        <h1 id="account-heading">{t('accountTitle')}</h1>
        <p>{t('accountDescription')}</p>
        <div className={styles.details}><h2>{t('accountEmail')}</h2><p>{email || t('accountNoEmail')}</p><h2>{t('accountProducts')}</h2><p>{t('accountAccess')}</p></div>
      </section>}
    </main>
    <SiteFooter locale={locale} subpage />
  </div>
}
