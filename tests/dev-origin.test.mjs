import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { blockCrossSiteDEV } = require('next/dist/server/lib/router-utils/block-cross-site-dev')

function blocked(origin, allowed) {
  const request = { url: '/_next/webpack-hmr', headers: { origin } }
  const response = { statusCode: 200, end() {} }
  return blockCrossSiteDEV(request, response, allowed)
}

test('loopback development origin can hydrate without allowing unrelated origins', async () => {
  const oldNodeEnv = process.env.NODE_ENV
  const oldHost = process.env.DJHQ_DEV_LAN_HOST
  try {
    process.env.NODE_ENV = 'development'
    process.env.DJHQ_DEV_LAN_HOST = '192.168.1.105'
    const { default: config } = await import('../next.config.mjs?dev-origin-test')
    assert.equal(blocked('http://127.0.0.1:3000', config.allowedDevOrigins), false)
    assert.equal(blocked('http://192.168.1.105:3000', config.allowedDevOrigins), false)
    assert.equal(blocked('http://untrusted.example:3000', config.allowedDevOrigins), true)
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv
    if (oldHost === undefined) delete process.env.DJHQ_DEV_LAN_HOST; else process.env.DJHQ_DEV_LAN_HOST = oldHost
  }
})

test('production does not add development origins', async () => {
  const oldNodeEnv = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    const { default: config } = await import('../next.config.mjs?production-origin-test')
    assert.equal(config.allowedDevOrigins, undefined)
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv
  }
})
