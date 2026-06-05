/**
 * Legacy route — /dashboard has been migrated to /hq.
 *
 * The next.config.mjs permanent redirect (308) handles this at the CDN/edge
 * layer before this file is ever reached. This server-side redirect is a
 * belt-and-suspenders fallback in case the config redirect is bypassed
 * (e.g. direct SSR render in certain deployment configurations).
 *
 * Query parameters (?section=, etc.) are forwarded by the config redirect;
 * this fallback redirects to /hq without preserving them, which is acceptable
 * since the config redirect fires first in all normal cases.
 */
import { redirect } from "next/navigation"

export default function DashboardLegacyPage() {
  redirect("/hq")
}
