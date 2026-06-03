import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headers as nextHeaders } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, Camera, Download, ExternalLink, FileText, FolderOpen, Layers, Wrench, type LucideIcon } from "lucide-react"
import { mockArtist } from "@/data/mock-artist"
import { resolveArtistFavicon } from "@/lib/artist-favicon"
import { resolveSafeHref } from "@/lib/safe-url"
import type { GalleryImage, SubscriptionPlan } from "@/types/djhq"
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

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "pro" ? "pro" : "free"
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

// ─── Perf timing ─────────────────────────────────────────────────────────────

type PerfContext = { host: string; pathname: string }
type QueryTiming = { artistMs: number; galleryMs: number; totalMs: number }

function perfLog(
  query: string,
  ctx: PerfContext,
  extra: Record<string, unknown>,
): void {
  console.info("[presskit-perf]", JSON.stringify({ query, host: ctx.host, pathname: ctx.pathname, ...extra }))
}

// ─── Data fetching ────────────────────────────────────────────────────────────

type GetArtistPressKitOpts = {
  perf?: boolean
  perfCtx?: PerfContext
}

async function getArtistPressKit(
  handle: string,
  { perf = false, perfCtx }: GetArtistPressKitOpts = {},
): Promise<(ReturnType<typeof buildArtistResult> & { _timing?: QueryTiming }) | null> {
  if (USE_MOCK && handle === mockArtist.handle) {
    return mockArtist as unknown as ReturnType<typeof buildArtistResult>
  }

  const ctx = perfCtx ?? { host: "unknown", pathname: `/${handle}/presskit` }
  const t0 = performance.now()

  // Uses the anon key — relies on RLS select policies for published artists and
  // their gallery images. Service role is not needed for public read-only access.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const tArtist0 = performance.now()
  const { data: artistRow } = await supabase
    .from("artists")
    .select(
      "id, handle, artist_name, real_name, tagline, genres, location, short_bio, hero_image_url, avatar_url, favicon_url, booking_email, booking_url, press_kit_enabled, press_kit_download_url, press_kit_assets, press_kit_root_url, press_kit_bio_folder_url, press_kit_logos_folder_url, press_kit_media_folder_url, press_kit_rider_folder_url, press_kit_pdf_en_url, press_kit_pdf_es_url, press_kit_pdf_en_size, press_kit_pdf_es_size, press_kit_use_gallery_photos, plan, show_header_branding, hero_logo_url, hero_identity_mode, artist_accent_theme, is_published",
    )
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle<ArtistRow>()
  const artistMs = Math.round(performance.now() - tArtist0)

  if (perf) {
    perfLog("artist", ctx, { durationMs: artistMs, found: artistRow !== null })
  }

  if (!artistRow) return null

  const tGallery0 = performance.now()
  const galleryResult = artistRow.press_kit_use_gallery_photos
    ? await supabase
        .from("gallery_images")
        .select("id, image_url, alt_text, sort_order, focal_x, focal_y")
        .eq("artist_id", artistRow.id)
        .order("sort_order", { ascending: true })
        .limit(6)
        .returns<GalleryImageRow[]>()
    : { data: [] }
  const galleryMs = Math.round(performance.now() - tGallery0)

  if (perf) {
    perfLog("gallery", ctx, {
      durationMs: galleryMs,
      count: (galleryResult.data ?? []).length,
      skipped: !artistRow.press_kit_use_gallery_photos,
    })
  }

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
  const totalMs = Math.round(performance.now() - t0)

  if (perf) {
    perfLog("total", ctx, { durationMs: totalMs, artistMs, galleryMs })
  }

  const result = buildArtistResult(artistRow, galleryImages, plan, isPro)
  return perf ? { ...result, _timing: { artistMs, galleryMs, totalMs } } : result
}

function buildArtistResult(
  artistRow: ArtistRow,
  galleryImages: GalleryImage[],
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
    accentTheme: isPro ? (artistRow.artist_accent_theme as "matrix" | "electric_blue" | "signal_red" | undefined) : "matrix",
    plan,
    showHeaderBranding: artistRow.show_header_branding,
    _timing: undefined as QueryTiming | undefined,
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

  const reqHeaders = await nextHeaders()
  const host = reqHeaders.get("host") ?? "unknown"
  const pathname = `/${handle}/presskit`
  const perfCtx: PerfContext = { host, pathname }

  // Timing is captured inside getArtistPressKit and emitted via [presskit-perf] logs.
  // Server-Timing response headers cannot be set from RSC pages; read console logs instead.
  const artist = await getArtistPressKit(handle, { perf: true, perfCtx })

  if (!artist || !artist.pressKit.enabled) {
    notFound()
  }

  // ── Image diagnostics ───────────────────────────────────────────────────────
  // Temporary instrumentation — logs every image rendered on this page.
  // Remove when no longer needed for performance analysis.
  {
    type ImgDiag = {
      type: string
      url: string
      priority: boolean
      loading: string
      sizes: string
      widthPx: string
      heightPx: string
    }

    const heroImgs: ImgDiag[] = []
    const galleryImgs: ImgDiag[] = []

    // 1. Hero photo — <Image fill priority sizes="(max-width: 768px) 100vw, 768px">
    if (artist.heroImageUrl) {
      heroImgs.push({
        type: "hero-photo",
        url: artist.heroImageUrl,
        priority: true,
        loading: "eager",
        sizes: "(max-width: 768px) 100vw, 768px",
        widthPx: "fill (container: 100vw mobile / 768px desktop)",
        heightPx: "140–170px (fixed container)",
      })
    }

    // 2. Hero logo — plain <img>, no Next Image, no explicit loading attr
    if (
      artist.heroLogoUrl &&
      (artist.heroIdentityMode === "logo" || artist.heroIdentityMode === "both")
    ) {
      heroImgs.push({
        type: "hero-logo",
        url: artist.heroLogoUrl,
        priority: false,
        loading: "eager",
        sizes: "intrinsic (max-width: 280px, max-height: 100px)",
        widthPx: "max 280px",
        heightPx: "max 100px",
      })
    }

    // 3. Gallery preview — up to 4 images, <Image fill lazy>
    for (const image of artist.galleryImages.slice(0, 4)) {
      galleryImgs.push({
        type: "gallery",
        url: image.imageUrl,
        priority: false,
        loading: "lazy",
        sizes: "(max-width: 768px) 33vw, 180px",
        widthPx: "fill (33vw mobile / 180px desktop)",
        heightPx: "equal to width (aspect-square)",
      })
    }

    const allImgs = [...heroImgs, ...galleryImgs]

    for (const img of allImgs) {
      console.info("[presskit-image]", JSON.stringify({
        type: img.type,
        host,
        pathname,
        url: img.url,
        priority: img.priority,
        loading: img.loading,
        sizes: img.sizes,
        widthPx: img.widthPx,
        heightPx: img.heightPx,
        // fileSize: not available server-side without fetching the image
      }))
    }

    console.info("[presskit-summary]", JSON.stringify({
      host,
      pathname,
      totalImages: allImgs.length,
      heroImages: heroImgs.length,
      galleryImages: galleryImgs.length,
    }))
  }
  // ── End image diagnostics ────────────────────────────────────────────────────

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
            className="mb-8 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 transition-colors duration-150 hover:text-white/50"
          >
            <ArrowLeft className="h-3 w-3" />
            {artist.artistName}
          </Link>

          {/* ── Compact EPK header — informational, not promotional ──────── */}
          <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.015]">
            {/* Cover image — reduced height, banner style */}
            {artist.heroImageUrl && (
              <div className="relative h-[140px] w-full sm:h-[170px]">
                <Image
                  src={artist.heroImageUrl}
                  alt={artist.artistName}
                  fill
                  priority
                  className="object-cover object-[50%_20%]"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              </div>
            )}

            <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6">
              {/* Eyebrow */}
              <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.32em] text-accent/55">
                Electronic Press Kit
              </p>

              {/* Logo (when available) or artist name text */}
              {artist.heroLogoUrl && (artist.heroIdentityMode === "logo" || artist.heroIdentityMode === "both") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.heroLogoUrl}
                  alt={artist.artistName}
                  className="max-h-[80px] max-w-[200px] object-contain opacity-85 sm:max-h-[90px] sm:max-w-[240px] lg:max-h-[100px] lg:max-w-[280px]"
                />
              ) : (
                <h1 className="text-2xl font-black tracking-[-0.02em] text-foreground sm:text-3xl">
                  {artist.artistName}
                </h1>
              )}

              {/* Genres + location on one muted line */}
              <p className="mt-1.5 text-[12px] text-white/38">
                {[
                  artist.genres.join(" · "),
                  artist.location,
                ].filter(Boolean).join("  ·  ")}
              </p>

              {/* Helper text */}
              <p className="mt-2 text-[13px] leading-relaxed text-white/28">
                Download press materials, artist assets and booking information.
              </p>
            </div>
          </div>

          {/* ── Press Kit Downloads ────────────────────────────────────── */}
          <div className="mt-8">
            <div className="mb-5">
              <p className="text-[8px] font-bold uppercase tracking-[0.30em] text-accent/55">
                Press Kit Downloads
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.01em] text-foreground">
                Choose your language
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pk.pdfEsUrl && (
                <a
                  href={resolveSafeHref(pk.pdfEsUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.03]"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_65%)]" />
                  <Download className="h-6 w-6 text-accent/70" />
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    {pk.pdfEsSize ? `PDF · ${pk.pdfEsSize}` : "Spanish PDF"}
                  </p>
                  {/* Flag + title row */}
                  <div className="mt-1 flex items-center gap-3">
                    {/* Spain flag — red/yellow/red horizontal stripes */}
                    <div
                      aria-label="Spain flag — document language: Spanish"
                      className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a] ring-1 ring-white/[0.10]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className="h-full w-full">
                        <rect width="3" height="2" fill="#c60b1e" />
                        <rect width="3" height="1" y="0.5" fill="#ffc400" />
                      </svg>
                    </div>
                    <p className="text-2xl font-black tracking-[-0.02em] text-foreground">
                      Press Kit ESP
                    </p>
                  </div>
                  <span className="mt-7 inline-flex h-9 items-center rounded-full border border-accent/25 px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/80 transition-all duration-200 group-hover:border-accent/50 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_16px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
                    Download ESP ↗
                  </span>
                </a>
              )}

              {pk.pdfEnUrl && (
                <a
                  href={resolveSafeHref(pk.pdfEnUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.03]"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_65%)]" />
                  <Download className="h-6 w-6 text-accent/70" />
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    {pk.pdfEnSize ? `PDF · ${pk.pdfEnSize}` : "English PDF"}
                  </p>
                  {/* Flag + title row */}
                  <div className="mt-1 flex items-center gap-3">
                    {/* United Kingdom flag — Union Jack */}
                    <div
                      aria-label="United Kingdom flag — document language: English"
                      className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#012169] ring-1 ring-white/[0.10]"
                    >
                      {/*
                        viewBox 60×36 keeps close to the 5:3 Union Jack ratio.
                        Layers in paint order:
                        1. Navy field
                        2. White broad saltire (St Andrew's, Scotland)
                        3. Red narrow saltire (St Patrick's, Ireland — simplified)
                        4. White St George's fimbriation
                        5. Red St George's cross (England)
                      */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" className="h-full w-full">
                        <rect width="60" height="36" fill="#012169" />
                        <line x1="0" y1="0" x2="60" y2="36" stroke="#fff" strokeWidth="8" />
                        <line x1="60" y1="0" x2="0" y2="36" stroke="#fff" strokeWidth="8" />
                        <line x1="0" y1="0" x2="60" y2="36" stroke="#C8102E" strokeWidth="4.5" />
                        <line x1="60" y1="0" x2="0" y2="36" stroke="#C8102E" strokeWidth="4.5" />
                        <line x1="30" y1="0" x2="30" y2="36" stroke="#fff" strokeWidth="12" />
                        <line x1="0" y1="18" x2="60" y2="18" stroke="#fff" strokeWidth="12" />
                        <line x1="30" y1="0" x2="30" y2="36" stroke="#C8102E" strokeWidth="7" />
                        <line x1="0" y1="18" x2="60" y2="18" stroke="#C8102E" strokeWidth="7" />
                      </svg>
                    </div>
                    <p className="text-2xl font-black tracking-[-0.02em] text-foreground">
                      Press Kit ENG
                    </p>
                  </div>
                  <span className="mt-7 inline-flex h-9 items-center rounded-full border border-accent/25 px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/80 transition-all duration-200 group-hover:border-accent/50 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_16px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
                    Download ENG ↗
                  </span>
                </a>
              )}

              {!hasPdfs && pk.rootUrl && (
                <a
                  href={resolveSafeHref(pk.rootUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.03] sm:col-span-2"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_65%)]" />
                  <FolderOpen className="h-6 w-6 text-accent/70" />
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Google Drive
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.02em] text-foreground">
                    Full Press Kit Folder
                  </p>
                  <p className="mt-1.5 text-sm text-white/35">
                    Open all assets in Google Drive
                  </p>
                  <span className="mt-7 inline-flex h-9 items-center rounded-full border border-accent/25 px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/80 transition-all duration-200 group-hover:border-accent/50 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_16px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
                    Open Drive ↗
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* ── Asset Folders ──────────────────────────────────────────── */}
          {hasIndividualFolders && (
            <div className="mt-10">
              <div className="mb-5">
                <p className="text-[8px] font-bold uppercase tracking-[0.30em] text-accent/55">
                  Press Kit Assets
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.01em] text-foreground">
                  Download Folders
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {folderCards.map((card) => (
                  <a
                    key={card.id}
                    href={resolveSafeHref(card.url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--accent)_5%,transparent),transparent_70%)]" />
                    <div className="flex items-center justify-between">
                      <card.icon className="h-4 w-4 text-accent/70" />
                      {card.id === "drive" && (
                        <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/28">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 text-sm font-bold text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/30">
                      {card.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent/60 transition-colors duration-150 group-hover:text-accent/90">
                      {card.cta}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Press Photos Preview ───────────────────────────────────── */}
          {pk.useGalleryPhotos && artist.galleryImages.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.30em] text-accent/55">
                    Press Photos
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.01em] text-foreground">
                    Press Photos Preview
                  </h2>
                  <p className="mt-1 text-[11px] text-white/25">
                    Preview only · Download high-resolution images from the Press Photos folder.
                  </p>
                </div>
                {pk.mediaFolderUrl && (
                  <a
                    href={resolveSafeHref(pk.mediaFolderUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent/55 transition-colors duration-150 hover:text-accent/85"
                  >
                    Open Folder
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.015]">
                <div className="grid grid-cols-2 gap-2 p-2">
                  {artist.galleryImages.slice(0, 4).map((image, idx) => (
                    <div
                      key={image.id}
                      className={`group relative aspect-square overflow-hidden rounded-xl bg-secondary${idx === 3 ? " hidden sm:block" : ""}`}
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 33vw, 180px"
                        className="object-cover transition-[transform,filter] duration-500 group-hover:scale-[1.04] group-hover:brightness-[1.08]"
                        style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Compact Booking Contact ────────────────────────────────── */}
          {artist.bookingInfo.email.trim() && (
            <div className="mt-10 rounded-[16px] border border-white/[0.05] bg-white/[0.01] px-5 py-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-white/25">
                Booking Contact
              </p>
              <a
                href={`mailto:${artist.bookingInfo.email}`}
                className="mt-1.5 block font-mono text-sm text-white/55 underline decoration-white/[0.12] underline-offset-2 transition-all duration-150 hover:text-accent/80 hover:decoration-accent/30"
              >
                {artist.bookingInfo.email}
              </a>
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
