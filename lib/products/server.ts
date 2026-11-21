import 'server-only'
import { isAdminEmail } from '@/lib/admin/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveProductAccess } from './access'

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  return error ? null : data.user
}

export async function ownsWebsite(userId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('artists')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export function accessForUser(user: { id: string; email?: string | null }, ownsArtist: boolean) {
  return resolveProductAccess({
    userId: user.id,
    platformAdmin: isAdminEmail(user.email),
    ownsWebsite: ownsArtist,
    development: process.env.NODE_ENV === 'development',
    privateTesting: process.env.SET2GO_PRIVATE_TESTING === 'enabled',
    set2goDeveloperId: process.env.SET2GO_DEV_CLOUD_USER_ID,
  })
}

export async function getWorkspaceAccess() {
  const user = await getAuthenticatedUser()
  if (!user) return null
  return { user, access: accessForUser(user, await ownsWebsite(user.id)) }
}

export async function canUseSet2Go() {
  const user = await getAuthenticatedUser()
  return !!user && accessForUser(user, false).set2go
}
