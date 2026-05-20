import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Calendar,
  Download,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Play,
  Radio,
  Link2,
  Music,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import type { SocialLink, SocialPlatform } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type PublicProfilePageProps = {
  params: Promise<{
    handle: string
  }>
}

const socialIcons: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  beatport: Music2,
  spotify: Radio,
  soundcloud: Play,
  youtube: Youtube,
  tiktok: Music,
  website: Globe,
  other: Link2,
}

export function generateStaticParams() {
  return [{ handle: mockArtist.handle }]
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = handle.toLowerCase() === mockArtist.handle ? mockArtist : null

  if (!artist) {
    return {
      title: "Artist not found - DJHQ",
    }
  }

  return {
    metadataBase: new URL("https://djhq.com"),
    title: `${artist.artistName} - DJHQ`,
    description: artist.shortBio,
    openGraph: {
      title: `${artist.artistName} - DJHQ`,
      description: artist.shortBio,
      images: [
        {
          url: artist.heroImageUrl,
          alt: `${artist.artistName} press photo`,
        },
      ],
    },
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">{children}</h2>
}

function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card/80 px-4 py-3 transition-colors hover:border-accent/50 hover:bg-accent/5"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </span>
        <span className="font-semibold text-foreground">{link.label}</span>
      </span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  )
}

export default async function PublicArtistProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params
  const artist = handle.toLowerCase() === mockArtist.handle ? mockArtist : null

  if (!artist) {
    notFound()
  }

  const featuredRelease = artist.featuredRelease
  if (!featuredRelease) {
    notFound()
  }
  const upcomingGigs = artist.upcomingGigs.slice(0, 3)
  const photoPreview = artist.galleryImages.slice(0, 3)
  const featuredReleaseYear = new Date(featuredRelease.releaseDate).getUTCFullYear()
  const featuredReleaseDescription = artist.tagline ?? artist.shortBio

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
        <header className="mb-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
              <span className="text-sm font-bold text-accent-foreground">DJ</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
          </Link>
          <span className="rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] text-muted-foreground">
            @{artist.handle}
          </span>
        </header>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40">
          <div className="relative min-h-[540px] sm:min-h-[620px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.04]" />

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap gap-2">
                {artist.genres.map((genre) => (
                  <Badge key={genre} className="border-accent/20 bg-background/70 text-foreground backdrop-blur-sm">
                    {genre}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">{artist.artistName}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                {artist.location}
              </p>
              <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {artist.shortBio}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg" className="h-12 bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={`mailto:${artist.bookingInfo.email}`}>
                    <Mail className="h-4 w-4" />
                    Book this artist
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-border/70 bg-background/55 text-foreground backdrop-blur-sm hover:bg-secondary">
                  <a href={featuredRelease.platformUrl}>
                    <Play className="h-4 w-4" />
                    Listen now
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 space-y-4">
          <section className="rounded-3xl border border-border bg-background/70 p-4 backdrop-blur-sm">
            <SectionTitle>Music / Social Links</SectionTitle>
            <div className="mt-4 grid gap-3">
              {artist.socialLinks.map((link) => (
                <MainLink key={link.platform} link={link} />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Featured Release</SectionTitle>
            <div className="mt-4 flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                <Music2 className="h-7 w-7 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">{featuredRelease.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {featuredRelease.label} / {featuredReleaseYear}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {featuredReleaseDescription}
                </p>
                <Button asChild variant="outline" className="mt-4 w-full border-border text-foreground hover:bg-secondary sm:w-auto">
                  <a href={featuredRelease.platformUrl}>
                    Open release
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Upcoming Gigs</SectionTitle>
            <div className="mt-4 space-y-3">
              {upcomingGigs.map((gig) => (
                <div key={gig.id} className="flex gap-3 rounded-2xl bg-secondary/35 p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{gig.venue}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(gig.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} / {gig.city}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-widest text-accent">{gig.country}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Press Kit / Booking</SectionTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 bg-accent text-accent-foreground hover:bg-accent/90">
                <a href={artist.pressKit.downloadUrl}>
                  <Download className="h-4 w-4" />
                  Download press kit
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 border-border text-foreground hover:bg-secondary">
                <a href={`mailto:${artist.bookingInfo.email}`}>
                  <Mail className="h-4 w-4" />
                  Contact booking
                </a>
              </Button>
            </div>
            <a
              href={`mailto:${artist.bookingInfo.email}`}
              className="mt-4 block rounded-2xl bg-secondary/35 px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {artist.bookingInfo.email}
            </a>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Photo Preview</SectionTitle>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {photoPreview.map((photo) => (
                <div key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.altText}
                    fill
                    loading="eager"
                    sizes="(min-width: 768px) 220px, 33vw"
                    className={cn(
                      "object-cover",
                      photo.sortOrder === 1 ? "object-left" : photo.sortOrder === 2 ? "object-center" : "object-right",
                    )}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="py-8 text-center">
          <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Powered by DJHQ
          </Link>
        </footer>
      </div>
    </main>
  )
}
