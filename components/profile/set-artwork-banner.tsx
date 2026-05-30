"use client"

import { useState } from "react"
import { Play } from "lucide-react"

type Props = {
  src: string
  alt: string
  className?: string
}

export function SetArtworkBanner({ src, alt, className = "" }: Props) {
  const [isPortrait, setIsPortrait] = useState(false)

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setIsPortrait(img.naturalHeight > img.naturalWidth)
  }

  if (isPortrait) {
    return (
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-[24px] bg-black shadow-md shadow-black/30 ${className}`}
        style={{ maxHeight: 360 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block max-h-[360px] w-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          onLoad={handleLoad}
        />
        <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>
    )
  }

  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-secondary shadow-md shadow-black/30 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
        onLoad={handleLoad}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
    </div>
  )
}

type PlaceholderProps = {
  className?: string
}

export function SetArtworkPlaceholder({ className = "" }: PlaceholderProps) {
  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-secondary shadow-md shadow-black/30 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
        <Play className="h-10 w-10 text-accent/70" />
      </div>
    </div>
  )
}
