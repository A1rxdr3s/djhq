import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, NODE_ENV: 'test' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, SET2GO_DEV_CLOUD_UPLOAD: '' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(request, { ...env, SET2GO_DEV_CLOUD_ORIGIN: 'http://evil.example' }, async () => ({ id })), null)
})

test('private testing in production requires exact https://djhq.app origin and allowlisted identity', async () => {
  const prodOrigin = 'https://djhq.app'
  const prodEnv = { NODE_ENV: 'production', SET2GO_PRIVATE_TESTING: 'enabled', SET2GO_DEV_CLOUD_UPLOAD: 'enabled', SET2GO_DEV_CLOUD_ORIGIN: prodOrigin, SET2GO_DEV_CLOUD_USER_ID: id }
  const prodRequest = new Request(`${prodOrigin}/api/test`, { headers: { origin: prodOrigin } })
  assert.equal(await authorizeDevelopmentUpload(prodRequest, prodEnv, async () => ({ id })), id)
  assert.equal(await authorizeDevelopmentUpload(prodRequest, prodEnv, async () => ({ id: 'other' })), null)
  assert.equal(await authorizeDevelopmentUpload(new Request(`${prodOrigin}/api/test`), prodEnv, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(prodRequest, { ...prodEnv, SET2GO_PRIVATE_TESTING: 'disabled' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(prodRequest, { ...prodEnv, SET2GO_DEV_CLOUD_ORIGIN: 'https://evil.example' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(prodRequest, { ...prodEnv, SET2GO_DEV_CLOUD_ORIGIN: 'http://localhost:3000' }, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(new Request('https://other.djhq.app/api/test', { headers: { origin: prodOrigin } }), prodEnv, async () => ({ id })), null)
  assert.equal(await authorizeDevelopmentUpload(new Request(`${prodOrigin}/api/test`, { headers: { origin: 'http://djhq.app' } }), prodEnv, async () => ({ id })), null)
})

test('cloud API route enforces Set2Go product entitlement alongside upload authorization', () => {
  const routeSrc = readFileSync('app/api/set2go/cloud/route.ts', 'utf8')
  assert.match(routeSrc, /authorizeDevelopmentUpload\(request, process\.env/)
  assert.match(routeSrc, /accessForUser\(data\.user, false\)\.set2go/)
  assert.match(routeSrc, /createUploadStore\(\)/)
  assert.match(routeSrc, /developmentR2FromEnv\(process\.env/)
})
