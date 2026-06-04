export const djhqBrand = {
  name: "DJHQ",
  domain: "djhq.com",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.com",

  supportEmail: "hello@djhq.com",
  contactEmail: "access@djhq.co",
  bookingFromEmail: "DJHQ Booking <bookings@djhq.app>",

  copy: {
    poweredBy: "Powered by DJHQ",
    metaTitle: "DJHQ — Your Professional Presence as a DJ, Ready Today",
    metaDescription:
      "One URL for your profile, press kit, shows, releases and booking contact. Built for DJs and electronic music artists who take their career seriously.",
    metaKeywords: [
      "DJ",
      "producer",
      "electronic music",
      "press kit",
      "booking",
      "artist profile",
      "music industry",
    ],
    heroLabel: "For DJs & electronic music artists",
    heroSubheading:
      "One URL for your profile, press kit, shows, releases and booking contact. Built for artists who take their career seriously.",
  },
} as const

export type BrandConfig = typeof djhqBrand
