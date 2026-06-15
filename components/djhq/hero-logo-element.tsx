import { cn } from "@/lib/utils"
import type { HeroLogoReadability, HeroLogoStyle } from "@/types/djhq"

type HeroLogoElementProps = {
  logoUrl: string
  artistName: string
  logoWidth: string
  heroLogoStyle?: HeroLogoStyle
  heroLogoReadability?: HeroLogoReadability
  offsetX?: number
  offsetY?: number
}

const BASE_FILTER = "sepia(0.10) drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))"

function computeLogoStyleProps(heroLogoStyle: HeroLogoStyle): React.CSSProperties {
  switch (heroLogoStyle) {
    case "soft":
      return {
        opacity: 0.90,
        filter: `${BASE_FILTER} drop-shadow(0 0 12px rgba(255,255,255,.12))`,
      }
    case "cinematic":
      return {
        opacity: 0.85,
        filter: `${BASE_FILTER} drop-shadow(0 0 18px rgba(255,255,255,.15))`,
        mixBlendMode: "screen",
      }
    default:
      return { opacity: 1, filter: BASE_FILTER }
  }
}

export function HeroLogoElement({
  logoUrl,
  artistName,
  logoWidth,
  heroLogoStyle = "solid",
  heroLogoReadability = "subtle",
  offsetX = 0,
  offsetY = 0,
}: HeroLogoElementProps) {
  const logoStyleProps = computeLogoStyleProps(heroLogoStyle)

  return (
    <div
      className="relative max-sm:!w-auto max-sm:max-w-[78vw]"
      style={{
        width: logoWidth,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
      }}
    >
      {/* Readability backing — radial gradient avoids hard edges; blur spreads organically */}
      {heroLogoReadability !== "none" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            heroLogoReadability === "strong"
              ? "scale-[1.45] blur-3xl opacity-[0.65]"
              : "scale-[1.35] blur-2xl opacity-[0.45]",
          )}
          style={{
            background: heroLogoReadability === "strong"
              ? "radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(0,0,0,0.20) 0%, transparent 70%)",
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={artistName}
        style={{ width: "100%", height: "auto", ...logoStyleProps }}
        className="relative object-contain max-sm:!w-auto max-sm:max-w-[78vw] max-sm:max-h-24"
      />
    </div>
  )
}
