import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isSoundCloudUrl, importSoundCloudSetMetadata } from "@/lib/release-metadata/soundcloud"

type DjSetImportPayload = {
  url?: string
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: DjSetImportPayload

  try {
    payload = (await request.json()) as DjSetImportPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  if (!payload.url?.trim()) {
    return badRequest("DJ set URL is required.")
  }

  let setUrl: URL

  try {
    setUrl = new URL(payload.url)
  } catch {
    return badRequest("A valid DJ set URL is required.")
  }

  if (setUrl.protocol !== "https:") {
    return badRequest("Only HTTPS URLs are supported.")
  }

  if (!isSoundCloudUrl(setUrl)) {
    return badRequest("Only SoundCloud URLs are supported for DJ set import.")
  }

  try {
    return NextResponse.json(await importSoundCloudSetMetadata(setUrl))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import DJ set metadata."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
