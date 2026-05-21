"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, ExternalLink, Globe, Mail, Save } from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

type FeaturedReleaseFormState = {
  title: string
  label: string
  releaseDate: string
  type: string
  platformUrl: string
  artworkUrl: string
}

type GigFormState = {
  id: string
  venue: string
  date: string
  city: string
  country: string
  ticketUrl?: string
}

export default function DashboardPage() {
  const initialSocialLinks: Array<{ platform: string; label: string; url: string }> = mockArtist.socialLinks.map((link) => ({
    platform: link.platform,
    label: link.label,
    url: link.url,
  }))
  const initialFeaturedRelease: FeaturedReleaseFormState | null = mockArtist.featuredRelease
    ? {
        title: mockArtist.featuredRelease.title,
        label: mockArtist.featuredRelease.label,
        releaseDate: mockArtist.featuredRelease.releaseDate,
        type: mockArtist.featuredRelease.type,
        platformUrl: mockArtist.featuredRelease.platformUrl,
        artworkUrl: mockArtist.featuredRelease.artworkUrl,
      }
    : null
  const initialUpcomingGigs: GigFormState[] = mockArtist.upcomingGigs.map((gig) => ({
    id: gig.id,
    venue: gig.venue,
    date: gig.date,
    city: gig.city,
    country: gig.country,
    ticketUrl: gig.ticketUrl,
  }))
  const [activeSection, setActiveSection] = useState("overview")
  const [artistName, setArtistName] = useState(mockArtist.artistName)
  const [handle, setHandle] = useState(mockArtist.handle)
  const [genres, setGenres] = useState(mockArtist.genres.join(", "))
  const [location, setLocation] = useState(mockArtist.location)
  const [shortBio, setShortBio] = useState(mockArtist.shortBio)
  const [heroImageUrl, setHeroImageUrl] = useState(mockArtist.heroImageUrl)
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks)
  const [featuredRelease, setFeaturedRelease] = useState(initialFeaturedRelease)
  const [upcomingGigs, setUpcomingGigs] = useState(initialUpcomingGigs)
  const [saveMessage, setSaveMessage] = useState("")
  const publicProfileUrl = `/${mockArtist.handle}`
  const isProfileDirty =
    artistName !== mockArtist.artistName ||
    handle !== mockArtist.handle ||
    genres !== mockArtist.genres.join(", ") ||
    location !== mockArtist.location ||
    shortBio !== mockArtist.shortBio ||
    heroImageUrl !== mockArtist.heroImageUrl
  const isLinksDirty = JSON.stringify(socialLinks) !== JSON.stringify(initialSocialLinks)
  const isFeaturedReleaseDirty = JSON.stringify(featuredRelease) !== JSON.stringify(initialFeaturedRelease)
  const isGigsDirty = JSON.stringify(upcomingGigs) !== JSON.stringify(initialUpcomingGigs)
  const isSaveDirty = isProfileDirty || isLinksDirty || isFeaturedReleaseDirty || isGigsDirty
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
          <div className="space-y-1.5">
            <label htmlFor="artistName" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Artist Name
            </label>
            <Input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="handle" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Handle
            </label>
            <Input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="genres" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Genres
            </label>
            <Input id="genres" value={genres} onChange={(event) => setGenres(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="location" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Location
            </label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="shortBio" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Short Bio
              </label>
              <Textarea id="shortBio" value={shortBio} onChange={(event) => setShortBio(event.target.value)} />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label
                htmlFor="heroImageUrl"
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
              >
                Hero Image URL
              </label>
              <Input id="heroImageUrl" value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} />
            </div>
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
          {socialLinks.map((link, index) => (
            <div key={`${link.platform}-${index}`} className="grid gap-2 rounded-md border border-border bg-secondary/30 p-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor={`link-platform-${index}`}
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Platform
                </label>
                <Input
                  id={`link-platform-${index}`}
                  value={link.platform}
                  onChange={(event) =>
                    setSocialLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, platform: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`link-label-${index}`}
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Label
                </label>
                <Input
                  id={`link-label-${index}`}
                  value={link.label}
                  onChange={(event) =>
                    setSocialLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`link-url-${index}`}
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  URL
                </label>
                <Input
                  id={`link-url-${index}`}
                  value={link.url}
                  onChange={(event) =>
                    setSocialLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, url: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  function renderFeaturedRelease() {
    if (!featuredRelease) {
      return null
    }

    return (
      <Card className="border-border bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Featured Release</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="releaseTitle" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Title
            </label>
            <Input
              id="releaseTitle"
              value={featuredRelease.title}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, title: event.target.value } : current))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="releaseLabel" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Label
            </label>
            <Input
              id="releaseLabel"
              value={featuredRelease.label}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, label: event.target.value } : current))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="releaseDate" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Release Date
            </label>
            <Input
              id="releaseDate"
              type="date"
              value={featuredRelease.releaseDate}
              onChange={(event) =>
                setFeaturedRelease((current) => (current ? { ...current, releaseDate: event.target.value } : current))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="releaseType" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Type
            </label>
            <Input
              id="releaseType"
              value={featuredRelease.type}
              onChange={(event) => setFeaturedRelease((current) => (current ? { ...current, type: event.target.value } : current))}
            />
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="releasePlatformUrl" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Platform URL
              </label>
              <Input
                id="releasePlatformUrl"
                value={featuredRelease.platformUrl}
                onChange={(event) =>
                  setFeaturedRelease((current) => (current ? { ...current, platformUrl: event.target.value } : current))
                }
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="releaseArtworkUrl" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Artwork URL
              </label>
              <Input
                id="releaseArtworkUrl"
                value={featuredRelease.artworkUrl}
                onChange={(event) =>
                  setFeaturedRelease((current) => (current ? { ...current, artworkUrl: event.target.value } : current))
                }
              />
            </div>
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
          {upcomingGigs.map((gig, index) => (
            <div key={gig.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <Input
                  id={`gig-venue-${index}`}
                  value={gig.venue}
                  onChange={(event) =>
                    setUpcomingGigs((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, venue: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor={`gig-date-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Date
                  </label>
                  <Input
                    id={`gig-date-${index}`}
                    type="date"
                    value={gig.date}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, date: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`gig-city-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    City
                  </label>
                  <Input
                    id={`gig-city-${index}`}
                    value={gig.city}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, city: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`gig-country-${index}`}
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    Country
                  </label>
                  <Input
                    id={`gig-country-${index}`}
                    value={gig.country}
                    onChange={(event) =>
                      setUpcomingGigs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, country: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                <label htmlFor={`gig-ticket-${index}`} className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Ticket URL
                </label>
                <Input
                  id={`gig-ticket-${index}`}
                  value={gig.ticketUrl ?? ""}
                  onChange={(event) =>
                    setUpcomingGigs((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ticketUrl: event.target.value || undefined } : item,
                      ),
                    )
                  }
                />
              </div>
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
            <Button
              size="sm"
              disabled={!isSaveDirty}
              onClick={() => setSaveMessage("Changes are saved locally only in this prototype.")}
              className="bg-accent text-accent-foreground"
            >
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
          {saveMessage ? <p className="text-xs text-muted-foreground">{saveMessage}</p> : null}
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
