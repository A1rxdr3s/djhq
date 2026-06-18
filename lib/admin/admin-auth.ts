// Platform admin access control
// TODO: replace email allowlist with a database role table or Supabase custom claims
// when multi-admin support is needed.

const FALLBACK_ADMIN_EMAILS = ["andres@tothebit.com"]

/**
 * Returns the list of platform admin emails.
 * Reads from DJHQ_PLATFORM_ADMIN_EMAILS env var (comma-separated) if set,
 * otherwise falls back to the hardcoded list (dev/bootstrap only).
 */
export function getAdminEmails(): string[] {
  const envValue = process.env.DJHQ_PLATFORM_ADMIN_EMAILS
  if (envValue) {
    return envValue
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  }
  return FALLBACK_ADMIN_EMAILS.map((e) => e.toLowerCase())
}

/**
 * Returns true if the given email is a platform admin.
 * Case-insensitive.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}
