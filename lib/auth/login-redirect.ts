export function sanitizeNextDestination(raw?: string | string[]): string | undefined {
  if (typeof raw !== 'string') return undefined
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) {
    return undefined
  }
  try {
    const parsed = new URL(raw, 'https://djhq.app')
    if (parsed.origin !== 'https://djhq.app') return undefined
  } catch {
    return undefined
  }
  return raw
}

export function resolveLoginRedirect(rawNext?: string | string[]): string {
  const safeNext = sanitizeNextDestination(rawNext)
  if (!safeNext) return '/sign-in'
  return `/sign-in?${new URLSearchParams({ next: safeNext }).toString()}`
}
