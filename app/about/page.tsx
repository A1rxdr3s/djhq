import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/locale"
import { message } from "@/lib/i18n/messages"
import AboutClient from "./about-client"

async function getLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get("accept-language"))
}
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: message(locale, "aboutMetaTitle"), description: message(locale, "aboutMetaDescription") }
}
export default async function About() {
  return <AboutClient initialLocale={await getLocale()} />
}
