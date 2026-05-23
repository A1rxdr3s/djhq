import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
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
import type { Artist, ReleaseType, SocialLink, SocialPlatform, SubscriptionPlan } from "@/types/djhq"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type PublicProfilePageProps = {
  params: Promise<{
    handle: string
  }>
}

export const dynamic = "force-dynamic"

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

type ArtistRow = {
  id: string
  tenant_id: string | null
  owner_user_id: string | null
  handle: string
  artist_name: string
  real_name: string | null
  tagline: string | null
  genres: string[] | null
  location: string
  short_bio: string
  hero_image_url: string
  avatar_url: string | null
  booking_email: string
  booking_url: string | null
  press_kit_enabled: boolean
  press_kit_download_url: string | null
  press_kit_assets: string[] | null
  plan: string
  is_published: boolean
  created_at: string
  updated_at: string
}

type SocialLinkRow = {
  platform: string
  label: string
  url: string
}

type ReleaseRow = {
  id: string
  title: string
  label: string
  release_date: string
  artwork_url: string
  platform_url: string
  type: string
}

type GigRow = {
  id: string
  date: string
  venue: string
  city: string
  country: string
  ticket_url: string | null
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
}

const socialPlatforms: SocialPlatform[] = [
  "beatport",
  "spotify",
  "soundcloud",
  "youtube",
  "instagram",
  "tiktok",
  "website",
  "other",
]

function createSupabaseReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "pro" ? "pro" : "free"
}

function normalizeSocialPlatform(platform: string): SocialPlatform {
  return socialPlatforms.includes(platform as SocialPlatform) ? (platform as SocialPlatform) : "other"
}

function normalizeReleaseType(type: string): ReleaseType {
  if (type === "ep" || type === "EP") {
    return "EP"
  }

  return type === "album" ? "album" : "single"
}

function getMockArtistFallback(handle: string) {
  return handle === mockArtist.handle ? mockArtist : null
}

async function getArtistProfile(handle: string): Promise<Artist | null> {
  const normalizedHandle = handle.toLowerCase()
  const supabase = createSupabaseReadClient()

  if (!supabase) {
    return getMockArtistFallback(normalizedHandle)
  }

  try {
    const { data: artistRow, error: artistError } = await supabase
      .from("artists")
      .select("*")
      .eq("handle", normalizedHandle)
      .eq("is_published", true)
      .maybeSingle<ArtistRow>()

    if (artistError) {
      throw artistError
    }

    if (!artistRow) {
      return null
    }

    const [socialLinksResult, featuredReleaseResult, gigsResult, galleryImagesResult] = await Promise.all([
      supabase
        .from("social_links")
        .select("platform, label, url")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .returns<SocialLinkRow[]>(),
      supabase
        .from("releases")
        .select("id, title, label, release_date, artwork_url, platform_url, type")
        .eq("artist_id", artistRow.id)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle<ReleaseRow>(),
      supabase
        .from("gigs")
        .select("id, date, venue, city, country, ticket_url")
        .eq("artist_id", artistRow.id)
        .order("date", { ascending: true })
        .returns<GigRow[]>(),
      supabase
        .from("gallery_images")
        .select("id, image_url, alt_text, sort_order")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .returns<GalleryImageRow[]>(),
    ])

    if (socialLinksResult.error || featuredReleaseResult.error || gigsResult.error || galleryImagesResult.error) {
      throw socialLinksResult.error ?? featuredReleaseResult.error ?? gigsResult.error ?? galleryImagesResult.error
    }

    return {
      id: artistRow.id,
      tenantId: artistRow.tenant_id ?? "",
      ownerUserId: artistRow.owner_user_id ?? "",
      handle: artistRow.handle,
      artistName: artistRow.artist_name,
      realName: artistRow.real_name ?? undefined,
      tagline: artistRow.tagline ?? undefined,
      genres: artistRow.genres ?? [],
      location: artistRow.location,
      shortBio: artistRow.short_bio,
      heroImageUrl: artistRow.hero_image_url,
      avatarUrl: artistRow.avatar_url ?? undefined,
      socialLinks: (socialLinksResult.data ?? []).map((link) => ({
        platform: normalizeSocialPlatform(link.platform),
        label: link.label,
        url: link.url,
      })),
      featuredRelease: featuredReleaseResult.data
        ? {
            id: featuredReleaseResult.data.id,
            title: featuredReleaseResult.data.title,
            label: featuredReleaseResult.data.label,
            releaseDate: featuredReleaseResult.data.release_date,
            artworkUrl: featuredReleaseResult.data.artwork_url,
            platformUrl: featuredReleaseResult.data.platform_url,
            type: normalizeReleaseType(featuredReleaseResult.data.type),
          }
        : undefined,
      upcomingGigs: (gigsResult.data ?? []).map((gig) => ({
        id: gig.id,
        date: gig.date,
        venue: gig.venue,
        city: gig.city,
        country: gig.country,
        ticketUrl: gig.ticket_url ?? undefined,
      })),
      galleryImages: (galleryImagesResult.data ?? []).map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        altText: image.alt_text,
        sortOrder: image.sort_order,
      })),
      bookingInfo: {
        email: artistRow.booking_email,
        bookingUrl: artistRow.booking_url ?? undefined,
      },
      pressKit: {
        enabled: artistRow.press_kit_enabled,
        downloadUrl: artistRow.press_kit_download_url ?? "",
        assetsIncluded: artistRow.press_kit_assets ?? [],
      },
      plan: normalizePlan(artistRow.plan),
      isPublished: artistRow.is_published,
      createdAt: artistRow.created_at,
      updatedAt: artistRow.updated_at,
    }
  } catch {
    return getMockArtistFallback(normalizedHandle)
  }
}

export function generateStaticParams() {
  return [{ handle: mockArtist.handle }]
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = await getArtistProfile(handle)

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
      className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card/85 px-4 py-3 transition-colors hover:border-accent/50 hover:bg-accent/5"
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
  const artist = await getArtistProfile(handle)

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
  const linkPriority: SocialPlatform[] = ["beatport", "spotify", "soundcloud", "youtube", "instagram"]
  const prioritizedLinks = [...artist.socialLinks].sort((a, b) => {
    const priorityA = linkPriority.indexOf(a.platform)
    const priorityB = linkPriority.indexOf(b.platform)
    const safePriorityA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA
    const safePriorityB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB

    return safePriorityA - safePriorityB
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-7">
        <header className="mb-3 flex items-center justify-between">
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
          <div className="relative min-h-[500px] sm:min-h-[560px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/15" />
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
              <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {artist.shortBio}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

        <div className="mt-3 space-y-3">
          <section className="rounded-3xl border border-border bg-background/70 p-4 backdrop-blur-sm">
            <SectionTitle>Music / Social Links</SectionTitle>
            <div className="mt-3 grid gap-2.5">
              {prioritizedLinks.map((link) => (
                <MainLink key={link.platform} link={link} />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Featured Release</SectionTitle>
            <div className="mt-3 flex gap-3 sm:gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent/10 sm:h-20 sm:w-20">
                <Image
                  src={featuredRelease.artworkUrl}
                  alt={`${featuredRelease.title} artwork`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-foreground sm:text-lg">{featuredRelease.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {featuredRelease.label} / {featuredRelease.type} / {featuredReleaseYear}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {featuredReleaseDescription}
                </p>
                <Button asChild variant="outline" className="mt-3 w-full border-border text-foreground hover:bg-secondary sm:w-auto">
                  <a href={featuredRelease.platformUrl}>
                    Listen / Buy
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Upcoming Gigs</SectionTitle>
            <div className="mt-3 space-y-2.5">
              {upcomingGigs.map((gig) => (
                <div key={gig.id} className="flex items-start gap-3 rounded-2xl bg-secondary/35 p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{gig.venue}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(gig.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} / {gig.city}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-widest text-accent">{gig.country}</p>
                    {gig.ticketUrl ? (
                      <a
                        href={gig.ticketUrl}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent"
                      >
                        Tickets
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Photo Preview</SectionTitle>
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
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

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <SectionTitle>Press Kit / Booking</SectionTitle>
            <div className="mt-3 rounded-2xl border border-border bg-secondary/35 p-3.5">
              <p className="text-sm font-semibold text-foreground">Ready for promoters and talent buyers.</p>
              <p className="mt-1 text-xs text-muted-foreground">One contact point and instant press kit access.</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              className="mt-3 block rounded-2xl bg-secondary/35 px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {artist.bookingInfo.email}
            </a>
          </section>
        </div>

        <footer className="py-6 text-center">
          <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Powered by DJHQ
          </Link>
        </footer>
      </div>
    </main>
  )
}
