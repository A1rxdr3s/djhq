/**
 * Allowed subscription tiers for the DJHQ MVP.
 */
export type SubscriptionPlan = "free" | "pro"

/**
 * Performance type for DJ set entries.
 */
export type PerformanceType = "dj_set" | "live_set" | "vinyl_set" | "b2b" | "b3b" | "other"

/**
 * Visual blend style for the hero logo image.
 * Controls opacity, filter warmth, drop shadow, and optional blend mode.
 */
export type HeroLogoStyle = "solid" | "soft" | "cinematic"

/**
 * Contrast protection treatment applied behind the hero logo.
 * Keeps the mark readable against busy hero photography without adding a visible box.
 */
export type HeroLogoReadability = "none" | "subtle" | "strong"

/**
 * Atmospheric surface treatment behind the full hero content cluster.
 * Lifts text, logo, and CTA off busy photography without a visible panel.
 */
export type HeroContentSurface = "none" | "soft" | "strong"

/**
 * Controls where the hero logo is positioned in the hero composition.
 * "editorial" keeps it inside the content stack; other values float it as an independent layer.
 */
export type HeroLogoPlacement = "editorial" | "top_center" | "center" | "custom"

/**
 * Max-width constraint applied to the hero text content block.
 * Gives artists control over how much of the hero width the content occupies.
 */
export type HeroContentWidth = "compact" | "standard" | "wide"

/**
 * Curated accent color theme for the artist profile.
 * Controls the primary accent CSS variable used throughout the profile.
 */
export type ArtistAccentTheme = "matrix" | "electric_blue" | "signal_red"

/**
 * Hero logo position relative to artist name text.
 * Only applies when a logo is uploaded and identity mode includes logo.
 */
export type HeroLogoLayout =
  | "replace_text"
  | "above_text"
  | "below_text"
  | "left_text"
  | "right_text"

/**
 * Supported release formats.
 */
export type ReleaseType = "single" | "EP" | "album"

/**
 * Supported social/music platforms for artist links.
 */
export type SocialPlatform =
  | "beatport"
  | "spotify"
  | "soundcloud"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "resident-advisor"
  | "bandsintown"
  | "website"
  | "other"

/**
 * ISO-8601 date-time string.
 */
export type ISODateString = string

/**
 * Lifecycle status of a custom domain entry.
 */
export type CustomDomainStatus =
  | "pending"
  | "verifying"
  | "verified"
  | "active"
  | "error"
  | "suspended"
  | "removed"

/**
 * Formatted DNS record shown to the user (no raw token exposed).
 */
export interface DnsRecord {
  type: "TXT" | "CNAME" | "A"
  name: string
  value: string
}

/**
 * Custom domain linked to a Pro artist profile.
 */
export interface CustomDomain {
  /** Stable unique identifier. */
  id: string
  /** The fully-qualified domain name (e.g. "artistname.com"). */
  domain: string
  /** Current lifecycle status. */
  status: CustomDomainStatus
  /** Error detail when status is "error". */
  errorMessage?: string
  /** Timestamp when the domain was verified. */
  verifiedAt?: ISODateString
  /** Timestamp when the domain was added to Vercel. */
  addedToVercelAt?: ISODateString
  /** Timestamp when the domain was removed. */
  removedAt?: ISODateString
  /** Record creation timestamp. */
  createdAt: ISODateString
  /** Formatted TXT record the user must add to prove DNS ownership. */
  verificationRecord?: DnsRecord
  /** Routing record the user must add for traffic to reach DJHQ. */
  routingRecord?: DnsRecord
  /** Number of TXT verification attempts made. */
  verificationAttempts: number
  /** Timestamp of the last verification attempt. */
  lastVerificationAttemptAt?: ISODateString
  /** Whether the routing DNS (A/CNAME) currently points to Vercel. */
  routingDnsOk?: boolean
}

/**
 * Public social or music link displayed on the artist profile.
 */
export interface SocialLink {
  /** Platform identifier used for rendering and filtering. */
  platform: SocialPlatform
  /** Human-readable label shown in the UI. */
  label: string
  /** Absolute destination URL. */
  url: string
}

/**
 * A music release that can be featured or listed on the profile.
 */
export interface Release {
  /** Stable unique release identifier. */
  id: string
  /** Release title. */
  title: string
  /** Label, distributor, or self-release name. */
  label: string
  /** Official release date. */
  releaseDate: ISODateString
  /** Cover artwork image URL. */
  artworkUrl: string
  /** Primary platform URL for listening or purchase (legacy; still used for featured release and backward compat). */
  platformUrl: string
  /** Optional artist/collaborator credits line (e.g. "ANDRES:HERRERA, Seba Cortes"). */
  credits?: string
  /** Release format. */
  type: ReleaseType
  /** Optional Spotify URL. */
  spotifyUrl?: string
  /** Optional Beatport URL. */
  beatportUrl?: string
  /** Optional Apple Music URL. */
  appleMusicUrl?: string
  /** Optional SoundCloud URL. */
  soundcloudUrl?: string
  /** Optional YouTube Music URL. */
  youtubeMusicUrl?: string
  /** Optional Bandcamp URL. */
  bandcampUrl?: string
  /** Optional Traxsource URL. */
  traxsourceUrl?: string
  /** Optional other/generic URL. */
  otherUrl?: string
  /** Comprehensive release format: single | ep | album | compilation | va | other. */
  releaseType?: string
  /** Version or mix type key (snake_case, e.g. "extended_mix", "remix"). */
  versionType?: string
  /** Remixer artist name when versionType is "remix". */
  remixer?: string
  /** Whether this release is the featured (hero) release on the profile. */
  isFeatured?: boolean
}

/** Public-facing status of a live show. */
export type GigEventStatus = "upcoming" | "sold_out" | "cancelled" | "past"

/** Controls what the public profile displays for a booking. */
export type GigVisibilityStatus = "announced" | "tba" | "tbc" | "cancelled"

/**
 * Upcoming live performance information.
 */
export interface Gig {
  /** Stable unique gig identifier. */
  id: string
  /** Event date. */
  date: ISODateString
  /** Event or show name/brand (e.g. "Afterlife", "Boiler Room"). When set, displayed as the primary title. */
  eventName?: string
  /** Venue or club name (e.g. "Hï Ibiza", "Fabric"). Always the physical location. */
  venue: string
  /** Room or stage name within the venue (e.g. "Main Room", "Room 2"). */
  clubVenue?: string
  /** City of the event. */
  city: string
  /** ISO 3166-1 alpha-2 country code. */
  country: string
  /** Optional public-facing show status. Defaults to upcoming when absent. */
  eventStatus?: GigEventStatus
  /** Optional public ticket/event URL. */
  ticketUrl?: string
  /** Optional public flyer URL. */
  flyerUrl?: string
  /** Optional public Instagram event URL. */
  instagramUrl?: string
  /** Internal: negotiated fee amount (not shown publicly). */
  feeAmount?: number | null
  /** Internal: ISO currency code for the fee (e.g. "USD", "CLP"). */
  feeCurrency?: string | null
  /** Internal: booking payment status. */
  paymentStatus?: "pending" | "partial" | "paid" | "cancelled" | null
  /** Public visibility: announced = full details, tba/tbc/cancelled = date + location only. */
  visibilityStatus?: GigVisibilityStatus
}

/**
 * Recorded or broadcast DJ set shown on the profile.
 */
export interface DjSet {
  /** Stable unique identifier. */
  id: string
  /** Final display title — either titleOverride or the generated title stored by the API. */
  title: string
  /** Performance format. */
  performanceType: PerformanceType
  /** Artists involved (B2B/B3B may have 2–3+). */
  performanceArtists: string[]
  /** Custom type label when performanceType is "other". */
  customPerformanceType?: string
  /** Explicit title that overrides the generated one. */
  titleOverride?: string
  /** Physical venue or club name (e.g. "Fabric", "Watergate"). */
  venue?: string
  /** Event or party brand name (e.g. "MISA", "Boiler Room", "State of House"). */
  event?: string
  /** Recording or air date in ISO-8601 format. */
  setDate?: string
  /** City where the performance took place. */
  city?: string
  /** Optional cover/thumbnail image URL. */
  imageUrl?: string
  /** Platform URL (SoundCloud, YouTube, Mixcloud, RA, etc.). */
  platformUrl: string
  /** Display sort position. */
  sortOrder: number
  /** Whether the set is visible on the public profile. */
  isPublished: boolean
}

/**
 * Video shown on the public artist profile (YouTube/Vimeo performance content).
 */
export interface Video {
  /** Stable unique identifier. */
  id: string
  /** Stored title — used as fallback when structured fields are absent. */
  title: string
  /** Structured performance artists. When non-empty, the display title is generated. */
  videoArtists: string[]
  /** Event name for generated title (e.g. "ICE FEZTIVAL"). */
  videoEvent?: string
  /** Physical venue or club name. */
  venue?: string
  /** City of the performance. */
  videoCity?: string
  /** ISO 3166-1 alpha-2 country code. */
  videoCountry?: string
  /** Recording or event date in ISO-8601 format. */
  videoDate?: string
  /** Thumbnail image URL (auto-imported from platform). */
  thumbnailUrl?: string
  /** Custom thumbnail URL uploaded by the artist (Pro only). Overrides thumbnailUrl when present. */
  customThumbnailUrl?: string | null
  /** Platform URL (YouTube, Vimeo, etc.). */
  platformUrl: string
  /** Display sort position. */
  sortOrder: number
  /** Whether the video is visible on the public profile. */
  isPublished: boolean
}

/**
 * Press/gallery image metadata for profile previews.
 */
export interface GalleryImage {
  /** Stable unique image identifier. */
  id: string
  /** Public image URL. */
  imageUrl: string
  /** Accessible alternative text. */
  altText: string
  /** Sort order for deterministic rendering. */
  sortOrder: number
  /** Horizontal focal point (0–100, default 50). Used as object-position x in public renders. */
  focalX: number
  /** Vertical focal point (0–100, default 50). Used as object-position y in public renders. */
  focalY: number
}

/**
 * Supported streaming sources for a curated playlist.
 */
export type PlaylistSource = "spotify" | "soundcloud"

/**
 * Curated playlist the artist showcases on their profile.
 * MVP: one playlist per artist, rendered as a preview card.
 */
export interface Playlist {
  /** Display title of the playlist. */
  title: string
  /** Public URL to the playlist on the streaming platform. */
  url: string
  /** Source streaming platform. */
  source: PlaylistSource
  /** Optional playlist cover artwork URL. */
  artworkUrl?: string
}

/**
 * Artist booking contact details.
 */
export interface BookingInfo {
  /** Primary booking email. */
  email: string
  /** Optional external booking page URL. */
  bookingUrl?: string
  /** Optional short availability note. */
  availabilityText?: string
}

/**
 * Press kit availability and metadata.
 */
export interface PressKit {
  /** Whether the press kit is publicly available. */
  enabled: boolean
  /** Download or request URL for the press kit (legacy direct download). */
  downloadUrl: string
  /** List of assets included in the press kit. */
  assetsIncluded: string[]
  /** Root Google Drive / storage folder URL (optional, used as fallback link). */
  rootUrl?: string
  /** Google Drive folder URL for bio documents. */
  bioFolderUrl?: string
  /** Google Drive folder URL for logo and artwork assets. */
  logosFolderUrl?: string
  /** Google Drive folder URL for press/media photos. */
  mediaFolderUrl?: string
  /** Google Drive folder URL for technical rider. */
  riderFolderUrl?: string
  /** Direct URL for the English PDF press kit. */
  pdfEnUrl?: string
  /** Direct URL for the Spanish PDF press kit. */
  pdfEsUrl?: string
  /** Human-readable file size for the English PDF (e.g. "4.2 MB"). */
  pdfEnSize?: string
  /** Human-readable file size for the Spanish PDF (e.g. "3.8 MB"). */
  pdfEsSize?: string
  /** Whether to pull the press photo grid from the artist's gallery images. */
  useGalleryPhotos: boolean
  /** Artist-customizable URL for the Press Kit button on the public profile.
   *  When empty: /presskit on custom domains, /[handle]/presskit on djhq.co. */
  publicUrl?: string
}

/**
 * Supported categories for career timeline items.
 */
export type CareerTimelineCategory =
  | "residency"
  | "festival"
  | "club_show"
  | "international"
  | "release"
  | "press"
  | "chart"
  | "tour"
  | "other"

/**
 * A career milestone or achievement displayed on the artist's public profile.
 */
export interface CareerTimelineItem {
  /** Stable unique identifier. */
  id: string
  /** Milestone title (e.g. "Hï Ibiza Residency", "Boiler Room Berlin"). */
  title: string
  /** Category label used for display and filtering. */
  category: CareerTimelineCategory
  /** Event date in ISO-8601 format — year or full date shown publicly. */
  eventDate: string
  /** Optional location string (city, country, or venue). */
  location?: string
  /** Optional short editorial description. */
  description?: string
  /** Optional external link (event page, press coverage, etc.). */
  link?: string
  /** Optional image URL. Shown publicly when the item is published. */
  imageUrl?: string
  /**
   * HQ-only design preview image URL.
   * NEVER rendered on the public artist profile — used only within /hq
   * to evaluate how the card will look with imagery before a real image
   * is available. The public component intentionally omits this field.
   */
  previewImageUrl?: string
  /**
   * Whether this update is featured.
   * Featured items appear first in the public Career Updates grid,
   * before sort_order and event_date, regardless of other ordering.
   */
  isFeatured: boolean
  /** Whether this item is visible on the public profile. */
  isPublished: boolean
  /** Display sort position. Null means unset; sorted by event_date desc as fallback. */
  sortOrder: number | null
  /**
   * Editorial tile size for the public Career Updates mosaic.
   * Set via HQ — never inferred from milestone title or venue.
   * Null uses the component's positional fallback (sort order determines slot).
   *
   * hero    — wide horizontal anchor; the standout milestone of the section
   * tall    — vertical anchor; cinematic or foundational appearance
   * wide    — horizontal secondary; releases, archive moments
   * compact — smaller tile; concise metadata, high-density row
   */
  layoutSize?: 'hero' | 'tall' | 'wide' | 'compact' | null
  /**
   * Explicit slot assignment in the 12-column editorial mosaic.
   * Set via HQ — overrides positional fallback when present.
   * Conflicts (two items claiming the same slot) resolve by sort order; first wins.
   * Null falls back to positional assignment by source order.
   *
   * left-tall-story — 3-col × 6-row full-height left column anchor
   * hero            — 6-col × 2-row wide centre hero
   * right-top       — 3-col × 2-row top-right compact tile
   * compact-a       — 3-col × 2-row first centre compact
   * compact-b       — 3-col × 2-row second centre compact
   * right-bottom    — 3-col × 4-row tall bottom-right anchor
   * wide-bottom     — 6-col × 2-row bottom wide tile
   */
  storySlot?: 'left-tall-story' | 'hero' | 'right-top' | 'compact-a' | 'compact-b' | 'right-bottom' | 'wide-bottom' | null
  /**
   * Whether this item appears in the collapsed mosaic grid.
   * true (default) — candidate for the 8-slot grid.
   * false — bypasses the grid and goes directly to the "View all" archive.
   */
  showInCollapsed: boolean
}

/**
 * Editorial importance level for an artist story milestone.
 * Drives visual hierarchy in the public Artist Story section.
 * Set by the artist or HQ — never inferred from title or venue.
 */
export type MilestoneImportance = "featured" | "major" | "standard" | "minor"

/**
 * A milestone as it appears in the editorial Artist Story section.
 * Extends the basic career timeline with chapter assignment and importance rating,
 * enabling the Artist Story to be configured from the HQ dashboard.
 */
export interface ArtistStoryMilestone {
  id:          string
  year:        number
  category:    CareerTimelineCategory
  title:       string
  location?:   string
  description: string
  chapterId:   string
  importance:  MilestoneImportance
  isVisible:   boolean
  order?:      number
}

/**
 * A named chapter (column) in the Artist Story two-column layout.
 * Examples: "Current Arc" (recent international work), "Origin Arc" (historical roots).
 */
export interface ArtistStoryChapter {
  id:           string
  title:        string
  rangeLabel?:  string
  order:        number
}

/**
 * Core DJHQ artist profile aggregate for the MVP.
 */
export interface Artist {
  /** Stable unique artist identifier. */
  id: string
  /** Tenant/workspace identifier for multi-tenant isolation. */
  tenantId: string
  /** Owning user identifier for authorization boundaries. */
  ownerUserId: string
  /** Public profile handle used in route paths. */
  handle: string
  /** Public artist display name. */
  artistName: string
  /** Optional legal or real name. */
  realName?: string
  /** Optional short positioning line. */
  tagline?: string
  /** Editable hero subtitle — editorial branding line shown beneath the artist name. */
  heroTagline?: string
  /** Public genre tags. */
  genres: string[]
  /** Public location string. */
  location: string
  /** Short profile bio. */
  shortBio: string
  /** Hero image URL for the profile. */
  heroImageUrl: string
  /** Optional avatar image URL. */
  avatarUrl?: string
  /** Primary social/music links. */
  socialLinks: SocialLink[]
  /** All releases. The one with isFeatured = true is shown in the hero slot. */
  releases: Release[]
  /** Upcoming gigs for the profile. */
  upcomingGigs: Gig[]
  /** Recorded DJ sets shown on the profile. */
  djSets: DjSet[]
  /** Featured videos shown on the profile. */
  videos: Video[]
  /** Gallery preview images. */
  galleryImages: GalleryImage[]
  /** Optional curated playlist shown on the profile. Hidden when absent. */
  playlist?: Playlist
  /** Booking configuration and contact info. */
  bookingInfo: BookingInfo
  /** Press kit configuration. */
  pressKit: PressKit
  /** Current active subscription plan. */
  plan: SubscriptionPlan
  /** Custom domains linked to this profile (Pro only). */
  customDomains: CustomDomain[]
  /** Whether the profile is publicly visible. */
  isPublished: boolean
  /** Whether the DJHQ wordmark is shown in the profile header (Pro-only toggle; always true for free). */
  showHeaderBranding: boolean
  /** Custom browser tab title (Pro only). Falls back to artistName without the DJHQ suffix. */
  browserTitle?: string
  /** Custom favicon URL for browser tabs (Pro only). Falls back to auto-generated initials favicon. */
  faviconUrl?: string
  /** Custom hero logo URL (Pro only). Displayed based on heroIdentityMode. */
  heroLogoUrl?: string | null
  /** Hero identity display mode (Pro only). Controls whether text, logo, or both are shown. */
  heroIdentityMode?: "text" | "logo" | "both"
  /** Hero text typography style (Pro only). Affects artist name rendering when text is shown. */
  heroTextStyle?: "default" | "condensed" | "cinematic" | "editorial"
  /** Hero logo height in pixels (40–240, default 100). Pro only. */
  heroLogoScale?: number
  /** Hero logo position relative to artist name. Pro only. */
  heroLogoLayout?: HeroLogoLayout
  /** Horizontal alignment of the logo within the hero identity block. Pro only. */
  heroLogoAlignment?: "left" | "center" | "right"
  /** Horizontal offset applied via CSS transform (px, -100 to +100). Pro only. */
  heroLogoOffsetX?: number
  /** Vertical offset applied via CSS transform (px, -100 to +100). Pro only. */
  heroLogoOffsetY?: number
  /** Visual blend style for the uploaded hero logo. Pro only. */
  heroLogoStyle?: HeroLogoStyle
  /** Contrast-protection treatment behind the hero logo. Pro only. */
  heroLogoReadability?: HeroLogoReadability
  /** Atmospheric surface treatment behind the full hero content cluster. Pro only. */
  heroContentSurface?: HeroContentSurface
  /** Logo placement mode — editorial (content flow) or floating (independent layer). Pro only. */
  heroLogoPlacement?: HeroLogoPlacement
  /** Max-width of the hero text content block. Pro only. */
  heroContentWidth?: HeroContentWidth
  /** Curated accent color theme. Pro only. */
  accentTheme?: ArtistAccentTheme
  /** Footer branding — artist-configurable identity shown in the site footer. */
  footerLogoUrl?: string | null
  footerLogoMode?: "auto" | "light" | "dark"
  footerLogoWidth?: number
  footerBookingEmail?: string | null
  footerNewsletterEnabled?: boolean
  footerSocialsEnabled?: boolean
  footerContactEmail?: string | null
  footerDemosEmail?: string | null
  footerCopyright?: string | null
  /** Career milestones shown in the editorial career story section. */
  careerTimeline?: CareerTimelineItem[]
  /** Record creation timestamp. */
  createdAt: ISODateString
  /** Record last update timestamp. */
  updatedAt: ISODateString
}
