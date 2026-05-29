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
}

/**
 * Upcoming live performance information.
 */
export interface Gig {
  /** Stable unique gig identifier. */
  id: string
  /** Event date. */
  date: ISODateString
  /** Venue or event name. */
  venue: string
  /** City of the event. */
  city: string
  /** Country of the event. */
  country: string
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
  /** Video title (e.g. "Live at Fabric" or "Aftermovie – Watergate Berlin"). */
  title: string
  /** Venue or event name. */
  venue?: string
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
  /** Download or request URL for the press kit. */
  downloadUrl: string
  /** List of assets included in the press kit. */
  assetsIncluded: string[]
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
  /** Optional featured release. */
  featuredRelease?: Release
  /** Catalog releases shown in the Selected Releases section. */
  selectedReleases: Release[]
  /** Upcoming gigs for the profile. */
  upcomingGigs: Gig[]
  /** Recorded DJ sets shown on the profile. */
  djSets: DjSet[]
  /** Featured videos shown on the profile. */
  videos: Video[]
  /** Gallery preview images. */
  galleryImages: GalleryImage[]
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
  /** Record creation timestamp. */
  createdAt: ISODateString
  /** Record last update timestamp. */
  updatedAt: ISODateString
}
