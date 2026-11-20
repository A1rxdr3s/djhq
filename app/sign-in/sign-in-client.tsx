"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import { Mail } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { message as copy, type Locale, type MessageKey } from "@/lib/i18n/messages"
import { SiteHeader, SiteFooter } from "../site-shell"
import { usePageLocale } from "../use-page-locale"
import styles from "../account-shell.module.css"
import shared from "../home.module.css"

export default function SignInClient({ initialLocale }: { initialLocale: Locale }) {
  const { locale, changeLocale } = usePageLocale(initialLocale, "signInMetaTitle", "signInDescription")
  const t = (key: MessageKey) => copy(locale, key)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setMessage("")
    setErrorMessage("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMessage(t("signInGenericError"))
      setIsGoogleLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSending(true)
    setMessage("")
    setErrorMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/hq`,
      },
    })

    if (error) {
      setErrorMessage(t("signInGenericError"))
    } else {
      setMessage(t("signInSent"))
    }

    setIsSending(false)
  }

  return (
    <div className={`${shared.home} ${styles.page}`} lang={locale}>
      <SiteHeader locale={locale} onLocaleChange={changeLocale} subpage />
      <main className={styles.main}>
        <section className={`${styles.content} ${styles.login} ${styles.signin}`} aria-labelledby="sign-in-heading">
          <h1 id="sign-in-heading">{t("signInTitle")}</h1>
          <p>{t("signInDescription")}</p>
          <div className={`${styles.actions} ${styles.live}`}>
            <button type="button" disabled={isGoogleLoading || isSending} onClick={handleGoogleSignIn}>
              <Image className={styles.googleIcon} src="/images/djhq/google-g.png" alt="" width={200} height={204} unoptimized />
              {isGoogleLoading ? t("signInRedirecting") : t("loginGoogle")}
            </button>
            <div className={styles.separator}><span>{t("signInOrEmail")}</span></div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label htmlFor="email">{t("loginEmail")}</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("loginPlaceholder")} required />
              <button type="submit" disabled={isSending || isGoogleLoading}><Mail size={18} aria-hidden="true" />{isSending ? t("signInSending") : t("signInMagicLink")}</button>
            </form>
          </div>
          <div aria-live="polite">
            {message ? <p className={styles.status}>{message}</p> : null}
            {errorMessage ? <p className={`${styles.status} ${styles.error}`} role="alert">{errorMessage}</p> : null}
          </div>
          <p className={styles.invitation}>{t("loginInvitation")}</p>
        </section>
      </main>
      <SiteFooter locale={locale} subpage />
    </div>
  )
}
