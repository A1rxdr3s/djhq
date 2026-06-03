export const djhqBrand = {
  name: "DJHQ",
  domain: "djhq.com",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.com",

  supportEmail: "hello@djhq.com",
  contactEmail: "access@djhq.co",
  bookingFromEmail: "DJHQ Booking <bookings@djhq.app>",

  copy: {
    poweredBy: "Powered by DJHQ",
    metaTitle: "DJHQ — Professional Presence for Electronic Music Artists",
    metaDescription:
      "One professional destination for your DJ career. Press kit, artist profile, shows, releases and booking contact — one URL.",
    metaKeywords: [
      "DJ",
      "producer",
      "electronic music",
      "press kit",
      "booking",
      "artist profile",
      "music industry",
    ],
    heroLabel: "For electronic music artists",
    heroSubheading:
      "DJHQ gives you one professional destination — press kit, profile, shows, releases and booking contact. Everything a promoter needs. One URL.",
  },
} as const

export type BrandConfig = typeof djhqBrand
