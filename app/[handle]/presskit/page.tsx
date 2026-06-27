import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, Camera, ExternalLink, FileText, FolderOpen, Layers, Radio, Music2, Play, Youtube, Instagram, Music, Globe, Link2, Calendar, Wrench, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { mockArtist } from "@/data/mock-artist"
import { resolveArtistFavicon } from "@/lib/artist-favicon"
import { resolveSafeHref } from "@/lib/safe-url"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"
import type { GalleryImage, SocialPlatform, SubscriptionPlan } from "@/types/djhq"
import { getAccentTheme } from "@/lib/accent-themes"

type PressKitPageProps = {
  params: Promise<{ handle: string }>
}

export const dynamic = "force-dynamic"

type ArtistRow = {
  id: string
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
  press_kit_root_url: string | null
  press_kit_bio_folder_url: string | null
  press_kit_logos_folder_url: string | null
  press_kit_media_folder_url: string | null
  press_kit_rider_folder_url: string | null
  press_kit_pdf_en_url: string | null
  press_kit_pdf_es_url: string | null
  press_kit_pdf_en_size: string | null
  press_kit_pdf_es_size: string | null
  press_kit_use_gallery_photos: boolean
  favicon_url: string | null
  plan: string
  show_header_branding: boolean
  hero_logo_url: string | null
  hero_identity_mode: string
  artist_accent_theme: string
  is_published: boolean
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
  focal_x: number | null
  focal_y: number | null
}

type SocialLinkRow = {
  platform: string
  label: string
  url: string
}

const socialPlatforms: SocialPlatform[] = [
  "spotify", "beatport", "soundcloud", "youtube", "instagram",
  "tiktok", "resident-advisor", "bandsintown", "website", "other",
]

function normalizeSocialPlatform(platform: string): SocialPlatform {
  return socialPlatforms.includes(platform as SocialPlatform) ? (platform as SocialPlatform) : "other"
}

const socialIcons: Record<SocialPlatform, LucideIcon> = {
  spotify:            Radio,
  beatport:           Music2,
  soundcloud:         Play,
  youtube:            Youtube,
  instagram:          Instagram,
  tiktok:             Music,
  "resident-advisor": Globe,
  bandsintown:        Calendar,
  website:            Globe,
  other:              Link2,
}

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "pro" ? "pro" : "free"
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getArtistPressKit(handle: string): Promise<ReturnType<typeof buildArtistResult> | null> {
  if (USE_MOCK && handle === mockArtist.handle) {
    return mockArtist as unknown as ReturnType<typeof buildArtistResult>
  }

  // Uses the anon key — relies on RLS select policies for published artists and
  // their gallery images. Service role is not needed for public read-only access.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: artistRow } = await supabase
    .from("artists")
    .select(
      "id, handle, artist_name, real_name, tagline, genres, location, short_bio, hero_image_url, avatar_url, favicon_url, booking_email, booking_url, press_kit_enabled, press_kit_download_url, press_kit_assets, press_kit_root_url, press_kit_bio_folder_url, press_kit_logos_folder_url, press_kit_media_folder_url, press_kit_rider_folder_url, press_kit_pdf_en_url, press_kit_pdf_es_url, press_kit_pdf_en_size, press_kit_pdf_es_size, press_kit_use_gallery_photos, plan, show_header_branding, hero_logo_url, hero_identity_mode, artist_accent_theme, is_published",
    )
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle<ArtistRow>()
  if (!artistRow) return null

  const galleryResult = artistRow.press_kit_use_gallery_photos
    ? await supabase
        .from("gallery_images")
        .select("id, image_url, alt_text, sort_order, focal_x, focal_y")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .limit(6)
        .returns<GalleryImageRow[]>()
    : { data: [] }
  const galleryImages: GalleryImage[] = (galleryResult.data ?? []).map((row) => ({
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    focalX: row.focal_x ?? 50,
    focalY: row.focal_y ?? 50,
  }))

  const socialLinksResult = await supabase
    .from("social_links")
    .select("platform, label, url")
    .eq("artist_id", artistRow.id)
    .order("sort_order", { ascending: true })
    .returns<SocialLinkRow[]>()
  const rawSocialLinks: SocialLinkRow[] = socialLinksResult.data ?? []

  const plan = normalizePlan(artistRow.plan)
  const isPro = plan === "pro"

  return buildArtistResult(artistRow, galleryImages, rawSocialLinks, plan, isPro)
}

function buildArtistResult(
  artistRow: ArtistRow,
  galleryImages: GalleryImage[],
  socialLinksRaw: SocialLinkRow[],
  plan: SubscriptionPlan,
  isPro: boolean,
) {
  return {
    id: artistRow.id,
    handle: artistRow.handle,
    artistName: artistRow.artist_name,
    realName: artistRow.real_name ?? undefined,
    tagline: artistRow.tagline ?? undefined,
    genres: artistRow.genres ?? [],
    location: artistRow.location,
    shortBio: artistRow.short_bio,
    heroImageUrl: artistRow.hero_image_url,
    avatarUrl: artistRow.avatar_url ?? undefined,
    faviconUrl: artistRow.favicon_url ?? undefined,
    heroLogoUrl: artistRow.hero_logo_url ?? null,
    heroIdentityMode: (artistRow.hero_identity_mode || "text") as "text" | "logo" | "both",
    bookingInfo: {
      email: artistRow.booking_email,
      bookingUrl: artistRow.booking_url ?? undefined,
    },
    pressKit: {
      enabled: artistRow.press_kit_enabled,
      downloadUrl: artistRow.press_kit_download_url ?? "",
      assetsIncluded: artistRow.press_kit_assets ?? [],
      rootUrl: artistRow.press_kit_root_url ?? undefined,
      bioFolderUrl: artistRow.press_kit_bio_folder_url ?? undefined,
      logosFolderUrl: artistRow.press_kit_logos_folder_url ?? undefined,
      mediaFolderUrl: artistRow.press_kit_media_folder_url ?? undefined,
      riderFolderUrl: artistRow.press_kit_rider_folder_url ?? undefined,
      pdfEnUrl: artistRow.press_kit_pdf_en_url ?? undefined,
      pdfEsUrl: artistRow.press_kit_pdf_es_url ?? undefined,
      pdfEnSize: artistRow.press_kit_pdf_en_size ?? undefined,
      pdfEsSize: artistRow.press_kit_pdf_es_size ?? undefined,
      useGalleryPhotos: artistRow.press_kit_use_gallery_photos ?? true,
    },
    galleryImages,
    socialLinks: socialLinksRaw.map((link) => ({
      platform: normalizeSocialPlatform(link.platform),
      label: link.label,
      url: link.url,
    })),
    accentTheme: isPro ? (artistRow.artist_accent_theme as "matrix" | "electric_blue" | "signal_red" | undefined) : "matrix",
    plan,
    showHeaderBranding: artistRow.show_header_branding,
  }
}

export async function generateMetadata({ params }: PressKitPageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = await getArtistPressKit(handle)
  if (!artist) return {}

  const isPro = artist.plan === "pro"
  const faviconHref = resolveArtistFavicon({
    isPro,
    faviconUrl: artist.faviconUrl,
    artistName: artist.artistName,
  })

  return {
    title: `${artist.artistName} — Press Kit`,
    description: `Official press kit for ${artist.artistName}. Download bio, photos, logos, and rider.`,
    robots: { index: false },
    icons: { icon: faviconHref },
  }
}

type AssetCard = {
  id: string
  label: string
  description: string
  cta: string
  url: string
  icon: LucideIcon
}

export default async function PressKitPage({ params }: PressKitPageProps) {
  const { handle } = await params

  const artist = await getArtistPressKit(handle)

  if (!artist || !artist.pressKit.enabled) {
    notFound()
  }

  const pk = artist.pressKit
  const accentThemeConfig = getAccentTheme(artist.accentTheme ?? "matrix")

  const hasPdfs = Boolean(pk.pdfEnUrl || pk.pdfEsUrl)

  const folderCards: AssetCard[] = [
    {
      id: "drive",
      label: "Full Drive Package",
      description: "Complete press kit folder with all available assets.",
      cta: "Open Drive",
      url: pk.rootUrl ?? "",
      icon: FolderOpen,
    },
    {
      id: "bio",
      label: "Bio & Text",
      description: "Artist biography and profile information.",
      cta: "Open Bio",
      url: pk.bioFolderUrl ?? "",
      icon: FileText,
    },
    {
      id: "logos",
      label: "Logos & Artwork",
      description: "Official logos, marks and brand assets.",
      cta: "Open Logos",
      url: pk.logosFolderUrl ?? "",
      icon: Layers,
    },
    {
      id: "photos",
      label: "Press Photos",
      description: "High-resolution press and media images.",
      cta: "Open Photos",
      url: pk.mediaFolderUrl ?? "",
      icon: Camera,
    },
    {
      id: "rider",
      label: "Technical Rider",
      description: "Technical rider, stage requirements and hospitality.",
      cta: "Open Rider",
      url: pk.riderFolderUrl ?? "",
      icon: Wrench,
    },
  ].filter((c) => Boolean(resolveSafeHref(c.url)))


  const hasIndividualFolders = folderCards.some((c) => c.id !== "drive")
  const profileHref = `/${artist.handle}`

  const iconLinks = (artist.socialLinks ?? [])
    .filter((l) => l.url.trim().length > 0)
    .slice(0, 7)
    .map((l) => ({ ...l, href: resolveSafeHref(l.url), Icon: socialIcons[l.platform] }))
    .filter((l): l is typeof l & { href: string } => l.href !== null)

  const footerYear = new Date().getFullYear()

  return (
    <>
      <style>{`:root{--accent:${accentThemeConfig.accent};--accent-foreground:${accentThemeConfig.accentForeground}}`}</style>

      <div className="min-h-screen bg-background text-foreground">
        {/* Background atmosphere */}
        <div className="pk-bg-atmosphere pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.05] sm:blur-[160px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/[0.03] sm:blur-[140px]" />
        </div>

        <div className="mx-auto max-w-[1600px] pt-10" style={{ paddingInline: "clamp(24px, 3vw, 48px)" }}>

          {/* Back link */}
          <Link
            href={profileHref}
            className="mb-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/30 transition-colors duration-200 hover:text-white/60"
          >
            <ArrowLeft className="h-3 w-3" />
            {artist.artistName}
          </Link>

          {/* ── Hero + Downloads ──────────────────────────────────────── */}
          <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.015]">
            {/* Mobile: image top, content below. Desktop: image left, content right. */}
            <div className={cn(
              "grid grid-cols-1",
              artist.heroImageUrl ? "sm:grid-cols-[3fr_2fr] lg:grid-cols-[5fr_3fr]" : "",
            )}>

              {/* Image column */}
              {artist.heroImageUrl && (
                <div className="relative aspect-video sm:aspect-auto sm:min-h-[480px]">
                  <Image
                    src={artist.heroImageUrl}
                    alt={artist.artistName}
                    fill
                    priority
                    quality={80}
                    placeholder="empty"
                    className="object-cover object-[50%_22%]"
                    sizes="(max-width: 640px) 100vw, 60vw"
                  />
                  {/* fade into content below on mobile only */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent sm:hidden" />
                </div>
              )}

              {/* Content column */}
              <div className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
                {/* Eyebrow */}
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-accent/65">
                  Press Kit Downloads
                </p>

                {/* Artist identity */}
                {artist.heroLogoUrl && (artist.heroIdentityMode === "logo" || artist.heroIdentityMode === "both") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.heroLogoUrl}
                    alt={artist.artistName}
                    loading="eager"
                    className="max-h-[60px] max-w-[180px] object-contain opacity-88 sm:max-h-[76px] sm:max-w-[220px] lg:max-h-[88px] lg:max-w-[260px]"
                  />
                ) : (
                  <h1 className="text-[28px] font-black uppercase leading-[0.9] tracking-[-0.02em] text-foreground sm:text-[36px] lg:text-[44px] xl:text-[52px]">
                    {artist.artistName}
                  </h1>
                )}

                {/* Subtitle */}
                <p className="mt-2.5 text-[13px] text-white/38">
                  Electronic Press Kit
                </p>

                {/* Included items */}
                {pk.assetsIncluded.length > 0 && (
                  <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/22">
                    {pk.assetsIncluded.join("  ·  ")}
                  </p>
                )}

                {/* Download CTAs */}
                {hasPdfs && (
                  <div className="mt-7 flex flex-wrap gap-3">
                    {pk.pdfEsUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEsUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.06]"
                      >
                        <span className="inline-flex items-center rounded border border-white/[0.20] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/55 transition-colors duration-200 group-hover:border-accent/40 group-hover:text-accent/75">
                          ESP
                        </span>
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground/80 transition-colors duration-200 group-hover:text-foreground">
                          Press Kit ESP
                        </span>
                        {pk.pdfEsSize && (
                          <span className="text-[10px] text-white/28">{pk.pdfEsSize}</span>
                        )}
                      </a>
                    )}
                    {pk.pdfEnUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEnUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.06]"
                      >
                        <span className="inline-flex items-center rounded border border-white/[0.20] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/55 transition-colors duration-200 group-hover:border-accent/40 group-hover:text-accent/75">
                          ENG
                        </span>
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground/80 transition-colors duration-200 group-hover:text-foreground">
                          Press Kit ENG
                        </span>
                        {pk.pdfEnSize && (
                          <span className="text-[10px] text-white/28">{pk.pdfEnSize}</span>
                        )}
                      </a>
                    )}
                  </div>
                )}

                {/* Fallback: root folder when no PDFs */}
                {!hasPdfs && pk.rootUrl && (
                  <div className="mt-7">
                    <a
                      href={resolveSafeHref(pk.rootUrl) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.06]"
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent/65" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground/80">
                        Full Press Kit Folder
                      </span>
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Artist Bio & Positioning ──────────────────────────────── */}
          {(artist.tagline || artist.shortBio.trim() || artist.genres.length > 0 || artist.location.trim()) && (
            <div className="mt-6 rounded-[20px] border border-white/[0.06] bg-white/[0.015] px-6 py-8 sm:px-10 sm:py-10">
              <div className="max-w-[700px]">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/30">
                  About
                </p>

                {artist.tagline && (
                  <h2 className="text-[19px] font-black tracking-[-0.022em] text-foreground/88 sm:text-[22px]">
                    {artist.tagline}
                  </h2>
                )}

                {(artist.genres.length > 0 || artist.location.trim()) && (
                  <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", artist.tagline ? "mt-3" : "")}>
                    {artist.genres.map((g) => (
                      <span
                        key={g}
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/70"
                      >
                        {g}
                      </span>
                    ))}
                    {artist.genres.length > 0 && artist.location.trim() && (
                      <span className="text-white/20" aria-hidden>·</span>
                    )}
                    {artist.location.trim() && (
                      <span className="text-[11px] text-white/42">{artist.location}</span>
                    )}
                  </div>
                )}

                {artist.shortBio.trim() && (
                  <p className={cn(
                    "text-[14px] leading-[1.74] text-white/60 sm:text-[15px]",
                    (artist.tagline || artist.genres.length > 0 || artist.location.trim()) ? "mt-5" : "",
                  )}>
                    {artist.shortBio}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Press Kit Assets ──────────────────────────────────────── */}
          {hasIndividualFolders && (
            <div className="pk-section-lazy mt-10">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/30">
                Press Kit Assets
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderCards.map((card) => (
                  <a
                    key={card.id}
                    href={resolveSafeHref(card.url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.10] hover:bg-white/[0.04]"
                  >
                    <card.icon className="h-4 w-4 text-accent/60 transition-colors duration-150 group-hover:text-accent/85" />
                    <p className="mt-2.5 text-[13px] font-semibold text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/28">{card.description}</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/50 transition-colors duration-150 group-hover:text-accent/80">
                      {card.cta}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Press Photos ──────────────────────────────────────────── */}
          {pk.useGalleryPhotos && artist.galleryImages.length > 0 && (
            <div className="pk-section-lazy mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/30">
                  Press Photos
                </p>
                {pk.mediaFolderUrl && (
                  <a
                    href={resolveSafeHref(pk.mediaFolderUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent/50 transition-colors duration-150 hover:text-accent/80"
                  >
                    Download All
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {artist.galleryImages.slice(0, 6).map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-secondary"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={image.altText}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 48vw, (max-width: 896px) 32vw, 280px"
                      className="object-cover sm:transition-[transform] sm:duration-500 sm:group-hover:scale-[1.04]"
                      style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-white/18">
                Preview only · Download high-res from the Press Photos folder
              </p>
            </div>
          )}

          {/* ── Micro Footer ──────────────────────────────────────────── */}
          <footer className="mt-16 border-t border-white/[0.05] pb-6 pt-8">
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 sm:items-start sm:gap-6">

              {/* Left: Booking */}
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.26em] text-white/28">
                  Booking
                </p>
                {resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ? (
                  <a
                    href={resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ?? "#"}
                    className="block text-[13px] text-white/58 transition-colors duration-150 hover:text-accent/80"
                  >
                    {artist.bookingInfo.email}
                  </a>
                ) : (
                  <span className="text-[13px] text-white/22">—</span>
                )}
                <div className="mt-4">
                  <BookingInquiryModal
                    artistHandle={artist.handle}
                    artistName={artist.artistName}
                  />
                </div>
              </div>

              {/* Center: Connect */}
              <div>
                {iconLinks.length > 0 && (
                  <>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.26em] text-white/28">
                      Connect
                    </p>
                    <div className="flex flex-wrap items-center gap-[18px]">
                      {iconLinks.map(({ platform, url, label, href, Icon }) => (
                        <a
                          key={`${platform}-${url}`}
                          href={href}
                          aria-label={label}
                          title={label}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/42 transition-colors duration-200 hover:text-accent/80"
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Right: Copyright + branding */}
              <div className="sm:text-right">
                <p className="text-[11px] text-white/35">
                  © {footerYear} {artist.artistName}
                </p>
                {artist.showHeaderBranding && (
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/15">
                    Powered by{" "}
                    <Link href="/" className="transition-colors duration-150 hover:text-white/28">
                      DJHQ
                    </Link>
                  </p>
                )}
              </div>

            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
