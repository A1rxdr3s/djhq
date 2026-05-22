"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSending(true)
    setMessage("")
    setErrorMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setMessage("Magic link sent. Check your email to continue.")
    }

    setIsSending(false)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-accent">
            <span className="text-sm font-bold text-accent-foreground">DJ</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">DJHQ</span>
        </Link>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your DJHQ dashboard with a secure email magic link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Button type="submit" disabled={isSending} className="h-11 w-full bg-accent text-accent-foreground">
                <Mail className="h-4 w-4" />
                {isSending ? "Sending..." : "Send magic link"}
              </Button>
            </form>

            {message ? <p className="mt-4 rounded-md bg-secondary/35 p-3 text-sm text-foreground">{message}</p> : null}
            {errorMessage ? <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
