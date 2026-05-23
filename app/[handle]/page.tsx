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
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">{children}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-accent/25 via-border/45 to-transparent" />
    </div>
  )
}

function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      title={link.label}
      className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] shadow-sm shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-accent/[0.10] hover:shadow-lg hover:shadow-accent/10"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/10 bg-accent/[0.08]">
        <Icon className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
      </span>
      <span className="sr-only">{link.label}</span>
      <ExternalLink className="absolute right-1.5 top-1.5 h-2.5 w-2.5 text-muted-foreground/55 transition-colors group-hover:text-accent/80" />
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
  const hasFeaturedArtwork = featuredRelease.artworkUrl.trim().length > 0
  const linkPriority: SocialPlatform[] = ["beatport", "spotify", "soundcloud", "youtube", "instagram"]
  const prioritizedLinks = artist.socialLinks.filter((link) => link.url.trim().length > 0).sort((a, b) => {
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
          className="scale-110 object-cover opacity-[0.18] blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_6%,_hsl(var(--accent)/0.18),_transparent_30%),radial-gradient(circle_at_86%_18%,_hsl(var(--accent)/0.09),_transparent_28%),radial-gradient(circle_at_50%_84%,_hsl(var(--foreground)/0.055),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)/0.58),_hsl(var(--background))_66%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.018]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_hsl(var(--background))_0%,_transparent_15%,_transparent_85%,_hsl(var(--background))_100%)]" />
        <div className="absolute left-1/2 top-4 h-[680px] w-[min(1220px,96vw)] -translate-x-1/2 rounded-full border border-accent/10 bg-accent/[0.025] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-7">
        <header className="mx-auto mb-4 flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
              <span className="text-xs font-bold text-accent">DJ</span>
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">DJHQ</span>
          </Link>
          <span className="rounded-full border border-white/10 bg-card/50 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-md">
            @{artist.handle}
          </span>
        </header>

        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-background/[0.28] p-2 shadow-2xl shadow-black/45 backdrop-blur-lg sm:p-3 lg:max-w-6xl lg:p-4">
        <section className="group overflow-hidden rounded-[1.65rem] border border-white/10 bg-card shadow-2xl shadow-black/35">
          <div className="relative min-h-[470px] sm:min-h-[540px] lg:min-h-[680px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 1120px, (min-width: 768px) 640px, 100vw"
              className="object-cover saturate-[0.92] contrast-110 brightness-[0.82] transition-transform duration-[1600ms] ease-out group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.34),_hsl(var(--background)/0.04)_28%,_hsl(var(--background)/0.50)_62%,_hsl(var(--background)/0.95))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_transparent_18%,_hsl(var(--background)/0.28)_66%,_hsl(var(--background)/0.76)_100%)]" />
            <div className="absolute inset-y-0 left-0 w-3/4 bg-[linear-gradient(90deg,_hsl(var(--background)/0.48),_transparent)]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.026]" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_28%_86%,_hsl(var(--accent)/0.12),_transparent_34%)]" />

            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-md">
                Electronic Press Kit
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent backdrop-blur-md">
                Booking Ready
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
              <div className="max-w-3xl rounded-[1.5rem] border border-white/10 bg-black/[0.18] p-3.5 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-5 lg:p-6">
                <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4">
                  {artist.genres.map((genre) => (
                    <Badge
                      key={genre}
                      className="border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/72 backdrop-blur-sm"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
                <h1 className="max-w-[10ch] text-5xl font-black uppercase leading-[0.86] tracking-tight text-foreground drop-shadow-2xl sm:text-7xl lg:max-w-[14ch] lg:text-8xl">
                  {artist.artistName}
                </h1>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-white/72">
                  <MapPin className="h-4 w-4 text-accent" />
                  {artist.location}
                </p>
                <p className="mt-2.5 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/70 drop-shadow-lg lg:max-w-2xl lg:text-base">
                  {artist.shortBio}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-1.5 backdrop-blur-sm lg:max-w-xl">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-accent/25"
                  >
                    <a href={`mailto:${artist.bookingInfo.email}`}>
                      <Mail className="h-4 w-4" />
                      Book
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl border-white/15 bg-black/[0.18] text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <a href={featuredRelease.platformUrl}>
                      <Play className="h-4 w-4" />
                      Listen
                    </a>
                  </Button>
                </div>
                {prioritizedLinks.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/[0.14] p-2 backdrop-blur-sm lg:max-w-xl">
                    {prioritizedLinks.map((link) => (
                      <MainLink key={`${link.platform}-${link.url}`} link={link} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] lg:items-start">
          <section className="group overflow-hidden rounded-[1.65rem] border border-white/10 bg-card/95 shadow-xl shadow-black/25 transition-all duration-500 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/35 lg:col-start-2 lg:row-start-1">
            <div className="relative p-4 sm:p-5">
              {hasFeaturedArtwork ? (
                <div className="absolute inset-0 opacity-25 transition-opacity duration-500 group-hover:opacity-30">
                  <Image
                    src={featuredRelease.artworkUrl}
                    alt=""
                    fill
                    aria-hidden="true"
                    sizes="560px"
                    className="scale-110 object-cover blur-2xl"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,_hsl(var(--accent)/0.24),_transparent_35%),radial-gradient(circle_at_80%_80%,_hsl(var(--foreground)/0.06),_transparent_38%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]" />
              )}
              <div className="absolute inset-0 bg-background/30" />
              <div className="relative">
                <SectionTitle>Featured Release</SectionTitle>
                <div className="mt-4 flex gap-3 sm:gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-accent/10 shadow-xl shadow-black/30 ring-1 ring-white/5 transition-transform duration-500 group-hover:scale-[1.015] sm:h-28 sm:w-28">
                    {hasFeaturedArtwork ? (
                      <Image
                        src={featuredRelease.artworkUrl}
                        alt={`${featuredRelease.title} artwork`}
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_28%_22%,_hsl(var(--accent)/0.42),_transparent_44%),radial-gradient(circle_at_78%_82%,_hsl(var(--foreground)/0.08),_transparent_38%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                        <Music2 className="h-8 w-8 text-accent" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      {featuredRelease.type}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-xl font-bold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl">
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
                      className="mt-3 w-full rounded-xl border-white/10 bg-background/45 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-secondary sm:w-auto"
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

          <section className="rounded-[1.65rem] border border-white/10 bg-card/85 p-4 shadow-xl shadow-black/20 sm:p-5 lg:col-start-2 lg:row-start-2">
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

          <section className="rounded-[1.65rem] border border-white/10 bg-card/80 p-4 shadow-xl shadow-black/20 sm:p-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <SectionTitle>Photo Preview</SectionTitle>
            <div className="mt-3 grid grid-cols-5 grid-rows-2 gap-2.5 lg:h-[520px]">
              {photoPreview.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/10 bg-secondary shadow-lg shadow-black/20 transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-2xl hover:shadow-black/35",
                    index === 0 ? "col-span-3 row-span-2 aspect-[4/5] lg:aspect-auto" : "col-span-2 aspect-[4/3] lg:aspect-auto",
                  )}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={photo.altText}
                    fill
                    loading="eager"
                    sizes="(min-width: 768px) 220px, 33vw"
                    className={cn(
                      "object-cover saturate-[0.96] transition-transform duration-700 group-hover:scale-[1.045]",
                      photo.sortOrder === 1 ? "object-left" : photo.sortOrder === 2 ? "object-center" : "object-right",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-65 transition-opacity duration-500 group-hover:opacity-[0.42]" />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.65rem] border border-accent/20 bg-[radial-gradient(circle_at_top_left,_hsl(var(--accent)/0.12),_transparent_42%),hsl(var(--accent)/0.045)] p-4 shadow-xl shadow-accent/5 sm:p-5 lg:col-start-2 lg:row-start-3">
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

        <footer className="py-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            <span className="h-px w-8 bg-border" />
            DJHQ
            <span className="h-px w-8 bg-border" />
          </Link>
        </footer>
      </div>
    </main>
  )
}
