import type { Release } from "@/types/djhq"

export type PlatformLink = {
  url: string
  badge: string
  name: string
  action: string
}

function detectPlatform(hostname: string): { badge: string; name: string; action: string } {
  if (/spotify/i.test(hostname)) return { badge: "SP", name: "Spotify", action: "Play" }
  if (/beatport/i.test(hostname)) return { badge: "BP", name: "Beatport", action: "Buy" }
  if (/apple/i.test(hostname)) return { badge: "AM", name: "Apple Music", action: "Play" }
  if (/soundcloud/i.test(hostname)) return { badge: "SC", name: "SoundCloud", action: "Play" }
  if (/youtube|youtu\.be/i.test(hostname)) return { badge: "YM", name: "YouTube Music", action: "Play" }
  if (/bandcamp/i.test(hostname)) return { badge: "BC", name: "Bandcamp", action: "Buy" }
  return { badge: "↗", name: "Other", action: "Open" }
}

export function getReleasePlatformLinks(release: Release): PlatformLink[] {
  const links: PlatformLink[] = []
  if (release.spotifyUrl) links.push({ url: release.spotifyUrl, badge: "SP", name: "Spotify", action: "Play" })
  if (release.beatportUrl) links.push({ url: release.beatportUrl, badge: "BP", name: "Beatport", action: "Buy" })
  if (release.appleMusicUrl) links.push({ url: release.appleMusicUrl, badge: "AM", name: "Apple Music", action: "Play" })
  if (release.soundcloudUrl) links.push({ url: release.soundcloudUrl, badge: "SC", name: "SoundCloud", action: "Play" })
  if (release.youtubeMusicUrl) links.push({ url: release.youtubeMusicUrl, badge: "YM", name: "YouTube Music", action: "Play" })
  if (release.bandcampUrl) links.push({ url: release.bandcampUrl, badge: "BC", name: "Bandcamp", action: "Buy" })
  if (release.otherUrl) links.push({ url: release.otherUrl, badge: "↗", name: "Other", action: "Open" })
  if (links.length > 0) return links

  if (release.platformUrl) {
    try {
      const { hostname } = new URL(release.platformUrl)
      links.push({ url: release.platformUrl, ...detectPlatform(hostname) })
    } catch {
      // invalid URL — skip
    }
  }

  return links
}
