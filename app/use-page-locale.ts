"use client"

import { useEffect, useState } from "react"
import { message, type Locale, type MessageKey } from "@/lib/i18n/messages"
import { localeCookie } from "@/lib/i18n/locale"

export function usePageLocale(initialLocale: Locale, titleKey: MessageKey, descriptionKey: MessageKey) {
  const [locale, setLocale] = useState(initialLocale)
  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = locale
    document.title = message(locale, titleKey)
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = message(locale, descriptionKey)
    return () => { document.documentElement.lang = previous }
  }, [locale, titleKey, descriptionKey])
  function changeLocale(next: Locale) {
    document.cookie = localeCookie(next)
    setLocale(next)
  }
  return { locale, changeLocale }
}
