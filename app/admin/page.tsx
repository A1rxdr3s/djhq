// TODO: enforce platform admin role — check Supabase session and admin flag
// TODO: redirect non-admin users: redirect("/sign-in")
// TODO: connect real data queries to replace mock data

import { AdminClient } from "@/components/admin/admin-client"

export default function AdminPage() {
  return <AdminClient />
}
