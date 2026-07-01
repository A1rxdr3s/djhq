import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import {
  ArrowLeft, ArrowDownToLine, Camera, ExternalLink,
  FileText, FolderOpen, Layers, Radio, Music2, Play,
  Youtube, Instagram, Music, Globe, Link2, Calendar, Wrench,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveArtistFavicon } from "@/lib/artist-favicon"
import { resolveSafeHref } from "@/lib/safe-url"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"
import { PressKitLegalFooter } from "@/components/djhq/presskit-legal-footer"
import type { GalleryImage, SocialPlatform, SubscriptionPlan } from "@/types/djhq"
import { getAccentTheme } from "@/lib/accent-themes"

type PressKitPageProps = {
  params: Promise<{ handle: string }>
}

export const dynamic = "force-dynamic"

// ─── Local types ──────────────────────────────────────────────────────────────

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

type AssetCard = {
  id: string
  label: string
  description: string
  cta: string
  url: string
  icon: LucideIcon
}

// ─── Social platform config ───────────────────────────────────────────────────

const socialPlatforms: SocialPlatform[] = [
  "spotify", "beatport", "soundcloud", "youtube", "instagram",
  "tiktok", "resident-advisor", "bandsintown", "website", "other",
]

function normalizeSocialPlatform(platform: string): SocialPlatform {
  return socialPlatforms.includes(platform as SocialPlatform)
    ? (platform as SocialPlatform)
    : "other"
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

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getArtistPressKit(handle: string): Promise<ReturnType<typeof buildArtistResult> | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: artistRow } = await supabase
    .from("artists")
    .select(
      "id, handle, artist_name, real_name, tagline, genres, location, short_bio, " +
      "hero_image_url, avatar_url, favicon_url, booking_email, booking_url, " +
      "press_kit_enabled, press_kit_assets, press_kit_root_url, press_kit_bio_folder_url, " +
      "press_kit_logos_folder_url, press_kit_media_folder_url, press_kit_rider_folder_url, " +
      "press_kit_pdf_en_url, press_kit_pdf_es_url, press_kit_pdf_en_size, press_kit_pdf_es_size, " +
      "press_kit_use_gallery_photos, plan, show_header_branding, hero_logo_url, " +
      "hero_identity_mode, artist_accent_theme, is_published",
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
    id:        row.id,
    imageUrl:  row.image_url,
    altText:   row.alt_text,
    sortOrder: row.sort_order,
    focalX:    row.focal_x ?? 50,
    focalY:    row.focal_y ?? 50,
  }))

  const socialLinksResult = await supabase
    .from("social_links")
    .select("platform, label, url")
    .eq("artist_id", artistRow.id)
    .order("sort_order", { ascending: true })
    .returns<SocialLinkRow[]>()

  const rawSocialLinks: SocialLinkRow[] = socialLinksResult.data ?? []

  const plan  = normalizePlan(artistRow.plan)
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
    id:              artistRow.id,
    handle:          artistRow.handle,
    artistName:      artistRow.artist_name,
    realName:        artistRow.real_name ?? undefined,
    tagline:         artistRow.tagline?.trim() || null,
    genres:          (artistRow.genres ?? []).filter(Boolean),
    location:        artistRow.location?.trim() || null,
    shortBio:        artistRow.short_bio?.trim() || null,
    heroImageUrl:    artistRow.hero_image_url,
    avatarUrl:       artistRow.avatar_url ?? undefined,
    faviconUrl:      artistRow.favicon_url ?? undefined,
    heroLogoUrl:     artistRow.hero_logo_url ?? null,
    heroIdentityMode: (artistRow.hero_identity_mode || "text") as "text" | "logo" | "both",
    bookingInfo: {
      email:      artistRow.booking_email,
      bookingUrl: artistRow.booking_url ?? undefined,
    },
    pressKit: {
      enabled:           artistRow.press_kit_enabled,
      assetsIncluded:    artistRow.press_kit_assets ?? [],
      rootUrl:           artistRow.press_kit_root_url ?? null,
      bioFolderUrl:      artistRow.press_kit_bio_folder_url ?? null,
      logosFolderUrl:    artistRow.press_kit_logos_folder_url ?? null,
      mediaFolderUrl:    artistRow.press_kit_media_folder_url ?? null,
      riderFolderUrl:    artistRow.press_kit_rider_folder_url ?? null,
      pdfEnUrl:          artistRow.press_kit_pdf_en_url ?? null,
      pdfEsUrl:          artistRow.press_kit_pdf_es_url ?? null,
      pdfEnSize:         artistRow.press_kit_pdf_en_size ?? null,
      pdfEsSize:         artistRow.press_kit_pdf_es_size ?? null,
      useGalleryPhotos:  artistRow.press_kit_use_gallery_photos ?? true,
    },
    galleryImages,
    socialLinks: socialLinksRaw.map((link) => ({
      platform: normalizeSocialPlatform(link.platform),
      label:    link.label,
      url:      link.url,
    })),
    accentTheme:      isPro ? (artistRow.artist_accent_theme as "matrix" | "electric_blue" | "signal_red" | undefined) : "matrix",
    plan,
    showHeaderBranding: artistRow.show_header_branding,
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PressKitPageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = await getArtistPressKit(handle)
  if (!artist) return {}

  const isPro = artist.plan === "pro"
  const faviconHref = resolveArtistFavicon({
    isPro,
    faviconUrl:  artist.faviconUrl,
    artistName:  artist.artistName,
  })

  return {
    title:       `${artist.artistName} — Press Kit`,
    description: `Official press kit for ${artist.artistName}. Download bio, photos, logos, and rider.`,
    robots:      { index: false },
    icons:       { icon: faviconHref },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PressKitPage({ params }: PressKitPageProps) {
  const { handle } = await params
  const artist = await getArtistPressKit(handle)

  if (!artist || !artist.pressKit.enabled) notFound()

  const pk              = artist.pressKit
  const accentTheme     = getAccentTheme(artist.accentTheme ?? "matrix")
  const hasPdfs         = Boolean(pk.pdfEnUrl || pk.pdfEsUrl)
  const profileHref     = `/${artist.handle}`
  const footerYear      = new Date().getFullYear()

  // About section: only show if there is real configured content
  const hasTagline      = Boolean(artist.tagline)
  const hasShortBio     = Boolean(artist.shortBio)
  const hasGenres       = artist.genres.length > 0
  const hasLocation     = Boolean(artist.location)
  const showAbout       = hasTagline || hasShortBio || hasGenres || hasLocation

  // Asset folder cards — only include cards that have a configured URL
  const folderCards: AssetCard[] = [
    {
      id:          "drive",
      label:       "Full Package",
      description: "Complete press kit folder with all available assets.",
      cta:         "Open Drive",
      url:         pk.rootUrl ?? "",
      icon:        FolderOpen,
    },
    {
      id:          "bio",
      label:       "Bio & Text",
      description: "Artist biography and profile copy.",
      cta:         "Open",
      url:         pk.bioFolderUrl ?? "",
      icon:        FileText,
    },
    {
      id:          "logos",
      label:       "Logos & Artwork",
      description: "Official logos, marks, and brand assets.",
      cta:         "Open",
      url:         pk.logosFolderUrl ?? "",
      icon:        Layers,
    },
    {
      id:          "photos",
      label:       "Press Photos",
      description: "High-resolution press and media images.",
      cta:         "Open",
      url:         pk.mediaFolderUrl ?? "",
      icon:        Camera,
    },
    {
      id:          "rider",
      label:       "Technical Rider",
      description: "Stage requirements and hospitality.",
      cta:         "Open",
      url:         pk.riderFolderUrl ?? "",
      icon:        Wrench,
    },
  ].filter((c) => Boolean(resolveSafeHref(c.url)))

  const hasAssets = folderCards.length > 0

  // Social icon links
  const iconLinks = artist.socialLinks
    .filter((l) => l.url.trim().length > 0)
    .slice(0, 7)
    .map((l) => ({ ...l, href: resolveSafeHref(l.url), Icon: socialIcons[l.platform] }))
    .filter((l): l is typeof l & { href: string } => l.href !== null)

  // Show gallery section only if configured and photos exist
  const showPhotos = pk.useGalleryPhotos && artist.galleryImages.length > 0

  // Media folder href (used by gallery images)
  const mediaHref = pk.mediaFolderUrl ? resolveSafeHref(pk.mediaFolderUrl) : null

  // Booking contact email for legal modal
  const legalContactEmail = artist.bookingInfo.email?.trim() || null

  return (
    <>
      <style>{`:root{--accent:${accentTheme.accent};--accent-foreground:${accentTheme.accentForeground}}`}</style>

      <div className="min-h-screen bg-background text-foreground">

        {/* ── Background atmosphere ────────────────────────────────── */}
        {/* radial-gradient instead of blur filter — avoids expensive CPU rasterization on Safari */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div
            className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.04 }}
          />
          <div
            className="absolute bottom-0 right-0 h-[400px] w-[400px]"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.025 }}
          />
        </div>

        <div className="mx-auto max-w-[1400px] pb-12 pt-8" style={{ paddingInline: "clamp(20px, 4vw, 56px)" }}>

          {/* ── 1. Back nav ──────────────────────────────────────────── */}
          <nav className="mb-6">
            <Link
              href={profileHref}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28 transition-colors duration-200 hover:text-white/60"
            >
              <ArrowLeft className="h-3 w-3" />
              {artist.artistName}
            </Link>
          </nav>

          {/* ── 2. Hero / EPK Cover ───────────────────────────────────── */}
          <section className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-white/[0.012]">
            <div className={cn(
              "grid grid-cols-1",
              artist.heroImageUrl
                ? "lg:grid-cols-[58fr_42fr]"
                : "",
            )}>

              {/* Image column */}
              {artist.heroImageUrl && (
                <div className="relative aspect-[16/9] lg:aspect-auto lg:min-h-[460px]">
                  <Image
                    src={artist.heroImageUrl}
                    alt={artist.artistName}
                    fill
                    priority
                    quality={85}
                    placeholder="empty"
                    className="object-cover object-[50%_22%]"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                  />
                  {/* Mobile bottom fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/75 to-transparent lg:hidden" />
                  {/* Desktop right-side fade into content column */}
                  <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-background/45 lg:block" />
                </div>
              )}

              {/* Content column */}
              <div className="flex flex-col justify-center px-7 py-8 lg:px-12 lg:py-10">

                {/* Eyebrow */}
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-accent/60">
                  Official Press Kit
                </p>

                {/* Artist identity */}
                {artist.heroLogoUrl && (artist.heroIdentityMode === "logo" || artist.heroIdentityMode === "both") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.heroLogoUrl}
                    alt={artist.artistName}
                    loading="eager"
                    className="max-h-[64px] max-w-[200px] object-contain opacity-90 sm:max-h-[80px] sm:max-w-[240px] lg:max-h-[96px] lg:max-w-[280px]"
                  />
                ) : (
                  <h1 className="text-[30px] font-black uppercase leading-[0.88] tracking-[-0.02em] text-foreground sm:text-[38px] lg:text-[46px] xl:text-[54px]">
                    {artist.artistName}
                  </h1>
                )}

                {/* Subtitle */}
                <p className="mt-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-white/32">
                  Electronic Press Kit
                </p>

                {/* Divider */}
                <div className="my-6 h-px w-12 bg-white/[0.08]" />

                {/* Materials included */}
                {pk.assetsIncluded.length > 0 && (
                  <p className="mb-6 text-[11px] uppercase tracking-[0.13em] text-white/20">
                    {pk.assetsIncluded.join("  ·  ")}
                  </p>
                )}

                {/* Download CTAs */}
                {hasPdfs && (
                  <div className="flex flex-wrap gap-3">
                    {/* English PDF — primary */}
                    {pk.pdfEnUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEnUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 rounded-full bg-accent/[0.15] px-5 py-2.5 ring-1 ring-accent/30 transition-all duration-200 hover:bg-accent/[0.22] hover:ring-accent/50"
                      >
                        {/* UK flag — geometric SVG */}
                        <svg viewBox="0 0 20 14" className="h-[11px] w-[16px] shrink-0 rounded-[2px] opacity-80 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true">
                          <rect width="20" height="14" fill="#012169" />
                          <line x1="0" y1="0" x2="20" y2="14" stroke="white" strokeWidth="3.5" />
                          <line x1="20" y1="0" x2="0" y2="14" stroke="white" strokeWidth="3.5" />
                          <line x1="0" y1="0" x2="20" y2="14" stroke="#C8102E" strokeWidth="1.8" />
                          <line x1="20" y1="0" x2="0" y2="14" stroke="#C8102E" strokeWidth="1.8" />
                          <rect x="8.5" y="0" width="3" height="14" fill="white" />
                          <rect x="0" y="5.5" width="20" height="3" fill="white" />
                          <rect x="9" y="0" width="2" height="14" fill="#C8102E" />
                          <rect x="0" y="6" width="20" height="2" fill="#C8102E" />
                        </svg>
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-accent/80 transition-colors duration-200 group-hover:text-accent">
                          English Press Kit
                        </span>
                        {pk.pdfEnSize && (
                          <span className="text-[10px] text-accent/35 transition-colors duration-200 group-hover:text-accent/55">{pk.pdfEnSize}</span>
                        )}
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-accent/60 transition-colors duration-200 group-hover:text-accent" />
                      </a>
                    )}
                    {/* Spanish PDF — secondary */}
                    {pk.pdfEsUrl && (
                      <a
                        href={resolveSafeHref(pk.pdfEsUrl) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.03] px-5 py-2.5 transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.05]"
                      >
                        {/* Spanish flag — red/yellow/red stripes */}
                        <svg viewBox="0 0 20 14" className="h-[11px] w-[16px] shrink-0 rounded-[2px] opacity-75 transition-opacity duration-200 group-hover:opacity-95" aria-hidden="true">
                          <rect width="20" height="14" fill="#AA151B" />
                          <rect y="3.5" width="20" height="7" fill="#F1BF00" />
                        </svg>
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground/60 transition-colors duration-200 group-hover:text-foreground/82">
                          Spanish Press Kit
                        </span>
                        {pk.pdfEsSize && (
                          <span className="text-[10px] text-white/22 transition-colors duration-200 group-hover:text-white/38">{pk.pdfEsSize}</span>
                        )}
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-white/35 transition-colors duration-200 group-hover:text-white/60" />
                      </a>
                    )}
                  </div>
                )}

                {/* Fallback: root folder when no PDF downloads configured */}
                {!hasPdfs && pk.rootUrl && (
                  <a
                    href={resolveSafeHref(pk.rootUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex w-fit items-center gap-2.5 rounded-full bg-accent/[0.13] px-5 py-3 ring-1 ring-accent/26 transition-all duration-200 hover:bg-accent/[0.20] hover:ring-accent/45"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-accent/75 transition-colors duration-200 group-hover:text-accent" />
                    <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent/75 transition-colors duration-200 group-hover:text-accent">
                      Download Press Kit
                    </span>
                  </a>
                )}

                {/* Artist Snapshot — anchored below CTAs inside the hero panel */}
                {showAbout && (
                  <div className="mt-7 border-t border-white/[0.05] pt-5">
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-white/20">
                      Artist Snapshot
                    </p>
                    {(hasGenres || hasLocation) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {artist.genres.map((g) => (
                          <span key={g} className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent/65">
                            {g}
                          </span>
                        ))}
                        {hasGenres && hasLocation && (
                          <span className="text-white/16 select-none" aria-hidden="true">·</span>
                        )}
                        {hasLocation && (
                          <span className="text-[11px] font-medium text-white/32">{artist.location}</span>
                        )}
                      </div>
                    )}
                    {hasTagline && (
                      <p className={cn(
                        "text-[15px] font-bold leading-[1.28] tracking-[-0.01em] text-foreground/80",
                        (hasGenres || hasLocation) ? "mt-3" : "",
                      )}>
                        {artist.tagline}
                      </p>
                    )}
                    {hasShortBio && (
                      <p className={cn(
                        "text-[12px] leading-[1.7] text-white/35",
                        (hasTagline || hasGenres || hasLocation) ? "mt-1.5" : "",
                      )}>
                        {artist.shortBio}
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ── 3. Press Kit Assets ──────────────────────────────────── */}
          {hasAssets && (
            <section className="mt-8">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
                  Press Kit Assets
                </p>
                <p className="mt-1 text-[11px] text-white/18">
                  Official files for promoters, venues, press, and media.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {folderCards.map((card) => (
                  <a
                    key={card.id}
                    href={resolveSafeHref(card.url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.015] p-4 transition-all duration-200 hover:border-accent/[0.15] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="rounded-[8px] bg-white/[0.04] p-2 transition-colors duration-150 group-hover:bg-accent/[0.08]">
                        <card.icon className="h-[15px] w-[15px] text-accent/55 transition-colors duration-150 group-hover:text-accent/85" />
                      </div>
                      <ExternalLink className="h-3 w-3 text-white/10 transition-colors duration-150 group-hover:text-white/28" />
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                      {card.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-[1.55] text-white/24">
                      {card.description}
                    </p>
                    <div className="mt-auto flex items-center gap-1.5 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent/42 transition-colors duration-150 group-hover:text-accent/72">
                        {card.cta}
                      </span>
                      <ArrowDownToLine className="h-2.5 w-2.5 text-accent/32 transition-colors duration-150 group-hover:text-accent/65" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── 4. Press Photos ──────────────────────────────────────── */}
          {showPhotos && (
            <section className="mt-8">
              <div className="mb-5 flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
                    Press Photos
                  </p>
                  <p className="mt-1 text-[11px] text-white/18">
                    {mediaHref
                      ? "Preview images · Download high-res files from the press photos folder."
                      : "Preview images · Contact for high-resolution files."}
                  </p>
                </div>
                {mediaHref && (
                  <a
                    href={mediaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 group inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.02] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/38 transition-all duration-200 hover:border-accent/28 hover:bg-accent/[0.05] hover:text-accent/70"
                  >
                    <ArrowDownToLine className="h-3 w-3" />
                    Download All
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {artist.galleryImages.slice(0, 6).map((image) =>
                  mediaHref ? (
                    <a
                      key={image.id}
                      href={mediaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[3/4] overflow-hidden rounded-[14px] bg-white/[0.03]"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        loading="lazy"
                        quality={70}
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 280px"
                        className="object-cover transition-[transform] duration-500 group-hover:scale-[1.03]"
                        style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex w-full items-center justify-between px-3.5 pb-3.5">
                          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/68">
                            Hi-res available
                          </span>
                          <ArrowDownToLine className="h-3.5 w-3.5 text-white/62" />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={image.id}
                      className="group relative aspect-[3/4] overflow-hidden rounded-[14px] bg-white/[0.03]"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        loading="lazy"
                        quality={70}
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 280px"
                        className="object-cover sm:transition-[transform] sm:duration-500 sm:group-hover:scale-[1.03]"
                        style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                      />
                    </div>
                  )
                )}
              </div>

            </section>
          )}

          {/* ── 5. Booking / Contact Strip ───────────────────────────── */}
          <section className="mt-10 rounded-[20px] border border-white/[0.06] bg-white/[0.012] px-7 py-8 sm:px-10 sm:py-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              {/* Booking contact */}
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.26em] text-white/26">
                  Booking
                </p>
                {artist.bookingInfo.email && resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ? (
                  <a
                    href={resolveSafeHref(`mailto:${artist.bookingInfo.email}`) ?? "#"}
                    className="block text-[15px] font-semibold text-white/65 transition-colors duration-150 hover:text-white/90"
                  >
                    {artist.bookingInfo.email}
                  </a>
                ) : null}
              </div>

              {/* CTA + social icons */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <BookingInquiryModal
                  artistHandle={artist.handle}
                  artistName={artist.artistName}
                />
                {iconLinks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-[18px]">
                    {iconLinks.map(({ platform, url, label, href, Icon }) => (
                      <a
                        key={`${platform}-${url}`}
                        href={href}
                        aria-label={label}
                        title={label}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/32 transition-colors duration-200 hover:text-white/68"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ── 6. Footer ────────────────────────────────────────────── */}
          <footer className="mt-8 border-t border-white/[0.04] pt-6">
            <PressKitLegalFooter
              artistName={artist.artistName}
              contactEmail={legalContactEmail}
              year={footerYear}
              showBranding={artist.showHeaderBranding}
            />
          </footer>

        </div>
      </div>
    </>
  )
}
