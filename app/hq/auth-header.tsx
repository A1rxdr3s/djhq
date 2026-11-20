'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { message, type Locale } from '@/lib/i18n/messages'
import LocaleToggle from './locale-toggle'
import styles from '../home.module.css'

export type HeaderLink = { id: string; href: string; label: string }

// Authenticated counterpart of the public SiteHeader: same classes, tokens and selector.
// Links are computed on the server from the user's entitlements; this component never decides access.
export default function AuthHeader({ locale, links, current, email, labels }: {
  locale: Locale; links: HeaderLink[]; current?: string; email: string
  labels: { products: string; signOut: string }
}) {
  const t = (key: Parameters<typeof message>[1]) => message(locale, key)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    window.location.assign('/sign-in')
  }
  const items = [{ id: 'hub', href: '/hq', label: labels.products }, ...links]
  const nav = (onClick?: () => void) => items.map(l => <Link key={l.id} href={l.href} aria-current={current === l.id ? 'page' : undefined} onClick={onClick}>{l.label}</Link>)
  return <header className={`${styles.headerScope} ${styles.header}`}>
    <Link href="/hq" aria-label={t('home')} className={styles.brand}><Image src="/images/djhq/djhq-wordmark.svg" alt="" width={2048} height={430} className={styles.wordmark} priority unoptimized /></Link>
    <span className={styles.tagline}>{t('tagline')}</span>
    <nav className={styles.nav} aria-label={t('mainNavigation')}>
      {nav()}
      {email && <span className={styles.account} title={email}>{email}</span>}
      <button type="button" className={styles.navAction} onClick={signOut} disabled={busy}>{labels.signOut}</button>
    </nav>
    <LocaleToggle locale={locale} className={styles.desktopLanguage} />
    <div className={styles.mobileNav}>
      <button ref={button} type="button" className={styles.menuButton} aria-expanded={open} aria-controls="auth-mobile-navigation" aria-label={open ? t('closeMenu') : t('openMenu')} onClick={() => setOpen(o => !o)}>
        {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
      </button>
      <nav id="auth-mobile-navigation" className={styles.mobilePanel} aria-label={t('mobileNavigation')} hidden={!open}>
        {nav(() => setOpen(false))}
        {email && <span className={styles.accountMobile}>{email}</span>}
        <button type="button" className={styles.navAction} onClick={signOut} disabled={busy}>{labels.signOut}</button>
        <LocaleToggle locale={locale} />
      </nav>
    </div>
  </header>
}
