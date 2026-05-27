// All Vercel domain API communication isolated here — never import from client code.
// Requires VERCEL_API_TOKEN and VERCEL_PROJECT_ID (server-only, no NEXT_PUBLIC_ prefix).

type AddDomainResult =
  | { ok: true; domain: string; verification?: unknown }
  | { ok: false; error: string }

export async function addDomainToVercel(domain: string): Promise<AddDomainResult> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return { ok: false, error: "Vercel API is not configured." }
  }

  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/domains`)
  if (teamId) url.searchParams.set("teamId", teamId)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error reaching Vercel API."
    return { ok: false, error: message }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, error: `Vercel API returned non-JSON response (HTTP ${res.status}).` }
  }

  if (res.ok) {
    const body = json as { name?: string; verification?: unknown }
    return { ok: true, domain: body.name ?? domain, verification: body.verification }
  }

  // 409: domain already exists in the project — treat as success
  if (res.status === 409) {
    return { ok: true, domain }
  }

  const body = json as { error?: { message?: string } | string }
  const errorMsg =
    typeof body?.error === "object" && body.error !== null
      ? (body.error.message ?? "Unknown Vercel API error.")
      : typeof body?.error === "string"
        ? body.error
        : `Vercel API error (HTTP ${res.status}).`

  return { ok: false, error: errorMsg }
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) return

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`)
  if (teamId) url.searchParams.set("teamId", teamId)

  try {
    await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // Best-effort — never throw, never block the caller
  }
}
