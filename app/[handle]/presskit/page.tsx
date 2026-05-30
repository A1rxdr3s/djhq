import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, Camera, Download, ExternalLink, FileText, FolderOpen, Layers, Mail, Wrench, type LucideIcon } from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import type { GalleryImage, SubscriptionPlan } from "@/types/djhq"
import { getAccentTheme } from "@/lib/accent-themes"
import { BookingInquiryModal } from "@/components/djhq/booking-inquiry-modal"

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

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "pro" ? "pro" : "free"
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

async function getArtistPressKit(handle: string) {
  if (USE_MOCK && handle === mockArtist.handle) {
    return mockArtist
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: artistRow } = await supabase
    .from("artists")
    .select(
      "id, handle, artist_name, real_name, tagline, genres, location, short_bio, hero_image_url, avatar_url, booking_email, booking_url, press_kit_enabled, press_kit_download_url, press_kit_assets, press_kit_root_url, press_kit_bio_folder_url, press_kit_logos_folder_url, press_kit_media_folder_url, press_kit_rider_folder_url, press_kit_pdf_en_url, press_kit_pdf_es_url, press_kit_pdf_en_size, press_kit_pdf_es_size, press_kit_use_gallery_photos, plan, show_header_branding, hero_logo_url, hero_identity_mode, artist_accent_theme, is_published",
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

  const plan = normalizePlan(artistRow.plan)
  const isPro = plan === "pro"

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
    accentTheme: isPro ? (artistRow.artist_accent_theme as "matrix" | "electric_blue" | "signal_red" | undefined) : "matrix",
    plan,
    showHeaderBranding: artistRow.show_header_branding,
  }
}

export async function generateMetadata({ params }: PressKitPageProps): Promise<Metadata> {
  const { handle } = await params
  const artist = await getArtistPressKit(handle)
  if (!artist) return {}
  return {
    title: `${artist.artistName} — Press Kit`,
    description: `Official press kit for ${artist.artistName}. Download bio, photos, logos, and rider.`,
    robots: { index: false },
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

  // Asset tiles — only rendered when URL is configured
  const assetCards: AssetCard[] = [
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
    {
      id: "drive",
      label: "Full Drive Package",
      description: "Complete press kit folder with all available assets.",
      cta: "Open Drive",
      url: pk.rootUrl ?? "",
      icon: FolderOpen,
    },
  ].filter((c) => Boolean(c.url))

  const hasPdfs = Boolean(pk.pdfEnUrl || pk.pdfEsUrl)
  const hasAssetCards = assetCards.length > 0
  // Root-only mode: no individual folder links, no PDFs — just the root folder
  const rootOnlyMode = !hasPdfs && !assetCards.some((c) => c.id !== "drive") && Boolean(pk.rootUrl)

  const profileHref = `/${artist.handle}`
  const pressKitHref = `/${artist.handle}/presskit`

  return (
    <>
      <style>{`:root{--accent:${accentThemeConfig.accent};--accent-foreground:${accentThemeConfig.accentForeground}}`}</style>

      <div className="min-h-screen bg-background text-foreground">
        {/* Background atmosphere */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/[0.03] blur-[120px]" />
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">

          {/* Back link */}
          <Link
            href={profileHref}
            className="mb-10 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 transition-colors duration-150 hover:text-white/50"
          >
            <ArrowLeft className="h-3 w-3" />
            {artist.artistName}
          </Link>

          {/* ── Hero card ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
            {artist.heroImageUrl && (
              <div className="relative h-[200px] w-full sm:h-[260px]">
                <Image
                  src={artist.heroImageUrl}
                  alt={artist.artistName}
                  fill
                  priority
                  className="object-cover object-[50%_25%]"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              </div>
            )}

            <div className="px-7 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-8">
              {/* EPK eyebrow */}
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                Electronic Press Kit
              </p>

              {/* Genres */}
              {artist.genres.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {artist.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-accent/20 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/60"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Artist name */}
              <h1 className="text-3xl font-black tracking-[-0.02em] text-foreground sm:text-4xl">
                {artist.artistName}
              </h1>

              {artist.location && (
                <p className="mt-1.5 text-sm text-white/35">{artist.location}</p>
              )}

              {/* Bio */}
              <p className="mt-5 text-sm leading-relaxed text-white/50 sm:text-[15px]">
                {artist.shortBio}
              </p>

              {/* ── Hero CTAs ──────────────────────────────────────────── */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {/* PDF EN — primary */}
                {pk.pdfEnUrl && (
                  <a
                    href={pk.pdfEnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download English Press Kit
                  </a>
                )}

                {/* PDF ES — secondary when EN also exists, primary otherwise */}
                {pk.pdfEsUrl && (
                  <a
                    href={pk.pdfEsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      pk.pdfEnUrl
                        ? "flex h-11 items-center gap-2.5 rounded-full border border-accent/40 bg-transparent px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-accent/80 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/[0.08] hover:[box-shadow:0_0_18px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
                        : "flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar Press Kit Español
                  </a>
                )}

                {/* Root folder — primary only when no PDFs exist */}
                {!hasPdfs && pk.rootUrl && (
                  <a
                    href={pk.rootUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Full Press Kit Folder
                  </a>
                )}

                {/* Root folder — quiet secondary when PDFs already shown */}
                {hasPdfs && pk.rootUrl && (
                  <a
                    href={pk.rootUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-1.5 text-[11px] font-semibold text-white/35 transition-colors duration-150 hover:text-white/60"
                  >
                    Open full package
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Legacy fallback — only when no other CTAs exist */}
                {!hasPdfs && !pk.rootUrl && pk.downloadUrl && (
                  <a
                    href={pk.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Press Kit
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ── Press Kit Assets ───────────────────────────────────────── */}
          {hasAssetCards && (
            <div className="mt-8">
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Press Kit Assets
                </p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.01em] text-foreground">
                  {rootOnlyMode ? "Asset Package" : "Download Folders"}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {assetCards.map((card) => (
                  <a
                    key={card.id}
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    {/* Hover glow */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--accent)_5%,transparent),transparent_70%)]" />

                    <card.icon className="h-5 w-5 text-accent/70" />

                    <p className="mt-4 text-sm font-bold text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                      {card.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/30">
                      {card.description}
                    </p>

                    <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/60 transition-colors duration-150 group-hover:text-accent/90">
                      {card.cta}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Downloads ──────────────────────────────────────────────── */}
          {hasPdfs && (
            <div className="mt-8">
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Downloads
                </p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.01em] text-foreground">
                  PDF Press Kit
                </h2>
              </div>
              <div className="space-y-3">
                {pk.pdfEnUrl && (
                  <a
                    href={pk.pdfEnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.08]">
                        <FileText className="h-4 w-4 text-accent/70" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                          English Press Kit
                        </p>
                        <p className="mt-0.5 text-xs text-white/30">
                          {pk.pdfEnSize ? `PDF · ${pk.pdfEnSize}` : "PDF"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <Download className="h-2.5 w-2.5" />
                      Download EN
                    </span>
                  </a>
                )}
                {pk.pdfEsUrl && (
                  <a
                    href={pk.pdfEsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.08]">
                        <FileText className="h-4 w-4 text-accent/70" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                          Spanish Press Kit
                        </p>
                        <p className="mt-0.5 text-xs text-white/30">
                          {pk.pdfEsSize ? `PDF · ${pk.pdfEsSize}` : "PDF"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <Download className="h-2.5 w-2.5" />
                      Download ES
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── Press Photos ───────────────────────────────────────────── */}
          {pk.useGalleryPhotos && artist.galleryImages.length > 0 && (
            <div className="mt-8">
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Press Photos
                </p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.01em] text-foreground">
                  Media Gallery
                </h2>
              </div>
              <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
                <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
                  {artist.galleryImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-2xl bg-secondary"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        style={{
                          objectPosition: `${image.focalX}% ${image.focalY}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                {pk.mediaFolderUrl && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <p className="text-[11px] text-white/25">
                      High-resolution versions available in the Press Photos folder.
                    </p>
                    <a
                      href={pk.mediaFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/50 transition-colors duration-150 hover:text-accent/80"
                    >
                      Open folder
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Booking CTA ────────────────────────────────────────────── */}
          {artist.bookingInfo.email.trim() && (
            <div className="mt-8 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-7 sm:p-10">
              <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                Booking
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.01em] text-foreground sm:text-3xl">
                Book {artist.artistName}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/40">
                Need booking details, press material or availability?
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <BookingInquiryModal
                  artistHandle={artist.handle}
                  artistName={artist.artistName}
                  pressKitUrl={pressKitHref}
                />
                <a
                  href={`mailto:${artist.bookingInfo.email}`}
                  className="flex h-11 items-center gap-2.5 rounded-full border border-white/[0.12] bg-transparent px-6 text-sm font-semibold uppercase tracking-[0.1em] text-white/50 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/25 hover:text-white/80"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              </div>
            </div>
          )}

          {/* Footer */}
          {artist.showHeaderBranding && (
            <p className="mt-12 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/15">
              Powered by{" "}
              <Link href="/" className="transition-colors duration-150 hover:text-white/30">
                DJHQ
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
