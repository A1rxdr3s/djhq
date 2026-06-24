'use client'
import Image from 'next/image'

interface StoryImageProps {
  src: string
  alt: string
  objectFit?: 'cover' | 'contain'
  positionX?: number
  positionY?: number
  zoom?: number
  fill?: boolean
  unoptimized?: boolean
  sizes?: string
  className?: string
  onError?: () => void
}

export function StoryImage({
  src,
  alt,
  objectFit = 'cover',
  positionX = 50,
  positionY = 50,
  zoom = 1,
  fill,
  unoptimized,
  sizes,
  className,
  onError,
}: StoryImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      unoptimized={unoptimized}
      sizes={sizes}
      className={className}
      style={{
        objectFit,
        objectPosition: `${positionX}% ${positionY}%`,
        ...(zoom !== 1
          ? { transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` }
          : {}),
      }}
      onError={onError}
    />
  )
}
