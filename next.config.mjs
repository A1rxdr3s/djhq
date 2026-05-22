/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sucumqowzrseehikqnev.supabase.co",
      },
    ],
  },
}

export default nextConfig
