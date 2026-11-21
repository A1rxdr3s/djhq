import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/locale'
import { accessForUser, getAuthenticatedUser } from '@/lib/products/server'
import Set2GoClient from './set2go-client'

export default async function Set2GoPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/sign-in')
  if (!accessForUser(user, false).set2go) notFound()
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  let cloudEnabled = false
  const origin = process.env.SET2GO_DEV_CLOUD_ORIGIN
  let validOrigin = false
  try {
    const parsed = new URL(origin ?? '')
    const isLocal = parsed.origin === origin && parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    const isProdTesting = process.env.SET2GO_PRIVATE_TESTING === 'enabled' && parsed.origin === origin && parsed.protocol === 'https:' && parsed.hostname === 'djhq.app'
    validOrigin = process.env.NODE_ENV === 'development' ? (isLocal || isProdTesting) : isProdTesting
  } catch { /* Keep the cloud feature hidden when origin config is invalid. */ }
  const storageConfigured = !!process.env.R2_ACCOUNT_ID && /^[a-f0-9]{32}$/i.test(process.env.R2_ACCOUNT_ID) && !!process.env.R2_PRIVATE_BUCKET && !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_SECRET_ACCESS_KEY
  const devUploadEnabled = process.env.SET2GO_DEV_CLOUD_UPLOAD === 'enabled'
  const uploadModeValid = process.env.SET2GO_UPLOAD_MODE === 'r2-development' || (process.env.SET2GO_PRIVATE_TESTING === 'enabled' && process.env.SET2GO_UPLOAD_MODE === 'r2-private-testing')
  const envAllowed = process.env.NODE_ENV === 'development' || process.env.SET2GO_PRIVATE_TESTING === 'enabled'
  if (envAllowed && devUploadEnabled && uploadModeValid && validOrigin && storageConfigured) {
    cloudEnabled = user.id === process.env.SET2GO_DEV_CLOUD_USER_ID
  }
  return <Set2GoClient cloudEnabled={cloudEnabled} initialLocale={resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))} />
}
