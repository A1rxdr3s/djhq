import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { brand } from '@/lib/brand'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

// Geist Mono by Vercel — cleaner, more intentional than JetBrains for UI labels
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: brand.copy.metaTitle,
  description: brand.copy.metaDescription,
  keywords: [...brand.copy.metaKeywords],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0F14', // design token — not brand-driven
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        {/* Satoshi — geometric editorial sans by Indian Type Foundry via Fontshare.
            Used for display headings on the landing page (font-heading class).
            Loaded non-blocking: artist profile and dashboard routes are unaffected by
            Fontshare network latency. Landing page headings fall back to Inter until
            Satoshi arrives (FOUT is minimal; both fonts are geometric sans-serif). */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="preload"
          as="style"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap';document.head.appendChild(l)})();`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          />
        </noscript>
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
