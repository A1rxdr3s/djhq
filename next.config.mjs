/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sucumqowzrseehikqnev.supabase.co",
      },
      {
        protocol: "https",
        hostname: "image-cdn-ak.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "**.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing — stops browsers treating JS as HTML etc.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Block embedding DJHQ pages in third-party iframes (clickjacking guard).
          // Artist custom domains served via middleware rewrite will inherit this.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Don't send full Referer URL to third parties — protects handle/path privacy.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Minimal permissions policy — no camera, mic, geolocation or payment access.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // TODO: Content-Security-Policy — deferred until inline script audit is complete.
          // Requires: allowlisting Supabase storage, YouTube embeds, Spotify CDN, Vercel Analytics.
          // Recommended starting point:
          //   default-src 'self'; img-src 'self' *.supabase.co *.spotifycdn.com i.scdn.co
          //     img.youtube.com *.googleusercontent.com data:;
          //   script-src 'self' 'unsafe-inline' va.vercel-scripts.com;
          //   connect-src 'self' *.supabase.co *.resend.com va.vercel-scripts.com;
          //   frame-src youtube.com www.youtube.com soundcloud.com;
          //   font-src 'self' fonts.gstatic.com;
          //   style-src 'self' 'unsafe-inline' fonts.googleapis.com;
        ],
      },
    ]
  },
}

export default nextConfig
