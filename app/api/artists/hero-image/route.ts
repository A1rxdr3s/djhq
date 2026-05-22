import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const maxFileSizeBytes = 5 * 1024 * 1024
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])

type ArtistOwnershipRow = {
  id: string
  owner_user_id: string | null
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function sanitizeFileName(fileName: string) {
  const baseName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
  return baseName.replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

function resolveImageExtension(fileName: string, mimeType: string) {
  const nameExtension = fileName.split(".").pop()?.toLowerCase()

  if (nameExtension === "jpg" || nameExtension === "jpeg") {
    return "jpg"
  }

  if (nameExtension === "png" || nameExtension === "webp") {
    return nameExtension
  }

  if (mimeType === "image/png") {
    return "png"
  }

  if (mimeType === "image/webp") {
    return "webp"
  }

  return "jpg"
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return badRequest("Invalid form data payload.")
  }

  const artistId = formData.get("artistId")
  const file = formData.get("file")

  if (typeof artistId !== "string" || !artistId.trim()) {
    return badRequest("Artist id is required.")
  }

  if (!(file instanceof File)) {
    return badRequest("Hero image file is required.")
  }

  if (!allowedImageTypes.has(file.type)) {
    return badRequest("Only JPEG, PNG, and WEBP images are allowed.")
  }

  if (file.size > maxFileSizeBytes) {
    return badRequest("Hero image must be 5MB or smaller.")
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) {
      throw artistError
    }

    if (!artist) {
      return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    }

    if (artist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    }

    const extension = resolveImageExtension(file.name, file.type)
    const sanitizedOriginalName = sanitizeFileName(file.name || "hero-image")
    const baseName = sanitizedOriginalName.replace(/\.(jpg|jpeg|png|webp)$/i, "") || "hero-image"
    const timestamp = Date.now()
    const filePath = `artists/${artist.id}/hero/${timestamp}-${baseName}.${extension}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from("artist-heroes").upload(filePath, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("artist-heroes").getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from("artists")
      .update({ hero_image_url: publicUrl })
      .eq("id", artist.id)
      .eq("owner_user_id", user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ heroImageUrl: publicUrl }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload hero image."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
