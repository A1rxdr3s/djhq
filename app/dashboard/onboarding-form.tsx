"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type OnboardingFormProps = {
  defaultBookingEmail: string
}

export default function OnboardingForm({ defaultBookingEmail }: OnboardingFormProps) {
  const router = useRouter()
  const [artistName, setArtistName] = useState("")
  const [handle, setHandle] = useState("")
  const [genres, setGenres] = useState("")
  const [location, setLocation] = useState("")
  const [shortBio, setShortBio] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/artists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistName,
          handle,
          genres: genres
            .split(",")
            .map((genre) => genre.trim())
            .filter(Boolean),
          location,
          shortBio,
          bookingEmail: defaultBookingEmail,
        }),
      })

      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? "Unable to create profile.")
      }

      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create profile.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-accent">
            <span className="text-sm font-bold text-accent-foreground">DJ</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">DJHQ</span>
        </Link>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Create your DJHQ profile</CardTitle>
            <CardDescription>Create your first DJHQ artist profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="artistName" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Artist Name
                  </label>
                  <Input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="handle" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Handle
                  </label>
                  <Input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="genres" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Genres
                </label>
                <Input
                  id="genres"
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  placeholder="House, Techno, Melodic"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="location" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Location
                </label>
                <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="shortBio" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Short Bio
                </label>
                <Textarea id="shortBio" value={shortBio} onChange={(event) => setShortBio(event.target.value)} required />
              </div>

              <Button type="submit" disabled={isCreating} className="h-11 w-full bg-accent text-accent-foreground">
                {isCreating ? "Creating..." : "Create profile"}
              </Button>
            </form>

            {errorMessage ? <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
