import type { Metadata } from "next"

// TODO: enforce platform admin role before rendering
// TODO: connect to Supabase auth and verify admin session

export const metadata: Metadata = {
  title: "Admin — DJHQ",
  description: "DJHQ Business Control Center",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
