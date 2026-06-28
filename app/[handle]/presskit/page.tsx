import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, ArrowDownToLine, Camera, ExternalLink, FileText, FolderOpen, Layers, Radio, Music2, Play, Youtube, Instagram, Music, Globe, Link2, Calendar, Wrench, type LucideIcon } from "lucide-react"
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
                  <div className="mt-8 flex flex-wrap gap-3">
                    {/* English PDF — primary CTA */}
                    {pk.pdfEnUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEnUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2.5 rounded-full bg-accent/[0.14] px-5 py-2.5 ring-1 ring-accent/30 transition-all duration-200 hover:bg-accent/[0.20] hover:ring-accent/50"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-accent/80 transition-colors duration-200 group-hover:text-accent" />
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-accent/80 transition-colors duration-200 group-hover:text-accent">
                          Press Kit
                        </span>
                        <span className="inline-flex items-center rounded border border-accent/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-accent/55 transition-colors duration-200 group-hover:border-accent/40 group-hover:text-accent/80">
                          ENG
                        </span>
                        {pk.pdfEnSize && (
                          <span className="text-[10px] text-accent/38">{pk.pdfEnSize}</span>
                        )}
                      </a>
                    )}
                    {/* Spanish PDF — secondary CTA */}
                    {pk.pdfEsUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEsUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 transition-all duration-200 hover:border-white/[0.20] hover:bg-white/[0.05]"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-white/40 transition-colors duration-200 group-hover:text-white/65" />
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground/65 transition-colors duration-200 group-hover:text-foreground/85">
                          Press Kit
                        </span>
                        <span className="inline-flex items-center rounded border border-white/[0.18] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/45 transition-colors duration-200 group-hover:border-white/30 group-hover:text-white/65">
                          ESP
                        </span>
                        {pk.pdfEsSize && (
                          <span className="text-[10px] text-white/25">{pk.pdfEsSize}</span>
                        )}
                      </a>
                    )}
                  </div>
                )}

                {/* Fallback: root folder when no PDFs */}
                {!hasPdfs && pk.rootUrl && (
                  <div className="mt-8">
                    <a
                      href={resolveSafeHref(pk.rootUrl) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 rounded-full bg-accent/[0.12] px-5 py-3 ring-1 ring-accent/28 transition-all duration-200 hover:bg-accent/[0.18] hover:ring-accent/45"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-accent/75 transition-colors duration-200 group-hover:text-accent" />
                      <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent/75 transition-colors duration-200 group-hover:text-accent">
                        Download Press Kit
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
              <div className="max-w-[680px]">
                <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
                  About
                </p>

                {(artist.genres.length > 0 || artist.location.trim()) && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {artist.genres.map((g) => (
                      <span
                        key={g}
                        className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/65"
                      >
                        {g}
                      </span>
                    ))}
                    {artist.genres.length > 0 && artist.location.trim() && (
                      <span className="text-white/18" aria-hidden>·</span>
                    )}
                    {artist.location.trim() && (
                      <span className="text-[11px] text-white/38">{artist.location}</span>
                    )}
                  </div>
                )}

                {artist.tagline && (
                  <h2 className="text-[20px] font-black leading-[1.2] tracking-[-0.025em] text-foreground/90 sm:text-[24px]">
                    {artist.tagline}
                  </h2>
                )}

                {artist.shortBio.trim() && (
                  <p className={cn(
                    "text-[14px] leading-[1.78] text-white/55 sm:text-[15px]",
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
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
                Assets
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderCards.map((card) => (
                  <a
                    key={card.id}
                    href={resolveSafeHref(card.url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.11] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between">
                      <card.icon className="h-4 w-4 text-accent/55 transition-colors duration-150 group-hover:text-accent/85" />
                      <ExternalLink className="h-3 w-3 text-white/15 transition-colors duration-150 group-hover:text-white/35" />
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-foreground/78 transition-colors duration-150 group-hover:text-foreground">
                      {card.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/28">{card.description}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/45 transition-colors duration-150 group-hover:text-accent/75">
                      {card.cta}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Press Photos ──────────────────────────────────────────── */}
          {pk.useGalleryPhotos && artist.galleryImages.length > 0 && (
            <div className="pk-section-lazy mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
                  Press Photos
                </p>
                {pk.mediaFolderUrl && (
                  <a
                    href={resolveSafeHref(pk.mediaFolderUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/42 transition-all duration-200 hover:border-accent/30 hover:bg-accent/[0.06] hover:text-accent/75"
                  >
                    <ArrowDownToLine className="h-3 w-3" />
                    Download All
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(() => {
                  const mediaHref = pk.mediaFolderUrl ? resolveSafeHref(pk.mediaFolderUrl) : null
                  return artist.galleryImages.slice(0, 6).map((image) =>
                    mediaHref ? (
                      <a
                        key={image.id}
                        href={mediaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-secondary"
                      >
                        <Image
                          src={image.imageUrl}
                          alt={image.altText}
                          fill
                          loading="lazy"
                          sizes="(max-width: 640px) 48vw, (max-width: 896px) 32vw, 280px"
                          className="object-cover transition-[transform] duration-500 group-hover:scale-[1.04]"
                          style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                        />
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="flex w-full items-center justify-between px-3 pb-3">
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70">
                              Hi-res available
                            </span>
                            <ArrowDownToLine className="h-3.5 w-3.5 text-white/65" />
                          </div>
                        </div>
                      </a>
                    ) : (
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
                    )
                  )
                })()}
              </div>
              <p className="mt-3 text-[10px] text-white/18">
                Previews only · High-res files available in the Press Photos folder above
              </p>
            </div>
          )}

          {/* ── Micro Footer ──────────────────────────────────────────── */}
          <footer className="mt-16 border-t border-white/[0.05] pb-8 pt-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:items-start sm:gap-6">

              {/* Left: Booking */}
              <div>
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.26em] text-white/26">
                  Booking
                </p>
                {resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ? (
                  <a
                    href={resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ?? "#"}
                    className="block text-[13px] text-white/55 transition-colors duration-150 hover:text-white/80"
                  >
                    {artist.bookingInfo.email}
                  </a>
                ) : (
                  <span className="text-[13px] text-white/20">—</span>
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
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.26em] text-white/26">
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
                          className="text-white/38 transition-colors duration-200 hover:text-white/72"
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Right: Copyright + branding + legal */}
              <div className="sm:text-right">
                <p className="text-[11px] text-white/32">
                  © {footerYear} {artist.artistName}
                </p>
                {artist.showHeaderBranding && (
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/14">
                    Powered by{" "}
                    <Link href="/" className="transition-colors duration-150 hover:text-white/26">
                      DJHQ
                    </Link>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 sm:justify-end">
                  <Link href="/privacy" className="text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44">
                    Privacy
                  </Link>
                  <Link href="/terms" className="text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44">
                    Terms
                  </Link>
                  <Link href="/cookies" className="text-[10px] text-white/20 transition-colors duration-150 hover:text-white/44">
                    Cookies
                  </Link>
                </div>
              </div>

            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
