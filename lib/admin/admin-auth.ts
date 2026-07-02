// Platform admin access control
// TODO: replace email allowlist with a database role table or Supabase custom claims
// when multi-admin support is needed.

/**
 * Returns the list of platform admin emails from DJHQ_PLATFORM_ADMIN_EMAILS (comma-separated).
 * Returns an empty list if the env var is not set — admin access is then denied to everyone.
 */
export function getAdminEmails(): string[] {
  const envValue = process.env.DJHQ_PLATFORM_ADMIN_EMAILS
  if (!envValue) return []
  return envValue
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Returns true if the given email is a platform admin.
 * Case-insensitive.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}
