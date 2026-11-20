import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorizeDevelopmentUpload } from '../lib/set2go/cloud/dev-access.mjs'

const id = 'e774eb32-32d0-4b5d-b755-c643857518d8'
const origin = 'http://localhost:3000'
const env = { NODE_ENV: 'development', SET2GO_DEV_CLOUD_UPLOAD: 'enabled', SET2GO_DEV_CLOUD_ORIGIN: origin, SET2GO_DEV_CLOUD_USER_ID: id }
const request = new Request(`${origin}/api/test`, { headers: { origin } })
test('development access requires exact local origin and verified allowlisted identity', async () => {
  assert.equal(await authorizeDevelopmentUpload(request, env, async () => ({ id })), id)
  assert.equal(await authorizeDevelopmentUpload(request, env, async () => ({ id: 'other' })), null)
  assert.equal(await authorizeDevelopmentUpload(new Request(`${origin}/api/test`), env, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, NODE_ENV: 'production' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, SET2GO_DEV_CLOUD_UPLOAD: '' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, SET2GO_DEV_CLOUD_ORIGIN: 'http://evil.example' }, async () => ({ id })), null)
})
