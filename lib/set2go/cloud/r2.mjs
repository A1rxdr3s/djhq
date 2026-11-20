import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, ListMultipartUploadsCommand, ListPartsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { authorize, objectKey } from './session.mjs'

const PART_SIZE = 16 * 1024 * 1024
const MAX_TTL = 900
const jobPrefix = id => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid job ID'); return `temporary/${id}/` }

/** Disabled integration boundary. Caller must persist and lock the session transactionally. */
export function createR2Adapter({ client: rawClient, bucket, sign = getSignedUrl, ttl = 300, authorizePart, authorizeCompletion }) {
  const client = rawClient
  if (!client || !bucket || !Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TTL) throw new Error('Invalid storage configuration')
  const scoped = (session, owner, trackId) => { authorize(session, owner); return objectKey(session, trackId) }
  const trackFor = (session, trackId) => { const t = session.tracks.find(t => t.id === trackId); if (!t) throw new Error('Unknown track'); return t }
  return {
    async initiate(session, owner, trackId) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (!['CREATED', 'RESERVED', 'UPLOADING'].includes(session.stage) || track.uploadId || track.uploaded) throw new Error('Invalid upload state')
      const result = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key, ContentType: 'application/octet-stream' }))
      if (!result.UploadId) throw new Error('Missing upload ID')
      track.uploadId = result.UploadId; session.stage = 'UPLOADING'
      return { parts: Math.ceil(track.size / PART_SIZE), partSize: PART_SIZE }
    },
    async signPart(session, owner, trackId, part) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (session.stage !== 'UPLOADING' || !track.uploadId || !Number.isInteger(part) || part < 1 || part > Math.ceil(track.size / PART_SIZE)) throw new Error('Invalid upload part')
      if (!authorizePart) throw new Error('Durable signing authorization required')
      const signingDate = new Date()
      if (await authorizePart(session.id, owner, ttl) !== true) throw new Error('Upload authorization denied')
      const url = await sign(client, new UploadPartCommand({ Bucket: bucket, Key, UploadId: track.uploadId, PartNumber: part }), { expiresIn: ttl, signingDate })
      return { url, expiresIn: ttl }
    },
    async complete(session, owner, trackId, parts) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (track.uploaded) return
      const count = Math.ceil(track.size / PART_SIZE)
      if (session.stage !== 'UPLOADING' || !track.uploadId || !Array.isArray(parts) || parts.length !== count || parts.some((p, i) => p.PartNumber !== i + 1 || typeof p.ETag !== 'string' || !p.ETag || p.ETag.length > 256)) throw new Error('Invalid completion')
      if (!authorizeCompletion) throw new Error('Durable completion authorization required')
      if (await authorizeCompletion(session.id, owner, trackId) !== true) throw new Error('Completion authorization denied')
      await client.send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key, UploadId: track.uploadId, MultipartUpload: { Parts: parts } }))
      track.uploadId = undefined
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key }))
      if (result.ContentLength !== track.size) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key })); throw new Error('Object size mismatch') }
      track.uploaded = true
      if (session.tracks.every(t => t.uploaded)) session.stage = 'UPLOADED'
    },
    async abort(session, owner, trackId) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (!track.uploadId) return
      try {
        await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key, UploadId: track.uploadId }))
      } catch (error) {
        if (error?.name !== 'NoSuchUpload') throw error
      }
      track.uploadId = undefined
    },
    async head(Key) { const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key })); return { size: result.ContentLength } },
    async read(session, owner, trackId, range) { const Key = scoped(session, owner, trackId); if (!trackFor(session, trackId).uploaded) throw new Error('Upload not verified'); return (await client.send(new GetObjectCommand({ Bucket: bucket, Key, ...(range ? { Range: range } : {}) }))).Body },
    async validateHeader(session, owner, trackId) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (!track.uploaded) throw new Error('Upload not verified')
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key, Range: 'bytes=0-11' }))
      if (!result.Body || typeof result.Body.transformToByteArray !== 'function') throw new Error('Audio header unavailable')
      const bytes = Buffer.from(await result.Body.transformToByteArray())
      const extension = track.name.toLowerCase().split('.').pop()
      const valid = bytes.length >= 12 && (extension === 'flac' ? bytes.subarray(0, 4).toString() === 'fLaC' : extension === 'wav' ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE' : ['aif', 'aiff'].includes(extension) && bytes.subarray(0, 4).toString() === 'FORM' && ['AIFF', 'AIFC'].includes(bytes.subarray(8, 12).toString()))
      if (!valid) throw new Error('Invalid audio header')
      return true
    },
    async deleteTrack(session, owner, trackId) { const Key = scoped(session, owner, trackId); await client.send(new DeleteObjectCommand({ Bucket: bucket, Key })) },
    async abortMultipartForJob(jobId) {
      const Prefix = jobPrefix(jobId); let KeyMarker, UploadIdMarker
      do {
        const page = await client.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix, KeyMarker, UploadIdMarker }))
        for (const upload of page.Uploads ?? []) if (upload.Key && upload.UploadId && upload.Key.startsWith(Prefix)) { try { await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: upload.Key, UploadId: upload.UploadId })) } catch (error) { if (error?.name !== 'NoSuchUpload') throw error } }
        if (!page.IsTruncated) break
        if (!page.NextKeyMarker) throw new Error('Invalid multipart listing')
        KeyMarker = page.NextKeyMarker; UploadIdMarker = page.NextUploadIdMarker
      } while (true)
    },
    async completionEvidence(session, owner, trackId) {
      const Key = scoped(session, owner, trackId), track = trackFor(session, trackId)
      if (!track.uploadId) return { state: 'ambiguous' }
      let object
      try { object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key })) }
      catch (error) { if (error?.$metadata?.httpStatusCode !== 404 && !['NoSuchKey','NotFound'].includes(error?.name)) throw error }
      let closed = false
      try { await client.send(new ListPartsCommand({ Bucket: bucket, Key, UploadId: track.uploadId, MaxParts: 1 })) }
      catch (error) { if (error?.name !== 'NoSuchUpload') throw error; closed = true }
      // A missing object never proves an already-started completion is quiescent.
      return object && closed && object.ContentLength === track.size ? { state: 'completed', size: object.ContentLength } : { state: object ? 'ambiguous' : closed ? 'absent_unconfirmed' : 'incomplete' }
    },
    async inspectJob(jobId) {
      const Prefix = jobPrefix(jobId)
      const objects = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, MaxKeys: 1 }))
      const multipart = await client.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix, MaxUploads: 1 }))
      return { objects: objects.Contents?.length ?? 0, multipart: multipart.Uploads?.length ?? 0 }
    },
    async deleteJobObjects(jobId) {
      const Prefix = jobPrefix(jobId); let ContinuationToken
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken }))
        for (const object of page.Contents ?? []) if (object.Key?.startsWith(Prefix)) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }))
        if (!page.IsTruncated) break
        if (!page.NextContinuationToken) throw new Error('Invalid object listing')
        ContinuationToken = page.NextContinuationToken
      } while (true)
    },
  }
}

/** Development only; no endpoint currently calls this function. */
export function developmentR2FromEnv(env = process.env, hooks = {}) {
  if (env.NODE_ENV !== 'development' || env.SET2GO_UPLOAD_MODE !== 'r2-development') throw new Error('Cloud uploads disabled')
  const { R2_ACCOUNT_ID: account, R2_PRIVATE_BUCKET: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = env
  if (!account || !/^[a-f0-9]{32}$/i.test(account) || !bucket || !accessKeyId || !secretAccessKey) throw new Error('Incomplete R2 configuration')
  const endpoint = `https://${account}.r2.cloudflarestorage.com`
  const ttl = env.SET2GO_UPLOAD_URL_TTL_SECONDS ? Number(env.SET2GO_UPLOAD_URL_TTL_SECONDS) : 300
  return createR2Adapter({ bucket, ttl, authorizePart: hooks.authorizePart, authorizeCompletion: hooks.authorizeCompletion, client: new S3Client({ region: 'auto', endpoint, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 }, credentials: { accessKeyId, secretAccessKey } }) })
}
