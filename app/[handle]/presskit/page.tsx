import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, Download, ExternalLink, Mail, FileText } from "lucide-react"
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

type AssetFolder = {
  label: string
  url: string | undefined
  description: string
}

export default async function PressKitPage({ params }: PressKitPageProps) {
  const { handle } = await params
  const artist = await getArtistPressKit(handle)

  if (!artist || !artist.pressKit.enabled) {
    notFound()
  }

  const pk = artist.pressKit
  const accentThemeConfig = getAccentTheme(artist.accentTheme ?? "matrix")

  const assetFolders: AssetFolder[] = [
    { label: "Bio & Text", url: pk.bioFolderUrl, description: "Artist biography, quotes, and text assets" },
    { label: "Logos & Artwork", url: pk.logosFolderUrl, description: "High-res logos, artwork, and visual identity" },
    { label: "Press Photos", url: pk.mediaFolderUrl, description: "High-resolution press and promotional photos" },
    { label: "Technical Rider", url: pk.riderFolderUrl, description: "Sound, stage, and hospitality requirements" },
  ].filter((f) => f.url)

  const hasPdfs = pk.pdfEnUrl || pk.pdfEsUrl
  const hasAssets = assetFolders.length > 0 || hasPdfs
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

          {/* Hero card */}
          <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
            {/* Hero image band */}
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

              {/* Download CTAs */}
              {hasAssets && (
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {pk.pdfEnUrl && (
                    <a
                      href={pk.pdfEnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      EPK{pk.pdfEnSize ? ` — ${pk.pdfEnSize}` : ""}
                    </a>
                  )}
                  {pk.pdfEsUrl && (
                    <a
                      href={pk.pdfEsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center gap-2.5 rounded-full border border-accent/40 bg-transparent px-6 text-sm font-bold uppercase tracking-[0.12em] text-accent/80 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/[0.08] hover:[box-shadow:0_0_18px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      EPK ES{pk.pdfEsSize ? ` — ${pk.pdfEsSize}` : ""}
                    </a>
                  )}
                  {!pk.pdfEnUrl && !pk.pdfEsUrl && pk.downloadUrl && (
                    <a
                      href={pk.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground shadow-md shadow-accent/10 transition-all duration-150 hover:-translate-y-0.5 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Press Kit
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Press Asset Folders */}
          {assetFolders.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
              <div className="px-7 pb-3 pt-6 sm:px-8 sm:pt-7">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Press Assets
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.01em] text-foreground">
                  Download Folders
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {assetFolders.map((folder) => (
                  <a
                    key={folder.label}
                    href={folder.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 px-7 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:px-8"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                        {folder.label}
                      </p>
                      <p className="mt-0.5 text-xs text-white/30">{folder.description}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <ExternalLink className="h-2.5 w-2.5" />
                      Open
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* PDF Downloads */}
          {hasPdfs && (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
              <div className="px-7 pb-3 pt-6 sm:px-8 sm:pt-7">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Downloads
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.01em] text-foreground">
                  PDF Press Kit
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {pk.pdfEnUrl && (
                  <a
                    href={pk.pdfEnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 px-7 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:px-8"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-accent/50" />
                      <div>
                        <p className="text-sm font-bold text-foreground/85 group-hover:text-foreground">
                          English
                        </p>
                        {pk.pdfEnSize && (
                          <p className="text-xs text-white/30">{pk.pdfEnSize}</p>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <Download className="h-2.5 w-2.5" />
                      PDF
                    </span>
                  </a>
                )}
                {pk.pdfEsUrl && (
                  <a
                    href={pk.pdfEsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 px-7 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:px-8"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-accent/50" />
                      <div>
                        <p className="text-sm font-bold text-foreground/85 group-hover:text-foreground">
                          Spanish
                        </p>
                        {pk.pdfEsSize && (
                          <p className="text-xs text-white/30">{pk.pdfEsSize}</p>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <Download className="h-2.5 w-2.5" />
                      PDF
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Press Photos */}
          {pk.useGalleryPhotos && artist.galleryImages.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
              <div className="px-7 pb-5 pt-6 sm:px-8 sm:pt-7">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                  Press Photos
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.01em] text-foreground">
                  Media Gallery
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 px-2 pb-2 sm:grid-cols-3">
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
              <p className="px-7 pb-5 pt-3 text-[11px] text-white/25 sm:px-8">
                High-resolution versions available in the Press Photos folder above.
              </p>
            </div>
          )}

          {/* Booking CTA */}
          {artist.bookingInfo.email.trim() && (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-7 sm:p-10">
              <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
                Booking
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.01em] text-foreground sm:text-3xl">
                Book {artist.artistName}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/40">
                Available worldwide for club, festival, and brand events.
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
