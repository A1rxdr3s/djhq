import type { Metadata } from 'next'

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/images/set2go/set2go-favicon.ico', type: 'image/x-icon' }],
    apple: '/images/set2go/set2go-icon-180.png',
  },
}

export default function Set2GoLayout({ children }: { children: React.ReactNode }) {
  return children
}
