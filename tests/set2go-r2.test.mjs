import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession } from '../lib/set2go/cloud/session.mjs'
import { createR2Adapter, developmentR2FromEnv } from '../lib/set2go/cloud/r2.mjs'

test('multipart signs only owned stored track and checks actual object size', async () => {
  const s = createSession('alice', [{ name: 'same.wav', size: 12 }, { name: 'same.wav', size: 13 }])
  const calls = []
  const client = { send: async c => { calls.push(c); if (c.constructor.name === 'CreateMultipartUploadCommand') return { UploadId: 'upload-id' }; if (c.constructor.name === 'HeadObjectCommand') return { ContentLength: 12 }; return {} } }
  const adapter = createR2Adapter({ authorizePart: async () => true, authorizeCompletion: async () => true, client, bucket: 'private', sign: async (_client, command, options) => { assert.equal(options.expiresIn, 300); assert.equal(command.input.PartNumber, 1); return 'signed' } })
  const id = s.tracks[0].id
  await assert.rejects(adapter.initiate(s, 'bob', id))
  await adapter.initiate(s, 'alice', id)
  await assert.rejects(adapter.signPart(s, 'alice', id, 2))
  assert.equal((await adapter.signPart(s, 'alice', id, 1)).url, 'signed')
  await adapter.complete(s, 'alice', id, [{ PartNumber: 1, ETag: 'etag' }])
  assert.equal(s.tracks[0].uploaded, true)
  assert.equal(s.tracks[1].uploaded, false)
  assert.ok(calls.every(c => c.input.Key?.includes(s.id)))
})

test('development configuration fails closed and invalid job prefixes are rejected', async () => {
  assert.throws(() => developmentR2FromEnv({ NODE_ENV: 'production', SET2GO_UPLOAD_MODE: 'r2-development' }))
  assert.throws(() => developmentR2FromEnv({ NODE_ENV: 'production', SET2GO_PRIVATE_TESTING: 'enabled', SET2GO_UPLOAD_MODE: 'unsupported' }))
  const adapter = createR2Adapter({ authorizePart: async () => true, authorizeCompletion: async () => true, client: { send: async () => ({}) }, bucket: 'private' })
  await assert.rejects(adapter.deleteJobObjects('../other'))
})

test('trusted header validation reads a bounded range and rejects wrong audio', async () => {
  const s = createSession('alice', [{ name: 'same.wav', size: 12 }]); s.tracks[0].uploaded = true
  const client = { send: async c => { assert.equal(c.input.Range, 'bytes=0-11'); return { Body: { transformToByteArray: async () => Buffer.from('RIFF0000WAVE') } } } }
  const adapter = createR2Adapter({ authorizePart: async () => true, authorizeCompletion: async () => true, client, bucket: 'private' })
  assert.equal(await adapter.validateHeader(s, 'alice', s.tracks[0].id), true)
  await assert.rejects(adapter.validateHeader(s, 'bob', s.tracks[0].id))
})

test('SDK creates a scoped, expiring URL without network access', async () => {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const s = createSession('alice', [{ name: 'a.wav', size: 12 }])
  s.stage = 'UPLOADING'; s.tracks[0].uploadId = 'u1'
  const client = new S3Client({ region: 'auto', endpoint: 'https://12345678901234567890123456789012.r2.cloudflarestorage.com', credentials: { accessKeyId: 'test-access', secretAccessKey: 'test-secret' } })
  const adapter = createR2Adapter({ authorizePart: async () => true, authorizeCompletion: async () => true, client, bucket: 'private', ttl: 120 })
  const signed = new URL((await adapter.signPart(s, 'alice', s.tracks[0].id, 1)).url)
  assert.match(signed.pathname, new RegExp(s.id))
  assert.match(signed.pathname, new RegExp(s.tracks[0].id))
  assert.equal(signed.searchParams.get('X-Amz-Expires'), '120')
  assert.equal(signed.searchParams.get('partNumber'), '1')
})

test('abort checks ownership and is idempotent', async () => {
  const s = createSession('alice', [{ name: 'a.wav', size: 12 }]); s.stage = 'UPLOADING'; s.tracks[0].uploadId = 'upload-id'
  let calls = 0
  const adapter = createR2Adapter({ authorizePart: async () => true, authorizeCompletion: async () => true, client: { send: async command => { calls++; assert.equal(command.constructor.name, 'AbortMultipartUploadCommand'); return {} } }, bucket: 'private' })
  await assert.rejects(adapter.abort(s, 'bob', s.tracks[0].id))
  await adapter.abort(s, 'alice', s.tracks[0].id)
  await adapter.abort(s, 'alice', s.tracks[0].id)
  assert.equal(calls, 1)
})

test('signing fails closed without durable authorization', async () => {
  const s = createSession('alice', [{ name: 'a.wav', size: 12 }]); s.stage = 'UPLOADING'; s.tracks[0].uploadId = 'upload-id'
  const adapter = createR2Adapter({ client: { send: async () => { throw Error('unexpected network') } }, bucket: 'private', sign: async () => { throw Error('unexpected signing') } })
  await assert.rejects(adapter.signPart(s, 'alice', s.tracks[0].id, 1), /Durable signing authorization/)
  await assert.rejects(adapter.complete(s, 'alice', s.tracks[0].id, [{ PartNumber: 1, ETag: 'etag' }]), /Durable completion authorization/)
})
