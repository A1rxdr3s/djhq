import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

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
  focal_x: number
  focal_y: number
  moments_placement: string | null
  artist_id?: string
}

const VALID_MOMENTS_PLACEMENTS = new Set(["auto", "large", "top", "bottom", "hidden"])

function normalizeMomentsPlacement(val: unknown): string | null {
  if (typeof val !== "string" || !val) return null
  return VALID_MOMENTS_PLACEMENTS.has(val) ? val : null
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

// Only these source extensions are accepted from the client.
const ALLOWED_INPUT_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"])
// Enforces: artists/{uuid}/gallery/{13-digit-timestamp}-{sanitized-name}.webp
const GALLERY_PATH_RE = /^artists\/[0-9a-f-]{36}\/gallery\/\d{13}-[a-z0-9._-]+\.webp$/i

function sanitizeFileName(fileName: string) {
  const baseName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
  return baseName.replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

function getDefaultAltText(fileName: string) {
  const sanitizedFileName = sanitizeFileName(fileName || "artist-gallery-image")
  return sanitizedFileName.replace(/\.(jpg|jpeg|png|webp)$/i, "").replace(/-/g, " ") || "Artist gallery image"
}

function getStoragePathFromImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl)
    const publicPrefix = "/storage/v1/object/public/artist-gallery/"

    if (!url.pathname.startsWith(publicPrefix)) {
      return null
    }

    const objectPath = decodeURIComponent(url.pathname.slice(publicPrefix.length))
    return objectPath || null
  } catch {
    return null
  }
}

// GET /api/artists/gallery-image?artistId=...&fileName=...
// Returns a signed upload URL. The client uploads the compressed image blob directly
// to Supabase Storage using this URL — the file never passes through a Vercel function.
export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  const fileName = searchParams.get("fileName")?.trim()

  if (!artistId) {
    return badRequest("artistId is required.")
  }

  if (!fileName) {
    return badRequest("fileName is required.")
  }

  // Validate the input file extension before generating a signed upload URL.
  const inputExt = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_INPUT_EXTENSIONS.has(inputExt)) {
    return badRequest("Only jpg, jpeg, png, and webp files are accepted.")
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) throw artistError

    if (!artist) {
      return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    }

    if (artist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    }

    const sanitized = sanitizeFileName(fileName)
    const baseName = sanitized.replace(/\.(jpg|jpeg|png|webp)$/i, "") || "gallery-image"
    const timestamp = Date.now()
    // Always .webp — client compresses to WebP before upload.
    const filePath = `artists/${artist.id}/gallery/${timestamp}-${baseName}.webp`

    const { data: signedData, error: signedError } = await supabase.storage
      .from("artist-gallery")
      .createSignedUploadUrl(filePath)

    if (signedError) throw signedError

    return NextResponse.json({ signedUrl: signedData.signedUrl, token: signedData.token, filePath })
  } catch (error) {
    console.error("[gallery-image GET]", error)
    return NextResponse.json({ error: "Unable to generate upload URL." }, { status: 500 })
  }
}

// POST /api/artists/gallery-image
// Accepts JSON { artistId, filePath, altText } after the client has already uploaded
// the image blob directly to Supabase Storage. Registers the new row in gallery_images.
type RegisterGalleryImagePayload = {
  artistId?: string
  filePath?: string
  altText?: string
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: RegisterGalleryImagePayload

  try {
    payload = (await request.json()) as RegisterGalleryImagePayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  const artistId = payload.artistId?.trim()
  const filePath = payload.filePath?.trim()
  const altText = payload.altText?.trim()

  if (!artistId) {
    return badRequest("Artist id is required.")
  }

  if (!filePath) {
    return badRequest("filePath is required.")
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) throw artistError

    if (!artist) {
      return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    }

    if (artist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    }

    // Validate path format and ownership. Reject arbitrary storage paths.
    const expectedPrefix = `artists/${artist.id}/gallery/`
    if (!filePath.startsWith(expectedPrefix) || !GALLERY_PATH_RE.test(filePath)) {
      return badRequest("Invalid file path.")
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

    if (latestImageError) throw latestImageError

    const nextSortOrder = (latestImage?.sort_order ?? 0) + 1
    const imageAltText = altText || getDefaultAltText(filePath.split("/").pop() ?? "gallery-image")

    const { data: createdImage, error: createImageError } = await supabase
      .from("gallery_images")
      .insert({
        artist_id: artist.id,
        image_url: publicUrl,
        alt_text: imageAltText,
        sort_order: nextSortOrder,
        focal_x: 50,
        focal_y: 50,
      })
      .select("id, image_url, alt_text, sort_order, focal_x, focal_y, moments_placement")
      .single<GalleryImageRow>()

    if (createImageError) throw createImageError

    return NextResponse.json(
      {
        galleryImage: {
          id: createdImage.id,
          imageUrl: createdImage.image_url,
          altText: createdImage.alt_text,
          sortOrder: createdImage.sort_order,
          focalX: createdImage.focal_x,
          focalY: createdImage.focal_y,
          momentsPlacement: normalizeMomentsPlacement(createdImage.moments_placement),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[gallery-image POST]", error)
    return NextResponse.json({ error: "Unable to register gallery image." }, { status: 500 })
  }
}

type DeleteGalleryImagePayload = {
  artistId?: string
  galleryImageId?: string
}

type ReorderGalleryImagesPayload = {
  artistId?: string
  orderedImageIds?: string[]
}

export async function DELETE(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let payload: DeleteGalleryImagePayload

  try {
    payload = (await request.json()) as DeleteGalleryImagePayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  const artistId = payload.artistId?.trim()
  const galleryImageId = payload.galleryImageId?.trim()

  if (!artistId) {
    return badRequest("Artist id is required.")
  }

  if (!galleryImageId) {
    return badRequest("Gallery image id is required.")
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) throw artistError

    if (!artist) {
      return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    }

    if (artist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    }

    const { data: galleryImage, error: galleryImageError } = await supabase
      .from("gallery_images")
      .select("id, artist_id, image_url")
      .eq("id", galleryImageId)
      .eq("artist_id", artist.id)
      .maybeSingle<GalleryImageRow>()

    if (galleryImageError) throw galleryImageError

    if (!galleryImage) {
      return NextResponse.json({ error: "Gallery image not found." }, { status: 404 })
    }

    const storagePath = getStoragePathFromImageUrl(galleryImage.image_url)
    let storageDeleted = false

    if (storagePath) {
      const { error: removeStorageError } = await supabase.storage.from("artist-gallery").remove([storagePath])
      if (!removeStorageError) {
        storageDeleted = true
      }
    }

    const { error: deleteRowError } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", galleryImage.id)
      .eq("artist_id", artist.id)

    if (deleteRowError) throw deleteRowError

    return NextResponse.json({ success: true, galleryImageId: galleryImage.id, storageDeleted }, { status: 200 })
  } catch (error) {
    console.error("[gallery-image DELETE]", error)
    return NextResponse.json({ error: "Unable to delete gallery image." }, { status: 500 })
  }
}

type UpdateGalleryImagePayload = {
  artistId?: string
  galleryImageId?: string
  focalX?: number
  focalY?: number
  momentsPlacement?: string | null
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let rawPayload: (ReorderGalleryImagesPayload & UpdateGalleryImagePayload)

  try {
    rawPayload = (await request.json()) as ReorderGalleryImagesPayload & UpdateFocalPointPayload
  } catch {
    return badRequest("Invalid JSON payload.")
  }

  // Single-image update path: presence of galleryImageId distinguishes from reorder.
  // Supports focal point updates (focalX + focalY) and/or placement updates (momentsPlacement).
  if (rawPayload.galleryImageId !== undefined) {
    const artistId = rawPayload.artistId?.trim()
    const galleryImageId = rawPayload.galleryImageId?.trim()
    const focalX = typeof rawPayload.focalX === "number" ? Math.min(100, Math.max(0, Math.round(rawPayload.focalX))) : null
    const focalY = typeof rawPayload.focalY === "number" ? Math.min(100, Math.max(0, Math.round(rawPayload.focalY))) : null
    const hasFocal = focalX !== null && focalY !== null
    const hasPlacement = "momentsPlacement" in rawPayload
    const placementValue = hasPlacement ? normalizeMomentsPlacement(rawPayload.momentsPlacement) : undefined

    if (!artistId) return badRequest("Artist id is required.")
    if (!galleryImageId) return badRequest("Gallery image id is required.")
    if (!hasFocal && !hasPlacement) return badRequest("focalX/focalY or momentsPlacement is required.")

    const updateFields: Record<string, unknown> = {}
    if (hasFocal) {
      updateFields.focal_x = focalX
      updateFields.focal_y = focalY
    }
    if (hasPlacement) {
      // "auto" is stored as null — both mean the same (DJHQ automatic)
      updateFields.moments_placement = placementValue === "auto" ? null : (placementValue ?? null)
    }

    try {
      const supabase = createSupabaseAdminClient()
      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id, owner_user_id")
        .eq("id", artistId)
        .maybeSingle<ArtistOwnershipRow>()

      if (artistError) throw artistError
      if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
      if (artist.owner_user_id !== user.id) return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })

      const { error: updateError } = await supabase
        .from("gallery_images")
        .update(updateFields)
        .eq("id", galleryImageId)
        .eq("artist_id", artist.id)

      if (updateError) throw updateError

      return NextResponse.json(
        { success: true, galleryImageId, ...(hasFocal ? { focalX, focalY } : {}), ...(hasPlacement ? { momentsPlacement: updateFields.moments_placement ?? null } : {}) },
        { status: 200 },
      )
    } catch (error) {
      console.error("[gallery-image PATCH image]", error)
      return NextResponse.json({ error: "Unable to update gallery image." }, { status: 500 })
    }
  }

  // Reorder path
  const artistId = rawPayload.artistId?.trim()
  const orderedImageIds = Array.isArray(rawPayload.orderedImageIds) ? rawPayload.orderedImageIds.map((id) => id.trim()) : []

  if (!artistId) {
    return badRequest("Artist id is required.")
  }

  if (!orderedImageIds.length || orderedImageIds.some((id) => !id)) {
    return badRequest("orderedImageIds must include at least one valid image id.")
  }

  if (new Set(orderedImageIds).size !== orderedImageIds.length) {
    return badRequest("orderedImageIds must not contain duplicates.")
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, owner_user_id")
      .eq("id", artistId)
      .maybeSingle<ArtistOwnershipRow>()

    if (artistError) throw artistError

    if (!artist) {
      return NextResponse.json({ error: "Artist not found." }, { status: 404 })
    }

    if (artist.owner_user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this artist profile." }, { status: 403 })
    }

    const { data: existingImages, error: existingImagesError } = await supabase
      .from("gallery_images")
      .select("id, image_url, alt_text, sort_order, focal_x, focal_y")
      .eq("artist_id", artist.id)
      .returns<GalleryImageRow[]>()

    if (existingImagesError) throw existingImagesError

    const existingImageIds = (existingImages ?? []).map((image) => image.id)

    if (existingImageIds.length !== orderedImageIds.length) {
      return badRequest("orderedImageIds must match the artist gallery image count.")
    }

    const existingImageIdSet = new Set(existingImageIds)

    if (orderedImageIds.some((id) => !existingImageIdSet.has(id))) {
      return badRequest("orderedImageIds include an image that does not belong to this artist.")
    }

    const updates = orderedImageIds.map((id, index) =>
      supabase.from("gallery_images").update({ sort_order: index + 1 }).eq("id", id).eq("artist_id", artist.id),
    )

    const updateResults = await Promise.all(updates)
    const updateError = updateResults.find((result) => result.error)?.error

    if (updateError) throw updateError

    const { data: reorderedImages, error: reorderedImagesError } = await supabase
      .from("gallery_images")
      .select("id, image_url, alt_text, sort_order, focal_x, focal_y")
      .eq("artist_id", artist.id)
      .order("sort_order", { ascending: true })
      .returns<GalleryImageRow[]>()

    if (reorderedImagesError) throw reorderedImagesError

    return NextResponse.json(
      {
        galleryImages: (reorderedImages ?? []).map((image) => ({
          id: image.id,
          imageUrl: image.image_url,
          altText: image.alt_text,
          sortOrder: image.sort_order,
          focalX: image.focal_x,
          focalY: image.focal_y,
        })),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[gallery-image PATCH reorder]", error)
    return NextResponse.json({ error: "Unable to reorder gallery images." }, { status: 500 })
  }
}
