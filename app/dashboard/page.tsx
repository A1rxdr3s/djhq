"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, ExternalLink, Globe, Mail, Save } from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "links", label: "Links" },
  { id: "featured-release", label: "Featured Release" },
  { id: "gigs", label: "Gigs" },
  { id: "gallery", label: "Gallery" },
  { id: "booking", label: "Booking" },
  { id: "publish", label: "Publish" },
] as const

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="min-h-10 rounded-md border border-border bg-secondary/35 px-3 py-2 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("overview")
  const publicProfileUrl = `/${mockArtist.handle}`
  const completionItems = [
    "Core profile info",
    "Music and social links",
    "Featured release",
    "Upcoming gigs",
    "Gallery preview",
    "Booking and press kit",
  ]

  function renderOverview() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Private control panel preview for your public DJHQ profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Artist Name" value={mockArtist.artistName} />
          <ReadOnlyField label="Handle" value={`@${mockArtist.handle}`} />
          <ReadOnlyField label="Plan" value={mockArtist.plan.toUpperCase()} />
          <ReadOnlyField label="Public URL" value={publicProfileUrl} />
          <ReadOnlyField label="Publish Status" value={mockArtist.isPublished ? "Published" : "Draft"} />
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Completion Checklist</p>
            <div className="space-y-2 rounded-md border border-border bg-secondary/35 px-3 py-2">
              {completionItems.map((item) => (
                <p key={item} className="text-sm text-foreground">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderProfile() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Artist Name" value={mockArtist.artistName} />
          <ReadOnlyField label="Handle" value={mockArtist.handle} />
          <ReadOnlyField label="Genres" value={mockArtist.genres.join(", ")} />
          <ReadOnlyField label="Location" value={mockArtist.location} />
          <div className="md:col-span-2">
            <ReadOnlyField label="Short Bio" value={mockArtist.shortBio} />
          </div>
          <div className="md:col-span-2">
            <ReadOnlyField label="Hero Image URL" value={mockArtist.heroImageUrl} />
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderLinks() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockArtist.socialLinks.map((link) => (
            <div key={`${link.platform}-${link.url}`} className="grid gap-2 rounded-md border border-border bg-secondary/30 p-3 md:grid-cols-3">
              <ReadOnlyField label="Platform" value={link.platform} />
              <ReadOnlyField label="Label" value={link.label} />
              <ReadOnlyField label="URL" value={link.url} />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  function renderFeaturedRelease() {
    if (!mockArtist.featuredRelease) {
      return null
    }

    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Featured Release</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Title" value={mockArtist.featuredRelease.title} />
          <ReadOnlyField label="Label" value={mockArtist.featuredRelease.label} />
          <ReadOnlyField label="Release Date" value={new Date(mockArtist.featuredRelease.releaseDate).toLocaleDateString("en-US")} />
          <ReadOnlyField label="Type" value={mockArtist.featuredRelease.type} />
          <div className="md:col-span-2">
            <ReadOnlyField label="Platform URL" value={mockArtist.featuredRelease.platformUrl} />
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderGigs() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Gigs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockArtist.upcomingGigs.map((gig) => (
            <div key={gig.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">{gig.venue}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <ReadOnlyField label="Date" value={new Date(gig.date).toLocaleDateString("en-US")} />
                <ReadOnlyField label="City" value={gig.city} />
                <ReadOnlyField label="Country" value={gig.country} />
              </div>
              {gig.ticketUrl && (
                <div className="mt-2">
                  <ReadOnlyField label="Ticket URL" value={gig.ticketUrl} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  function renderGallery() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {mockArtist.galleryImages.map((image) => (
              <div key={image.id} className="space-y-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-secondary/40">
                  <Image src={image.imageUrl} alt={image.altText} fill sizes="200px" className="object-cover" />
                </div>
                <p className="truncate text-xs text-muted-foreground">{image.altText}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderBooking() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <ReadOnlyField label="Booking Email" value={mockArtist.bookingInfo.email} />
            <ReadOnlyField label="Booking URL" value={mockArtist.bookingInfo.bookingUrl ?? "Not set"} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ReadOnlyField label="Press Kit Enabled" value={mockArtist.pressKit.enabled ? "Yes" : "No"} />
            <ReadOnlyField label="Press Kit URL" value={mockArtist.pressKit.downloadUrl} />
          </div>
          <ReadOnlyField label="Assets Included" value={mockArtist.pressKit.assetsIncluded.join(", ")} />
        </CardContent>
      </Card>
    )
  }

  function renderPublish() {
    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={mockArtist.isPublished ? "default" : "secondary"}>
              {mockArtist.isPublished ? "Published" : "Draft"}
            </Badge>
            <span className="text-sm text-muted-foreground">{publicProfileUrl}</span>
          </div>
          <div className="rounded-md border border-border bg-secondary/35 p-3 text-sm text-muted-foreground">
            Publishing controls will be connected once authentication and database storage are added.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            Profile visibility is currently read-only in this MVP dashboard.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            Save and publish actions are mock-only for now.
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "overview":
        return renderOverview()
      case "profile":
        return renderProfile()
      case "links":
        return renderLinks()
      case "featured-release":
        return renderFeaturedRelease()
      case "gigs":
        return renderGigs()
      case "gallery":
        return renderGallery()
      case "booking":
        return renderBooking()
      case "publish":
        return renderPublish()
      default:
        return renderOverview()
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
                <span className="text-sm font-bold text-accent-foreground">DJ</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <p className="text-sm font-semibold text-foreground">Dashboard</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={mockArtist.isPublished ? "default" : "secondary"}>
              {mockArtist.isPublished ? "Published" : "Draft"}
            </Badge>
            <Button asChild variant="outline" size="sm" className="border-border bg-background/70">
              <Link href={publicProfileUrl}>
                <ExternalLink className="h-4 w-4" />
                View profile
              </Link>
            </Button>
            <Button size="sm" disabled className="bg-accent text-accent-foreground">
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="h-fit border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full rounded-md border border-border/50 bg-secondary/25 px-3 py-2 text-left text-sm text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">{renderActiveSection()}</div>
        </div>
      </div>
    </main>
  )
}
