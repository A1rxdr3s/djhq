/**
 * Canonical platform → Lucide icon map for all social/music link platforms.
 *
 * Single source of truth used by every public renderer:
 *   - components/djhq/hero-social-links.tsx
 *   - components/djhq/profile-closing.tsx
 *   - app/[handle]/page.tsx
 *   - app/[handle]/presskit/page.tsx
 *
 * Keeping one registry prevents the icon maps from drifting out of sync
 * when new platforms are added.
 */
import {
  BarChart2,
  Calendar,
  Globe,
  Instagram,
  Link2,
  Music,
  Music2,
  Play,
  Radio,
  Ticket,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import type { SocialPlatform } from "@/types/djhq"

export const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  spotify:            Radio,
  beatport:           Music2,
  soundcloud:         Play,
  instagram:          Instagram,
  youtube:            Youtube,
  tiktok:             Music,
  "resident-advisor": Ticket,    // RA is an event/ticketing platform — visually distinct from Website
  bandsintown:        Calendar,
  songstats:          BarChart2,
  website:            Globe,
  other:              Link2,
}
