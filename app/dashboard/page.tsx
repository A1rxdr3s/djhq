import { redirect } from "next/navigation"
import DashboardClient from "./dashboard-client"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  return <DashboardClient />
}
