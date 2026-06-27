import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { CareerTimelineCategory } from "@/types/djhq"

type ArtistOwnerRow = { id: string; owner_user_id: string | null }

type TimelineRow = {
  id: string
  artist_id: string
  title: string
  category: string
  event_date: string
  location: string | null
  description: string | null
  link: string | null
  image_url: string | null
  is_featured: boolean
  preview_image_url: string | null
  is_published: boolean
  sort_order: number | null
  story_slot: string | null
  show_in_collapsed: boolean
  image_focal_x: number
  image_focal_y: number
  image_object_fit: string
  image_zoom: number
  image_treatment: string
  description_mode: string
  metadata_overlay_mode: string
  created_at: string
  updated_at: string
}

const VALID_CATEGORIES = new Set<string>([
  "residency", "festival", "club_show", "international",
  "release", "press", "chart", "tour", "other",
])

function normalizeCategory(c: string): CareerTimelineCategory {
  return VALID_CATEGORIES.has(c) ? (c as CareerTimelineCategory) : "other"
}

function mapRow(r: TimelineRow) {
  return {
    id: r.id,
    title: r.title,
    category: normalizeCategory(r.category),
    eventDate: r.event_date,
    location: r.location ?? undefined,
    description: r.description ?? undefined,
    link: r.link ?? undefined,
    imageUrl: r.image_url ?? undefined,
    isFeatured: r.is_featured,
    previewImageUrl: r.preview_image_url ?? undefined,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    storySlot: r.story_slot ?? null,
    showInCollapsed: r.show_in_collapsed,
    imageFocalX: r.image_focal_x,
    imageFocalY: r.image_focal_y,
    imageObjectFit: r.image_object_fit as 'cover' | 'contain',
    imageZoom: r.image_zoom,
    imageTreatment: r.image_treatment as 'cover' | 'contain' | 'blurred-fill' | 'text-only',
    descriptionMode: r.description_mode as 'auto' | 'full' | 'short' | 'minimal' | 'hidden',
    metadataOverlayMode: r.metadata_overlay_mode as 'auto' | 'full' | 'compact' | 'minimal' | 'hidden',
    createdAt: r.created_at,
  }
}

async function getAuthedUser() {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user
}

async function getArtistRow(artistId: string): Promise<ArtistOwnerRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("artists")
    .select("id, owner_user_id")
    .eq("id", artistId)
    .maybeSingle<ArtistOwnerRow>()
  return data
}

function unauthorized(msg: string, status = 401) {
  return NextResponse.json({ error: msg }, { status })
}

// GET /api/artists/career-timeline?artistId=...
export async function GET(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get("artistId")?.trim()
  if (!artistId) return NextResponse.json({ error: "artistId is required." }, { status: 400 })

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: items, error } = await supabase
    .from("artist_career_timeline")
    .select("id, artist_id, title, category, event_date, location, description, link, image_url, is_featured, preview_image_url, is_published, sort_order, story_slot, show_in_collapsed, image_focal_x, image_focal_y, image_object_fit, image_zoom, image_treatment, description_mode, metadata_overlay_mode, created_at, updated_at")
    .eq("artist_id", artistId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("event_date", { ascending: false })
    .returns<TimelineRow[]>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (items ?? []).map(mapRow) })
}

// POST /api/artists/career-timeline
// body: { artistId, title, category, eventDate, location?, description?, link?, isPublished?, sortOrder? }
export async function POST(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { artistId, title, category, eventDate, location, description, link, imageUrl, isFeatured = false, previewImageUrl, isPublished = true, sortOrder, storySlot, showInCollapsed = true, imageFocalX = 50, imageFocalY = 50, imageObjectFit = 'cover', imageZoom = 1, imageTreatment = 'cover', descriptionMode = 'auto', metadataOverlayMode = 'auto' } = body

  if (!artistId || !title?.trim() || !category || !eventDate) {
    return NextResponse.json({ error: "artistId, title, category and eventDate are required." }, { status: 400 })
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(", ")}.` }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { data: item, error } = await supabase
    .from("artist_career_timeline")
    .insert({
      artist_id: artistId,
      title: title.trim(),
      category,
      event_date: eventDate,
      location: location?.trim() || null,
      description: description?.trim() || null,
      link: link?.trim() || null,
      image_url: imageUrl?.trim() || null,
      is_featured: isFeatured,
      preview_image_url: previewImageUrl?.trim() || null,
      is_published: isPublished,
      sort_order: sortOrder ?? null,
      story_slot: storySlot || null,
      show_in_collapsed: showInCollapsed,
      image_focal_x: Math.max(0, Math.min(100, Number(imageFocalX) || 50)),
      image_focal_y: Math.max(0, Math.min(100, Number(imageFocalY) || 50)),
      image_object_fit: imageObjectFit === 'contain' ? 'contain' : 'cover',
      image_zoom: Math.max(1, Math.min(3, Number(imageZoom) || 1)),
      image_treatment: (['cover', 'contain', 'blurred-fill', 'text-only'] as const).includes(imageTreatment) ? imageTreatment : 'cover',
      description_mode: (['auto', 'full', 'short', 'minimal', 'hidden'] as const).includes(descriptionMode) ? descriptionMode : 'auto',
      metadata_overlay_mode: (['auto', 'full', 'compact', 'minimal', 'hidden'] as const).includes(metadataOverlayMode) ? metadataOverlayMode : 'auto',
    })
    .select("id, artist_id, title, category, event_date, location, description, link, image_url, is_featured, preview_image_url, is_published, sort_order, story_slot, show_in_collapsed, image_focal_x, image_focal_y, image_object_fit, image_zoom, image_treatment, description_mode, metadata_overlay_mode, created_at, updated_at")
    .single<TimelineRow>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(item) }, { status: 201 })
}

// PATCH /api/artists/career-timeline
// body: { id, artistId, title?, category?, eventDate?, location?, description?, link?, isPublished?, sortOrder? }
export async function PATCH(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const body = await request.json()
  const { id, artistId, title, category, eventDate, location, description, link, imageUrl, isFeatured, previewImageUrl, isPublished, sortOrder, storySlot, showInCollapsed, imageFocalX, imageFocalY, imageObjectFit, imageZoom, imageTreatment, descriptionMode, metadataOverlayMode } = body

  if (!id || !artistId) {
    return NextResponse.json({ error: "id and artistId are required." }, { status: 400 })
  }
  if (category !== undefined && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: `Invalid category.` }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const patch: Record<string, unknown> = {}
  if (title !== undefined) patch.title = title.trim()
  if (category !== undefined) patch.category = category
  if (eventDate !== undefined) patch.event_date = eventDate
  if (location !== undefined) patch.location = location?.trim() || null
  if (description !== undefined) patch.description = description?.trim() || null
  if (link !== undefined) patch.link = link?.trim() || null
  if (imageUrl !== undefined) patch.image_url = imageUrl?.trim() || null
  if (isFeatured !== undefined) patch.is_featured = isFeatured
  if (previewImageUrl !== undefined) patch.preview_image_url = previewImageUrl?.trim() || null
  if (isPublished !== undefined) patch.is_published = isPublished
  if (sortOrder !== undefined) patch.sort_order = sortOrder
  if (storySlot !== undefined) patch.story_slot = storySlot || null
  if (showInCollapsed !== undefined) patch.show_in_collapsed = showInCollapsed
  if (imageFocalX !== undefined) patch.image_focal_x = Math.max(0, Math.min(100, Number(imageFocalX) || 50))
  if (imageFocalY !== undefined) patch.image_focal_y = Math.max(0, Math.min(100, Number(imageFocalY) || 50))
  if (imageObjectFit !== undefined) patch.image_object_fit = imageObjectFit === 'contain' ? 'contain' : 'cover'
  if (imageZoom !== undefined) patch.image_zoom = Math.max(1, Math.min(3, Number(imageZoom) || 1))
  if (imageTreatment !== undefined) patch.image_treatment = (['cover', 'contain', 'blurred-fill', 'text-only'] as const).includes(imageTreatment) ? imageTreatment : 'cover'
  if (descriptionMode !== undefined) patch.description_mode = (['auto', 'full', 'short', 'minimal', 'hidden'] as const).includes(descriptionMode) ? descriptionMode : 'auto'
  if (metadataOverlayMode !== undefined) patch.metadata_overlay_mode = (['auto', 'full', 'compact', 'minimal', 'hidden'] as const).includes(metadataOverlayMode) ? metadataOverlayMode : 'auto'

  const supabase = createSupabaseAdminClient()
  const { data: item, error } = await supabase
    .from("artist_career_timeline")
    .update(patch)
    .eq("id", id)
    .eq("artist_id", artistId)
    .select("id, artist_id, title, category, event_date, location, description, link, image_url, is_featured, preview_image_url, is_published, sort_order, story_slot, show_in_collapsed, image_focal_x, image_focal_y, image_object_fit, image_zoom, image_treatment, description_mode, metadata_overlay_mode, created_at, updated_at")
    .single<TimelineRow>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(item) })
}

// DELETE /api/artists/career-timeline?id=...&artistId=...
export async function DELETE(request: Request) {
  const user = await getAuthedUser()
  if (!user) return unauthorized("Authentication required.")

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  const artistId = searchParams.get("artistId")?.trim()

  if (!id || !artistId) {
    return NextResponse.json({ error: "id and artistId are required." }, { status: 400 })
  }

  const artist = await getArtistRow(artistId)
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 })
  if (artist.owner_user_id !== user.id) return unauthorized("Access denied.", 403)

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("artist_career_timeline")
    .delete()
    .eq("id", id)
    .eq("artist_id", artistId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
