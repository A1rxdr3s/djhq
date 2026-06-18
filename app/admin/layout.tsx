import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin — DJHQ",
  description: "DJHQ Business Control Center — Internal",
  robots: { index: false, follow: false },
}

// Admin uses explicit light-mode Tailwind classes throughout.
// The root layout's dark CSS variables are intentionally overridden.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 font-sans">{children}</div>
}
