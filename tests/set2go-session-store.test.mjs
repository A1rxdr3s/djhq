import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDevelopmentStore } from '../lib/set2go/cloud/session-store.mjs'

test('reservations persist, reject unauthorized access and enforce quota', () => {
  const dir = mkdtempSync(join(tmpdir(), 'set2go-store-test-'))
  try {
    assert.throws(() => openDevelopmentStore({ NODE_ENV: 'production', SET2GO_CLOUD_SESSIONS: 'enabled', SET2GO_CLOUD_DATA_DIR: dir }))
    const env = { NODE_ENV: 'development', SET2GO_CLOUD_SESSIONS: 'enabled', SET2GO_CLOUD_DATA_DIR: dir }
    const a = openDevelopmentStore(env), b = openDevelopmentStore(env)
    const { id, token } = a.create()
    const track = a.reserve(id, token, 'one', 'same.wav', 1_999_999_999)
    assert.equal(b.reserve(id, token, 'one', 'same.wav', 1_999_999_999), track)
    assert.throws(() => b.reserve(id, 'bad', 'two', 'same.wav', 1))
    b.reserve(id, token, 'two', 'same.wav', 1)
    assert.throws(() => a.reserve(id, token, 'three', 'same.wav', 1))
    a.close(); b.close()
    const c = openDevelopmentStore(env); assert.equal(c.get(id, token).tracks.length, 2); c.close()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
