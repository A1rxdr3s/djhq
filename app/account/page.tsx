import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/locale'
import AccountShell from '../account-shell'

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))
  return <AccountShell initialLocale={locale} mode="account" email={user.email} />
}
