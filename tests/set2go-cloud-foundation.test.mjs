import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, objectKey, confirmObject, cleanupSession } from '../lib/set2go/cloud/session.mjs'

test('cloud target boundary, duplicate filenames and server-generated identity', () => {
  const files = Array.from({ length: 20 }, (_, i) => ({ name: 'same.wav', size: i === 0 ? 2_000_000_000 - 19 : 1 }))
  const session = createSession('owner', files)
  assert.equal(new Set(session.tracks.map(t => objectKey(session, t.id))).size, 20)
  assert.throws(() => createSession('owner', [...files, files[0]]))
  assert.throws(() => createSession('owner', [{ name: 'a.wav', size: 2_000_000_001 }]))
  assert.throws(() => objectKey(session, 'another-job-track'))
})

test('verification uses storage size and rejects cross-owner access', async () => {
  const s = createSession('owner', [{ name: 'a.wav', size: 5 }])
  const storage = { head: async () => ({ size: 5 }) }
  await assert.rejects(confirmObject(storage, s, 'other', s.tracks[0].id))
  await assert.rejects(confirmObject({ head: async () => ({ size: 6 }) }, s, 'owner', s.tracks[0].id))
  await confirmObject(storage, s, 'owner', s.tracks[0].id)
  assert.equal(s.stage, 'UPLOADED')
})

test('cleanup retries failures and never removes active-worker artifacts', async () => {
  const s = createSession('owner', [{ name: 'a.wav', size: 5 }])
  s.stage = 'PROCESSING'
  const storage = { abortMultipartForJob: async () => {}, deleteJobObjects: async () => {} }
  await assert.rejects(cleanupSession(storage, s))
  s.stage = 'FAILED'
  await assert.rejects(cleanupSession({ ...storage, deleteJobObjects: async () => { throw Error('offline') } }, s))
  assert.equal(s.stage, 'CLEANUP_PENDING')
  await cleanupSession(storage, s)
  await cleanupSession(storage, s)
  assert.equal(s.stage, 'CLEANED')
})
