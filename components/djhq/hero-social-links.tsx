import {
  Calendar,
  Globe,
  Instagram,
  Music,
  Music2,
  Play,
  Radio,
  Link2,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { resolveSafeHref } from "@/lib/safe-url"
import type { SocialLink, SocialPlatform } from "@/types/djhq"

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram:          Instagram,
  beatport:           Music2,
  spotify:            Radio,
  soundcloud:         Play,
  youtube:            Youtube,
  tiktok:             Music,
  "resident-advisor": Globe,
  bandsintown:        Calendar,
  website:            Globe,
  other:              Link2,
}

/** Desktop header — up to 5 icons, hidden below 768 px (md). */
export function HeroSocialLinks({ links }: { links: SocialLink[] }) {
  return (
    <div className="hidden items-center gap-7 md:flex">
      {links.slice(0, 5).map((link) => {
        const href = resolveSafeHref(link.url)
        if (!href) return null
        const Icon = SOCIAL_ICONS[link.platform]
        return (
          <a
            key={link.platform}
            href={href}
            aria-label={link.label}
            title={link.label}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/75 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-accent"
          >
            <Icon className="h-[26px] w-[26px]" />
          </a>
        )
      })}
    </div>
  )
}

/** Mobile hero social dock — glass pill, all active links, hidden on md and above. */
export function HeroMobileSocialRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="mt-[22px] flex justify-center md:hidden">
      <div
        className="flex h-[52px] w-[85vw] max-w-[360px] items-center justify-between overflow-hidden rounded-full border border-white/[0.12] px-6 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.22)" }}
      >
        {links.map((link) => {
          const href = resolveSafeHref(link.url)
          if (!href) return null
          const Icon = SOCIAL_ICONS[link.platform]
          return (
            <a
              key={link.platform}
              href={href}
              aria-label={link.label}
              title={link.label}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-white opacity-[0.78] transition-opacity duration-200 hover:opacity-100 focus:opacity-100"
            >
              <Icon className="h-[21px] w-[21px]" />
            </a>
          )
        })}
      </div>
    </div>
  )
}
