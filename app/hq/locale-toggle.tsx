'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { localeCookie } from '@/lib/i18n/locale'
import type { Locale } from '@/lib/i18n/messages'
import LanguageSwitch from '../language-switch'

// Server-rendered surfaces: same selector as the public Home, applied via a server refresh.
export default function LocaleToggle({ locale, className = '' }: { locale: Locale; label?: string; className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [chosen, setChosen] = useState<Locale | null>(null)
  const shown = pending && chosen ? chosen : locale
  function change(next: Locale) {
    if (next === shown) return
    document.cookie = localeCookie(next)
    setChosen(next)
    startTransition(() => router.refresh())
  }
  return <LanguageSwitch locale={shown} onChange={change} className={className} />
}
