import type { Locale } from './messages'

export const LOCALE_COOKIE = 'djhq_locale'
export function resolveLocale(preference: string | undefined, acceptLanguage: string | null): Locale {
  if (preference === 'en' || preference === 'es') return preference
  const candidates = (acceptLanguage ?? '').split(',').map((part, index) => {
    const [tag, ...parameters] = part.trim().toLowerCase().split(';')
    const quality = parameters.find(value => value.trim().startsWith('q='))?.trim().slice(2)
    const q = quality === undefined ? 1 : Number(quality)
    return { tag, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index }
  }).filter(item => item.q > 0).sort((a, b) => b.q - a.q || a.index - b.index)
  for (const { tag } of candidates) {
    if (tag === 'en' || tag.startsWith('en-')) return 'en'
    if (tag === 'es' || tag.startsWith('es-')) return 'es'
  }
  return 'en'
}
export function localeCookie(locale: Locale, secure = typeof location !== 'undefined' && location.protocol === 'https:'): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`
}
