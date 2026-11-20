import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/locale'
import AccountShell from '../account-shell'

export default async function LoginPage() {
  if (process.env.NODE_ENV === 'development') redirect('/sign-in')
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))
  return <AccountShell initialLocale={locale} mode="login" />
}
