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
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{children}</h2>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  )
}

function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      className="group flex min-h-12 items-center justify-between rounded-2xl border border-border/80 bg-background/55 px-3.5 py-3 backdrop-blur-sm transition-colors hover:border-accent/50 hover:bg-accent/10"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Icon className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
        </span>
        <span className="truncate text-sm font-semibold text-foreground">{link.label}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src={artist.heroImageUrl}
          alt=""
          fill
          aria-hidden="true"
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.20),_transparent_34%),radial-gradient(circle_at_82%_24%,_hsl(var(--accent)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)/0.72),_hsl(var(--background))_58%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.035]" />
        <div className="absolute left-1/2 top-8 h-[620px] w-[min(1180px,94vw)] -translate-x-1/2 rounded-full border border-accent/10 bg-accent/[0.035] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-7">
        <header className="mx-auto mb-3 flex max-w-6xl items-center justify-between">
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

        <div className="mx-auto max-w-xl rounded-[2rem] border border-border/80 bg-background/45 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-3 lg:max-w-6xl lg:p-4">
        <section className="overflow-hidden rounded-[1.65rem] border border-border bg-card shadow-2xl shadow-black/40">
          <div className="relative min-h-[470px] sm:min-h-[540px] lg:min-h-[680px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 1120px, (min-width: 768px) 640px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.18),_transparent_28%,_hsl(var(--background)/0.84)_78%,_hsl(var(--background)))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_transparent,_hsl(var(--background)/0.54)_70%)]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.045]" />

            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-md">
                Electronic Press Kit
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent backdrop-blur-md">
                Booking Ready
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
              <div className="mb-3 flex flex-wrap gap-2">
                {artist.genres.map((genre) => (
                  <Badge key={genre} className="border-white/10 bg-black/35 text-foreground backdrop-blur-sm">
                    {genre}
                  </Badge>
                ))}
              </div>
              <h1 className="max-w-[10ch] text-5xl font-black uppercase leading-[0.9] tracking-tight text-foreground sm:text-7xl lg:max-w-[14ch] lg:text-8xl">
                {artist.artistName}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                {artist.location}
              </p>
              <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-relaxed text-muted-foreground lg:max-w-2xl lg:text-base">
                {artist.shortBio}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-black/35 p-2 backdrop-blur-md lg:max-w-xl">
                <Button asChild size="lg" className="h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={`mailto:${artist.bookingInfo.email}`}>
                    <Mail className="h-4 w-4" />
                    Book
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-foreground backdrop-blur-sm hover:bg-white/10"
                >
                  <a href={featuredRelease.platformUrl}>
                    <Play className="h-4 w-4" />
                    Listen
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] lg:items-start">
          <section className="rounded-[1.65rem] border border-border bg-card/80 p-4 backdrop-blur-sm lg:col-start-1 lg:row-start-1">
            <SectionTitle>Music / Social Links</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {prioritizedLinks.map((link) => (
                <MainLink key={link.platform} link={link} />
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.65rem] border border-border bg-card lg:col-start-2 lg:row-start-1">
            <div className="relative p-4 sm:p-5">
              <div className="absolute inset-0 opacity-20">
                <Image
                  src={featuredRelease.artworkUrl}
                  alt=""
                  fill
                  aria-hidden="true"
                  sizes="560px"
                  className="scale-110 object-cover blur-2xl"
                />
              </div>
              <div className="relative">
                <SectionTitle>Featured Release</SectionTitle>
                <div className="mt-4 flex gap-3 sm:gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent/10 shadow-xl shadow-black/30 sm:h-28 sm:w-28">
                    <Image
                      src={featuredRelease.artworkUrl}
                      alt={`${featuredRelease.title} artwork`}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      {featuredRelease.type}
                    </p>
                    <h2 className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">
                      {featuredRelease.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      {featuredRelease.label} / {featuredReleaseYear}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {featuredReleaseDescription}
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-3 w-full rounded-xl border-border bg-background/50 text-foreground hover:bg-secondary sm:w-auto"
                    >
                      <a href={featuredRelease.platformUrl}>
                        Listen / Buy
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.65rem] border border-border bg-card/90 p-4 sm:p-5 lg:col-start-2 lg:row-start-2">
            <SectionTitle>Upcoming Gigs</SectionTitle>
            <div className="mt-3 space-y-2.5">
              {upcomingGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="flex items-start gap-3 border-t border-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
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

          <section className="rounded-[1.65rem] border border-border bg-card/90 p-4 sm:p-5 lg:col-start-1 lg:row-span-2 lg:row-start-2">
            <SectionTitle>Photo Preview</SectionTitle>
            <div className="mt-3 grid grid-cols-5 grid-rows-2 gap-2.5">
              {photoPreview.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl bg-secondary",
                    index === 0 ? "col-span-3 row-span-2 aspect-[4/5]" : "col-span-2 aspect-[4/3]",
                  )}
                >
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

          <section className="overflow-hidden rounded-[1.65rem] border border-accent/20 bg-accent/[0.06] p-4 shadow-xl shadow-accent/5 sm:p-5 lg:col-start-2 lg:row-start-3">
            <SectionTitle>Booking / Press Kit</SectionTitle>
            <div className="mt-4">
              <p className="text-2xl font-bold leading-tight text-foreground">
                Bring {artist.artistName} to your next room.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Promoter-ready contact, photos, and artist materials in one place.
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                <a href={artist.pressKit.downloadUrl}>
                  <Download className="h-4 w-4" />
                  Press kit
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-border bg-background/45 text-foreground hover:bg-secondary"
              >
                <a href={`mailto:${artist.bookingInfo.email}`}>
                  <Mail className="h-4 w-4" />
                  Contact
                </a>
              </Button>
            </div>
            <a
              href={`mailto:${artist.bookingInfo.email}`}
              className="mt-3 block rounded-2xl border border-border/80 bg-background/35 px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {artist.bookingInfo.email}
            </a>
          </section>
        </div>
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
