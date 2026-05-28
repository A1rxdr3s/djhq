import { NextResponse } from "next/server"

const VALID_INITIALS = /^[A-Za-z0-9]{1,3}$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ initials: string }> },
) {
  const { initials } = await params
  const safe = VALID_INITIALS.test(initials) ? initials.toUpperCase() : "DJ"
  const fontSize = safe.length === 1 ? 32 : safe.length === 2 ? 26 : 20
  const yBaseline = safe.length === 1 ? 42 : safe.length === 2 ? 43 : 43

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#0a0a0a"/><text x="32" y="${yBaseline}" text-anchor="middle" font-family="system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="-0.5" fill="#ffffff">${safe}</text></svg>`

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
