import { SOCIAL_ICONS } from "@/lib/social-icons"
import { resolveSafeHref } from "@/lib/safe-url"
import type { SocialLink } from "@/types/djhq"

/** Desktop hero social row — all configured links, wraps gracefully if needed. */
export function HeroSocialLinks({ links }: { links: SocialLink[] }) {
  const items = links.flatMap((link) => {
    const href = resolveSafeHref(link.url)
    if (!href) return []
    const Icon = SOCIAL_ICONS[link.platform]
    if (!Icon) return []
    return [{ link, href, Icon }]
  })

  if (items.length === 0) return null

  return (
    <div className="hidden flex-wrap items-center justify-center gap-x-6 gap-y-4 md:flex">
      {items.map(({ link, href, Icon }) => (
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
      ))}
    </div>
  )
}

/** Mobile hero social dock — all active links, wraps centered if needed. */
export function HeroMobileSocialRow({ links }: { links: SocialLink[] }) {
  const items = links.flatMap((link) => {
    const href = resolveSafeHref(link.url)
    if (!href) return []
    const Icon = SOCIAL_ICONS[link.platform]
    if (!Icon) return []
    return [{ link, href, Icon }]
  })

  if (items.length === 0) return null

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:hidden">
      {items.map(({ link, href, Icon }) => (
        <a
          key={link.platform}
          href={href}
          aria-label={link.label}
          title={link.label}
          target="_blank"
          rel="noopener noreferrer"
          className="-m-2 p-2 text-white/80 transition-colors duration-200 hover:text-white focus:text-white"
        >
          <Icon className="h-[18px] w-[18px]" />
        </a>
      ))}
    </div>
  )
}
