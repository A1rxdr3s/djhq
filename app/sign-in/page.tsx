import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { sanitizeNextDestination } from '@/lib/auth/login-redirect'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/locale'
import { message } from '@/lib/i18n/messages'
import SignInClient from './sign-in-client'

type SignInPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: message(locale, 'signInMetaTitle'), description: message(locale, 'signInDescription') }
}

export default async function SignInPage(props: SignInPageProps) {
  const [locale, searchParams] = await Promise.all([
    getLocale(),
    props.searchParams ? props.searchParams : Promise.resolve(undefined),
  ])
  const safeNext = sanitizeNextDestination(searchParams?.next)
  return <SignInClient initialLocale={locale} initialNext={safeNext} />
}
