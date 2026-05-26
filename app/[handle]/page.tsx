import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import {
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
import type { Artist, Release, ReleaseType, SocialLink, SocialPlatform, SubscriptionPlan } from "@/types/djhq"
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
  credits: string | null
  release_date: string
  artwork_url: string
  platform_url: string
  type: string
  is_featured: boolean
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

const RELEASE_GROUP_ORDER = ["Albums", "EPs", "Singles", "Remixes", "Other Releases"] as const
type ReleaseGroupLabel = (typeof RELEASE_GROUP_ORDER)[number]

function getReleaseGroupLabel(type: string): ReleaseGroupLabel {
  const t = type.toLowerCase().trim()
  if (t === "album" || t === "lp") return "Albums"
  if (t === "ep") return "EPs"
  if (t === "single" || t === "song" || t === "track") return "Singles"
  if (t === "remix") return "Remixes"
  return "Other Releases"
}

function groupReleasesByType(releases: Release[]): Array<{ label: ReleaseGroupLabel; releases: Release[] }> {
  const groups = new Map<ReleaseGroupLabel, Release[]>()

  for (const release of releases) {
    const label = getReleaseGroupLabel(release.type)
    const existing = groups.get(label)
    if (existing) {
      existing.push(release)
    } else {
      groups.set(label, [release])
    }
  }

  return RELEASE_GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    releases: groups.get(label)!,
  }))
}

function mapReleaseRow(row: ReleaseRow): Release {
  return {
    id: row.id,
    title: row.title,
    label: row.label,
    credits: row.credits ?? undefined,
    releaseDate: row.release_date,
    artworkUrl: row.artwork_url,
    platformUrl: row.platform_url,
    type: normalizeReleaseType(row.type),
  }
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

    const [socialLinksResult, releasesResult, gigsResult, galleryImagesResult] = await Promise.all([
      supabase
        .from("social_links")
        .select("platform, label, url")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .returns<SocialLinkRow[]>(),
      supabase
        .from("releases")
        .select("id, title, label, credits, release_date, artwork_url, platform_url, type, is_featured")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .order("release_date", { ascending: false })
        .returns<ReleaseRow[]>(),
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

    if (socialLinksResult.error || releasesResult.error || gigsResult.error || galleryImagesResult.error) {
      throw socialLinksResult.error ?? releasesResult.error ?? gigsResult.error ?? galleryImagesResult.error
    }

    const releaseRows = releasesResult.data ?? []
    const featuredReleaseRow = releaseRows.find((release) => release.is_featured)
    const selectedReleaseRows = releaseRows.filter((release) => !release.is_featured)

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
      featuredRelease: featuredReleaseRow ? mapReleaseRow(featuredReleaseRow) : undefined,
      selectedReleases: selectedReleaseRows.map(mapReleaseRow),
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
    <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent/70">{children}</h2>
  )
}

function MainLink({ link }: { link: SocialLink }) {
  const Icon = socialIcons[link.platform]

  return (
    <a
      href={link.url}
      aria-label={`${link.label} for this artist`}
      title={link.label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-accent backdrop-blur-sm transition-colors hover:border-accent/35 hover:bg-accent/[0.08]"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{link.label}</span>
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
  const selectedReleases = artist.selectedReleases
  const releaseGroups = groupReleasesByType(selectedReleases)
  const isMultiGroup = releaseGroups.length > 1
  const upcomingGigs = artist.upcomingGigs.slice(0, 3)
  const photoPreview = artist.galleryImages.slice(0, 3)
  const featuredReleaseYear = new Date(featuredRelease.releaseDate).getUTCFullYear()
  const releaseTagline =
    artist.tagline && artist.tagline.trim() !== artist.shortBio.trim() ? artist.tagline : null
  const hasFeaturedArtwork = featuredRelease.artworkUrl.trim().length > 0
  const hasPressKit =
    artist.pressKit.enabled && artist.pressKit.downloadUrl.trim().length > 0
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_4%,_hsl(var(--accent)/0.20),_transparent_30%),radial-gradient(circle_at_84%_16%,_hsl(var(--accent)/0.08),_transparent_28%),radial-gradient(circle_at_48%_84%,_hsl(var(--foreground)/0.06),_transparent_40%),linear-gradient(180deg,_hsl(var(--background)/0.46),_hsl(var(--background))_68%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.014]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_hsl(var(--background))_0%,_transparent_12%,_transparent_88%,_hsl(var(--background))_100%)]" />
        <div className="absolute left-1/2 top-0 h-[720px] w-[min(1280px,98vw)] -translate-x-1/2 rounded-full bg-accent/[0.025] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center justify-between sm:mb-6">
          <Link href="/" className="flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
              <span className="text-xs font-bold text-accent">DJ</span>
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">DJHQ</span>
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground/90">@{artist.handle}</span>
        </header>

        <section className="group overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-card/20 shadow-xl shadow-black/30">
          <div className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[680px]">
            <Image
              src={artist.heroImageUrl}
              alt={`${artist.artistName} performing behind the decks`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 1120px, (min-width: 768px) 640px, 100vw"
              className="object-cover saturate-[0.95] contrast-110 brightness-[0.86] transition-transform duration-[1800ms] ease-out group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_hsl(var(--background)/0.28),_hsl(var(--background)/0.04)_32%,_hsl(var(--background)/0.48)_68%,_hsl(var(--background)/0.97))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,_transparent_20%,_hsl(var(--background)/0.22)_58%,_hsl(var(--background)/0.68)_100%)]" />
            <div className="absolute inset-y-0 left-0 w-2/3 bg-[linear-gradient(92deg,_hsl(var(--background)/0.38),_transparent_76%)]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.016]" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_20%_88%,_hsl(var(--accent)/0.12),_transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_48%,_hsl(var(--background)/0.28)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(72%,420px)] bg-[linear-gradient(0deg,_hsl(var(--background)/0.92)_0%,_hsl(var(--background)/0.55)_42%,_transparent_100%)]" />
              <div className="relative max-w-3xl">
                <div className="mb-2.5 flex flex-wrap gap-1.5 sm:mb-3">
                  {artist.genres.map((genre) => (
                    <Badge
                      key={genre}
                      className="border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
                <h1 className="max-w-full text-[clamp(1.85rem,7.8vw,2.85rem)] font-black uppercase leading-[0.94] tracking-[-0.02em] text-foreground drop-shadow-2xl sm:text-[clamp(2.5rem,6.2vw,4rem)] sm:leading-[0.92] lg:max-w-none lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap lg:text-[clamp(3.25rem,4.8vw,5.25rem)]">
                  {artist.artistName}
                </h1>
                {releaseTagline ? (
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-accent/90 sm:text-base">
                    {releaseTagline}
                  </p>
                ) : null}
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-white/70 sm:mt-3 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent sm:h-4 sm:w-4" />
                  {artist.location}
                </p>
                <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/65 sm:mt-2.5 sm:text-sm lg:max-w-2xl lg:text-base">
                  {artist.shortBio}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:mt-5">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 w-fit rounded-full bg-accent px-6 text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:h-12"
                  >
                    <a href={`mailto:${artist.bookingInfo.email}`}>
                      <Mail className="h-4 w-4" />
                      Book this artist
                    </a>
                  </Button>
                  {prioritizedLinks.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {prioritizedLinks.map((link) => (
                        <MainLink key={`${link.platform}-${link.url}`} link={link} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] lg:items-start lg:gap-10">
          <section className="rounded-[1.75rem] border border-white/[0.06] bg-gradient-to-b from-card/50 to-background/40 p-4 shadow-lg shadow-black/20 sm:p-5 lg:col-start-2 lg:row-start-1 lg:p-4">
            <SectionTitle>Featured Release</SectionTitle>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)] sm:items-center sm:gap-5 lg:mt-4 lg:grid-cols-2 lg:gap-3.5">
              <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-secondary shadow-lg shadow-black/35 sm:mx-0 sm:max-w-none sm:w-full">
                {!hasFeaturedArtwork ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                    <Music2 className="h-10 w-10 text-accent/80" />
                  </div>
                ) : (
                  <Image
                    src={featuredRelease.artworkUrl}
                    alt={`${featuredRelease.title} artwork`}
                    fill
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 42vw, 200px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
              <div className="flex min-w-0 flex-col justify-center sm:py-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent/90">
                  {featuredRelease.type}
                </p>
                <h2 className="mt-1.5 text-balance text-2xl font-black leading-[1.05] tracking-[-0.01em] text-foreground sm:mt-2 sm:text-[1.65rem] lg:text-[1.5rem] lg:leading-[1.08] xl:text-[1.625rem]">
                  {featuredRelease.title}
                </h2>
                {featuredRelease.credits ? (
                  <p className="mt-1 text-xs text-muted-foreground/85 sm:mt-1.5">
                    {featuredRelease.credits}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:mt-2">
                  {featuredRelease.label} · {featuredReleaseYear}
                </p>
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-full bg-accent px-6 text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:mt-4 sm:w-auto lg:mt-3.5"
                >
                  <a href={featuredRelease.platformUrl}>
                    Listen / Buy
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <section className="border-t border-white/[0.06] pt-6 sm:pt-7 lg:col-start-2 lg:row-start-2 lg:rounded-[1.75rem] lg:border lg:border-white/[0.06] lg:bg-card/25 lg:p-5 lg:pt-5">
            <SectionTitle>Upcoming Gigs</SectionTitle>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {upcomingGigs.map((gig) => (
                <div key={gig.id} className="flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0 sm:py-4">
                  <p className="text-sm font-semibold text-foreground">{gig.venue}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(gig.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {gig.city}, {gig.country}
                  </p>
                  {gig.ticketUrl ? (
                    <a
                      href={gig.ticketUrl}
                      className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent/80"
                    >
                      Tickets
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <SectionTitle>Press Photos</SectionTitle>
            <div className="mt-4 grid grid-cols-5 grid-rows-2 gap-2.5 sm:gap-3 lg:mt-5 lg:h-[480px]">
              {photoPreview.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative overflow-hidden bg-secondary",
                    index === 0
                      ? "col-span-3 row-span-2 aspect-[4/5] rounded-2xl shadow-md shadow-black/25 lg:aspect-auto lg:rounded-[1.5rem]"
                      : "col-span-2 aspect-[4/3] rounded-xl shadow-sm shadow-black/20 lg:aspect-auto",
                  )}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={photo.altText}
                    fill
                    loading="eager"
                    sizes="(min-width: 768px) 220px, 33vw"
                    className={cn(
                      "object-cover saturate-[0.97]",
                      photo.sortOrder === 1 ? "object-left" : photo.sortOrder === 2 ? "object-center" : "object-right",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[1.75rem] border border-accent/15 bg-[radial-gradient(circle_at_12%_0%,_hsl(var(--accent)/0.14),_transparent_48%),linear-gradient(160deg,_hsl(var(--accent)/0.06),_hsl(var(--card)/0.35))] p-5 shadow-lg shadow-black/25 sm:p-6 lg:col-start-2 lg:row-start-3">
            <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.012]" />
            <div className="relative">
              <SectionTitle>Booking</SectionTitle>
              <p className="mt-4 text-xl font-bold leading-tight text-foreground sm:text-2xl">
                Bring {artist.artistName} to your next room.
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Press kit, photos, and booking contact for promoters and venues.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {hasPressKit ? (
                  <Button
                    asChild
                    className="h-12 w-full rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:w-fit sm:px-8"
                  >
                    <a href={artist.pressKit.downloadUrl}>
                      <Download className="h-4 w-4" />
                      Download press kit
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="h-12 w-full rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/15 hover:bg-accent/90 sm:w-fit sm:px-8"
                  >
                    <a href={`mailto:${artist.bookingInfo.email}`}>
                      <Mail className="h-4 w-4" />
                      Book this artist
                    </a>
                  </Button>
                )}
                <a
                  href={`mailto:${artist.bookingInfo.email}`}
                  className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
                >
                  {artist.bookingInfo.email}
                </a>
              </div>
            </div>
          </section>
        </div>

        {selectedReleases.length > 0 ? (
          <section className="mt-8 lg:mt-10">
            <SectionTitle>Selected Releases</SectionTitle>
            {releaseGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex > 0 ? "mt-7 sm:mt-8" : "mt-4"}>
                {isMultiGroup ? (
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground/45">
                    {group.label}
                  </p>
                ) : null}
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                  {group.releases.map((release) => {
                    const releaseYear = new Date(release.releaseDate).getUTCFullYear()
                    const hasArtwork = !!(release.artworkUrl?.trim())

                    return (
                      <article
                        key={release.id}
                        className="w-[min(72vw,220px)] shrink-0 snap-start sm:w-[200px] lg:w-[220px]"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary shadow-md shadow-black/30">
                          {hasArtwork ? (
                            <Image
                              src={release.artworkUrl}
                              alt={`${release.title} artwork`}
                              fill
                              sizes="220px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.24),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
                              <Music2 className="h-8 w-8 text-accent/75" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                        </div>
                        <div className="mt-3 min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">
                            {release.type}
                          </p>
                          <h3 className="mt-1 text-balance text-base font-bold leading-tight text-foreground">
                            {release.title}
                          </h3>
                          {release.credits ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground/85">
                              {release.credits}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {release.label} · {releaseYear}
                          </p>
                          <a
                            href={release.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent/80"
                          >
                            Listen
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <footer className="py-10 text-center sm:py-12">
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
