import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Play,
  Radio,
  Ticket,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { artists, getArtistByHandle, type ArtistProfile, type SocialPlatform } from "@/data/artists"
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
}

export function generateStaticParams() {
  return artists.map((artist) => ({
    handle: artist.handle,
  }))
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = getArtistByHandle(handle)

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
          url: artist.heroImage,
          alt: `${artist.artistName} press photo`,
        },
      ],
    },
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}

function SocialLink({ link }: { link: ArtistProfile["socialLinks"][number] }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for DJ profile`}
      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/50 hover:bg-accent/5"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </span>
        <span className="text-sm font-semibold text-foreground">{link.label}</span>
      </span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  )
}

export default async function PublicArtistProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params
  const artist = getArtistByHandle(handle)

  if (!artist) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-accent/[0.05] blur-[150px]" />
        <div className="absolute right-0 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/[0.035] blur-[140px]" />
      </div>

      <header className="absolute left-0 right-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
              <span className="text-sm font-bold text-accent-foreground">DJ</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">DJHQ</span>
          </Link>
          <Button asChild variant="outline" size="sm" className="border-border/70 bg-background/50 text-foreground backdrop-blur-sm hover:bg-secondary">
            <a href={`mailto:${artist.bookingEmail}`}>
              <Mail className="h-4 w-4" />
              Book
            </a>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="relative min-h-[760px]">
          <Image
            src={artist.heroImage}
            alt={`${artist.artistName} performing behind the decks`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.04]" />

          <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-end px-4 pb-12 pt-28 sm:px-6 lg:px-8">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
              <div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {artist.genres.map((genre) => (
                    <Badge key={genre} className="border-accent/20 bg-background/70 text-foreground backdrop-blur-sm">
                      {genre}
                    </Badge>
                  ))}
                </div>
                <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-accent" />
                  {artist.location}
                </p>
                <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
                  {artist.artistName}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {artist.shortBio}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href={`mailto:${artist.bookingEmail}`}>
                      <Mail className="h-4 w-4" />
                      Book this artist
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/70 bg-background/50 text-foreground backdrop-blur-sm hover:bg-secondary">
                    <a href={artist.featuredRelease.url}>
                      <Play className="h-4 w-4" />
                      Listen now
                    </a>
                  </Button>
                </div>
              </div>

              <aside className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Featured Release</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{artist.featuredRelease.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {artist.featuredRelease.label} / {artist.featuredRelease.year}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{artist.featuredRelease.description}</p>
                <Button asChild className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={artist.featuredRelease.url}>
                    <Music2 className="h-4 w-4" />
                    Open release
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <SectionHeading
              eyebrow="About"
              title="A complete artist identity in one place"
              description="The essentials are organized for fans, promoters, and bookers without making them search through scattered links."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {artist.socialLinks.map((link) => (
                <SocialLink key={link.platform} link={link} />
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Booking</p>
                <h2 className="mt-2 text-xl font-bold text-foreground">Press kit ready</h2>
              </div>
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-6 space-y-3">
              {["Short artist bio", "Press photos", "Release highlights", "Upcoming gigs", "Booking contact"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <Button asChild className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={artist.pressKitUrl}>
                <Download className="h-4 w-4" />
                Request press kit
              </a>
            </Button>
            <Button asChild variant="outline" className="mt-3 w-full border-border text-foreground hover:bg-secondary">
              <a href={`mailto:${artist.bookingEmail}`}>
                <Mail className="h-4 w-4" />
                {artist.bookingEmail}
              </a>
            </Button>
          </aside>
        </section>

        <section className="mt-20">
          <SectionHeading eyebrow="Latest Releases" title="Recent music" />
          <div className="grid gap-4 md:grid-cols-3">
            {artist.latestReleases.map((release) => (
              <a
                key={release.id}
                href={release.url}
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                  <Music2 className="h-6 w-6 text-accent" />
                </div>
                <div className="mt-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{release.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {release.label} / {release.year}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {release.type}
                  </Badge>
                </div>
                <p className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                  Listen
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Upcoming Gigs" title="Where to catch the next set" />
            <div className="space-y-3">
              {artist.upcomingGigs.map((gig) => (
                <div key={gig.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-center">
                    <Calendar className="mb-1 h-4 w-4 text-accent" />
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{gig.date.split(" ")[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{gig.venue}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{gig.city}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-widest text-accent">{gig.billing}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading eyebrow="DJ Sets" title="Recent mixes" />
            <div className="space-y-3">
              {artist.djSets.map((set) => (
                <a
                  key={set.id}
                  href={set.url}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/50"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Play className="h-5 w-5 text-accent" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{set.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {set.platform} / {set.duration}
                      </span>
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <SectionHeading eyebrow="Gallery" title="Press photos" />
          <div className="grid gap-4 sm:grid-cols-3">
            {artist.photoGallery.map((photo) => (
              <div key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 390px, 33vw"
                  className={cn("object-cover", photo.position)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Booking / Press Kit</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Book {artist.artistName}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                For club dates, festival inquiries, private events, and press requests, contact the booking team with
                event details, date, location, and offer information.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={`mailto:${artist.bookingEmail}`}>
                    <Mail className="h-4 w-4" />
                    Contact booking
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-border text-foreground hover:bg-secondary">
                  <a href={artist.pressKitUrl}>
                    <Download className="h-4 w-4" />
                    Request press kit
                  </a>
                </Button>
              </div>
            </div>
            <div className="border-t border-border bg-secondary/20 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Ticket className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Available worldwide</p>
                  <p className="mt-1 text-sm text-muted-foreground">Club, festival, and brand events</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <ImageIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Press assets ready</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bio, photos, links, and highlights</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
