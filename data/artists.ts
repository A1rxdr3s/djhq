export type SocialPlatform = "instagram" | "beatport" | "spotify" | "soundcloud" | "youtube"

export type ArtistProfile = {
  handle: string
  artistName: string
  genres: string[]
  location: string
  shortBio: string
  heroImage: string
  bookingEmail: string
  pressKitUrl: string
  socialLinks: {
    platform: SocialPlatform
    label: string
    url: string
  }[]
  featuredRelease: {
    title: string
    label: string
    year: string
    description: string
    url: string
  }
  latestReleases: {
    id: string
    title: string
    label: string
    year: string
    type: string
    url: string
  }[]
  upcomingGigs: {
    id: string
    date: string
    venue: string
    city: string
    billing: string
  }[]
  djSets: {
    id: string
    title: string
    platform: string
    duration: string
    url: string
  }[]
  photoGallery: {
    id: string
    src: string
    alt: string
    position: string
  }[]
}

export const artists: ArtistProfile[] = [
  {
    handle: "andresherrera",
    artistName: "ANDRES:HERRERA",
    genres: ["House", "Tech House", "Melodic Techno"],
    location: "Miami / Berlin",
    shortBio:
      "ANDRES:HERRERA builds dark, groove-led house and techno for peak-time rooms and late-night afterhours. His sets move between rolling percussion, hypnotic basslines, and melodic pressure, with recent releases supported by underground selectors across the US and Europe.",
    heroImage: "/images/dj-hero.jpg",
    bookingEmail: "booking@andresherrera.com",
    pressKitUrl: "mailto:booking@andresherrera.com?subject=ANDRES%3AHERRERA%20press%20kit%20request",
    socialLinks: [
      { platform: "beatport", label: "Beatport", url: "https://www.beatport.com/" },
      { platform: "spotify", label: "Spotify", url: "https://open.spotify.com/" },
      { platform: "soundcloud", label: "SoundCloud", url: "https://soundcloud.com/" },
      { platform: "youtube", label: "YouTube", url: "https://www.youtube.com/" },
      { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/" },
    ],
    featuredRelease: {
      title: "Midnight Protocol EP",
      label: "Drumcode",
      year: "2026",
      description:
        "A three-track club release built around low-slung percussion, pressure-heavy synth work, and a peak-hour title cut.",
      url: "https://www.beatport.com/",
    },
    latestReleases: [
      {
        id: "midnight-protocol",
        title: "Midnight Protocol EP",
        label: "Drumcode",
        year: "2026",
        type: "EP",
        url: "https://www.beatport.com/",
      },
      {
        id: "afterimage",
        title: "Afterimage",
        label: "Factory 93",
        year: "2025",
        type: "Single",
        url: "https://open.spotify.com/",
      },
      {
        id: "south-atlantic",
        title: "South Atlantic Drift",
        label: "Saved Records",
        year: "2025",
        type: "Single",
        url: "https://soundcloud.com/",
      },
    ],
    upcomingGigs: [
      {
        id: "space-miami",
        date: "Jun 14, 2026",
        venue: "Club Space",
        city: "Miami, FL",
        billing: "Terrace closing set",
      },
      {
        id: "fabric-london",
        date: "Jul 5, 2026",
        venue: "Fabric",
        city: "London, UK",
        billing: "Room 1 guest mix",
      },
      {
        id: "watergate-berlin",
        date: "Aug 22, 2026",
        venue: "Watergate",
        city: "Berlin, DE",
        billing: "Headline set",
      },
    ],
    djSets: [
      {
        id: "warehouse-hours-042",
        title: "Warehouse Hours 042",
        platform: "SoundCloud",
        duration: "68 min",
        url: "https://soundcloud.com/",
      },
      {
        id: "late-checkout-radio",
        title: "Late Checkout Radio",
        platform: "YouTube",
        duration: "54 min",
        url: "https://www.youtube.com/",
      },
    ],
    photoGallery: [
      {
        id: "press-photo-left",
        src: "/images/dj-hero.jpg",
        alt: "ANDRES:HERRERA performing in blue club lighting",
        position: "object-left",
      },
      {
        id: "press-photo-center",
        src: "/images/dj-hero.jpg",
        alt: "ANDRES:HERRERA behind the decks",
        position: "object-center",
      },
      {
        id: "press-photo-right",
        src: "/images/dj-hero.jpg",
        alt: "ANDRES:HERRERA live performance profile",
        position: "object-right",
      },
    ],
  },
]

export function getArtistByHandle(handle: string) {
  return artists.find((artist) => artist.handle === handle.toLowerCase())
}
