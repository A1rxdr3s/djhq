import { randomUUID } from 'node:crypto'

export const CLOUD_MAX_TRACKS = 20
export const CLOUD_MAX_BYTES = 2_000_000_000

// Prototype only: the caller must provide authenticated, durable, transactional state.
export function createSession(ownerId, files, now = Date.now()) {
  if (typeof ownerId !== 'string' || !ownerId || !Array.isArray(files) || files.length < 1 || files.length > CLOUD_MAX_TRACKS) throw new Error('Invalid upload session')
  let total = 0
  for (const file of files) {
    if (typeof file.name !== 'string' || !/\.(wav|aif|aiff|flac)$/i.test(file.name) || !Number.isSafeInteger(file.size) || file.size < 1) throw new Error('Invalid file')
    total += file.size
    if (total > CLOUD_MAX_BYTES) throw new Error('Upload exceeds cloud limit')
  }
  const id = randomUUID()
  return { id, ownerId, stage: 'CREATED', created: now, tracks: files.map(file => ({ id: randomUUID(), name: file.name, size: file.size, uploaded: false })) }
}

export function objectKey(session, trackId) {
  const track = session.tracks.find(item => item.id === trackId)
  if (!track) throw new Error('Unknown track')
  return `temporary/${session.id}/input/${track.id}`
}

export function authorize(session, ownerId) {
  if (!session || !ownerId || session.ownerId !== ownerId) throw new Error('Unauthorized')
}

// Metadata must come from storage HEAD, never from a browser completion request.
export async function confirmObject(storage, session, ownerId, trackId) {
  authorize(session, ownerId)
  const track = session.tracks.find(item => item.id === trackId)
  if (!track) throw new Error('Unknown track')
  if (track.uploaded && ['UPLOADING', 'UPLOADED'].includes(session.stage)) return
  if (!['UPLOADING', 'CREATED'].includes(session.stage)) throw new Error('Invalid session state')
  const metadata = await storage.head(objectKey(session, trackId))
  if (!metadata || metadata.size !== track.size) throw new Error('Object size mismatch')
  track.uploaded = true
  session.stage = session.tracks.every(item => item.uploaded) ? 'UPLOADED' : 'UPLOADING'
}

// Storage.delete is required to be idempotent. Active workers cannot be cleaned.
export async function cleanupSession(storage, session) {
  if (session.stage === 'PROCESSING') throw new Error('Active processing')
  if (session.stage === 'CLEANED') return
  session.stage = 'CLEANUP_PENDING'
  try {
    await storage.abortMultipartForJob(session.id)
    await storage.deleteJobObjects(session.id)
    session.stage = 'CLEANED'
  } catch (error) { session.stage = 'CLEANUP_PENDING'; throw error }
}
