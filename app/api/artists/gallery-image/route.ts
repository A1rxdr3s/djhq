import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const maxFileSizeBytes = 5 * 1024 * 1024
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])

type ArtistOwnershipRow = {
  id: string
  owner_user_id: string | null
}

type GallerySortOrderRow = {
  sort_order: number
}

type GalleryImageRow = {
  id: string
  image_url: string
  alt_text: string
  sort_order: number
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

function getDefaultAltText(fileName: string) {
  const sanitizedFileName = sanitizeFileName(fileName || "artist-gallery-image")
  return sanitizedFileName.replace(/\.(jpg|jpeg|png|webp)$/i, "").replace(/-/g, " ") || "Artist gallery image"
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
  const altText = formData.get("altText")

  if (typeof artistId !== "string" || !artistId.trim()) {
    return badRequest("Artist id is required.")
  }

  if (!(file instanceof File)) {
    return badRequest("Gallery image file is required.")
  }

  if (!allowedImageTypes.has(file.type)) {
    return badRequest("Only JPEG, PNG, and WEBP images are allowed.")
  }

  if (file.size > maxFileSizeBytes) {
    return badRequest("Gallery image must be 5MB or smaller.")
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
    const sanitizedOriginalName = sanitizeFileName(file.name || "gallery-image")
    const baseName = sanitizedOriginalName.replace(/\.(jpg|jpeg|png|webp)$/i, "") || "gallery-image"
    const timestamp = Date.now()
    const filePath = `artists/${artist.id}/gallery/${timestamp}-${baseName}.${extension}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from("artist-gallery").upload(filePath, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("artist-gallery").getPublicUrl(filePath)

    const { data: latestImage, error: latestImageError } = await supabase
      .from("gallery_images")
      .select("sort_order")
      .eq("artist_id", artist.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<GallerySortOrderRow>()

    if (latestImageError) {
      throw latestImageError
    }

    const nextSortOrder = (latestImage?.sort_order ?? 0) + 1
    const imageAltText =
      typeof altText === "string" && altText.trim() ? altText.trim() : getDefaultAltText(file.name)

    const { data: createdImage, error: createImageError } = await supabase
      .from("gallery_images")
      .insert({
        artist_id: artist.id,
        image_url: publicUrl,
        alt_text: imageAltText,
        sort_order: nextSortOrder,
      })
      .select("id, image_url, alt_text, sort_order")
      .single<GalleryImageRow>()

    if (createImageError) {
      throw createImageError
    }

    return NextResponse.json(
      {
        galleryImage: {
          id: createdImage.id,
          imageUrl: createdImage.image_url,
          altText: createdImage.alt_text,
          sortOrder: createdImage.sort_order,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload gallery image."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
