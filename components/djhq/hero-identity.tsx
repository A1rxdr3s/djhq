import { cn } from "@/lib/utils"
import type { HeroLogoLayout, HeroLogoStyle } from "@/types/djhq"

type HeroIdentityProps = {
  artistName: string
  heroLogoUrl?: string | null
  heroIdentityMode?: "text" | "logo" | "both"
  heroTextStyle?: "default" | "condensed" | "cinematic" | "editorial"
  heroLogoScale?: number
  heroLogoLayout?: HeroLogoLayout
  heroLogoAlignment?: "left" | "center" | "right"
  heroLogoOffsetX?: number
  heroLogoOffsetY?: number
  heroLogoStyle?: HeroLogoStyle
  isPro?: boolean
  // Only affects the name element tag for semantic HTML (h1 in public, p in preview).
  // All visual output — logo size, typography, spacing, alignment — is identical.
  isPreview?: boolean
}

export function HeroIdentity({
  artistName,
  heroLogoUrl,
  heroIdentityMode = "text",
  heroTextStyle = "default",
  heroLogoScale = 100,
  heroLogoLayout = "replace_text",
  heroLogoAlignment = "left",
  heroLogoOffsetX = 0,
  heroLogoOffsetY = 0,
  heroLogoStyle = "solid",
  isPro = false,
  isPreview = false,
}: HeroIdentityProps) {
  const effectiveMode = (() => {
    if (!isPro) return "text"
    const hasLogo = !!heroLogoUrl?.trim()
    if (heroIdentityMode === "logo" && hasLogo) return "logo"
    if (heroIdentityMode === "both" && hasLogo) return "both"
    return "text"
  })() as "text" | "logo" | "both"

  const showLogo = effectiveMode === "logo" || effectiveMode === "both"
  const showText =
    effectiveMode === "text" ||
    effectiveMode === "both" ||
    (effectiveMode === "logo" && heroLogoLayout !== "replace_text")

  if (!showLogo && !showText) return null

  // Alignment: applied via items-* on the flex column wrapper so children align
  // within the full-width content block regardless of their own intrinsic width.
  const alignItems =
    heroLogoAlignment === "center"
      ? "items-center"
      : heroLogoAlignment === "right"
        ? "items-end"
        : "items-start"

  // Logo width and typography are identical in both preview and public contexts.
  // The preview achieves its smaller visual size via CSS scale on the container.
  const logoWidth = `min(80vw, ${Math.min(heroLogoScale * 3, 720)}px)`

  const nameClasses = (() => {
    switch (heroTextStyle) {
      case "condensed":
        return "max-w-full text-[clamp(2rem,8.5vw,3.2rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-foreground drop-shadow-2xl sm:text-[clamp(2.8rem,6.8vw,4.6rem)] sm:leading-[0.86] lg:max-w-none lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap lg:text-[clamp(3.6rem,5.2vw,5.8rem)]"
      case "cinematic":
        return "max-w-full text-[clamp(1.6rem,7vw,2.5rem)] font-bold uppercase leading-[1.02] tracking-[0.06em] text-foreground/95 drop-shadow-2xl sm:text-[clamp(2.2rem,5.5vw,3.6rem)] sm:leading-[1.0] lg:max-w-2xl lg:text-[clamp(2.8rem,4.2vw,4.4rem)]"
      case "editorial":
        return "max-w-full text-[clamp(1.75rem,7.5vw,2.75rem)] font-extrabold leading-[0.96] tracking-[-0.01em] text-foreground drop-shadow-2xl sm:text-[clamp(2.4rem,6vw,3.8rem)] sm:leading-[0.94] lg:max-w-2xl lg:text-[clamp(3rem,4.6vw,5rem)]"
      default:
        return "max-w-full text-[clamp(1.85rem,7.8vw,2.85rem)] font-black uppercase leading-[0.94] tracking-[-0.02em] text-foreground drop-shadow-2xl sm:text-[clamp(2.5rem,6.2vw,4rem)] sm:leading-[0.92] lg:max-w-none lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap lg:text-[clamp(3.25rem,4.8vw,5.25rem)]"
    }
  })()

  // Base drop-shadow preserved across all styles (equivalent to drop-shadow-2xl).
  // Sepia(0.10) shifts pure digital white toward a warmer #F7F4EE tone.
  const baseFilter = "sepia(0.10) drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))"

  const logoStyleProps = ((): React.CSSProperties => {
    switch (heroLogoStyle) {
      case "soft":
        return {
          opacity: 0.90,
          filter: `${baseFilter} drop-shadow(0 0 12px rgba(255,255,255,.12))`,
        }
      case "cinematic":
        return {
          opacity: 0.85,
          filter: `${baseFilter} drop-shadow(0 0 18px rgba(255,255,255,.15))`,
          mixBlendMode: "screen",
        }
      default: // solid
        return { opacity: 1, filter: baseFilter }
    }
  })()

  const logoEl = showLogo && heroLogoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={heroLogoUrl}
      alt={artistName}
      style={{
        width: logoWidth,
        height: "auto",
        transform: `translate(${heroLogoOffsetX}px, ${heroLogoOffsetY}px)`,
        ...logoStyleProps,
      }}
      className="object-contain"
    />
  ) : null

  // isPreview only controls semantic tag; visual output is identical.
  const nameEl = showText
    ? (isPreview
        ? <p className={nameClasses}>{artistName}</p>
        : <h1 className={nameClasses}>{artistName}</h1>)
    : null

  // Outer wrapper: flex column with alignment. mb-3 provides spacing before
  // the tagline in both public and preview (preview container uses same padding).
  const base = "mb-3 w-full flex flex-col"

  // Logo only
  if (logoEl && !nameEl) {
    return <div className={cn(base, alignItems)}>{logoEl}</div>
  }

  // Text only — logo alignment does not apply
  if (!logoEl && nameEl) {
    return <div className="mb-3">{nameEl}</div>
  }

  // Both logo and name
  switch (heroLogoLayout) {
    case "below_text":
      return (
        <div className={cn(base, "gap-3", alignItems)}>
          {nameEl}
          {logoEl}
        </div>
      )
    case "left_text":
      return (
        <div className={cn(base, alignItems)}>
          <div className="flex flex-row flex-wrap items-end gap-5">{logoEl}{nameEl}</div>
        </div>
      )
    case "right_text":
      return (
        <div className={cn(base, alignItems)}>
          <div className="flex flex-row flex-wrap items-end gap-5">{nameEl}{logoEl}</div>
        </div>
      )
    default: // above_text, replace_text (logo above name when both shown)
      return (
        <div className={cn(base, "gap-3", alignItems)}>
          {logoEl}
          {nameEl}
        </div>
      )
  }
}
