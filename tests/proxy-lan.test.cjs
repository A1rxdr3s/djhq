/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS is used to load the transpiled proxy in an isolated VM. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function setup(env, artist = null) {
  const source = ts.transpileModule(fs.readFileSync('proxy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const response = { next: () => ({ kind: 'next' }), redirect: url => ({ kind: 'redirect', url }), rewrite: url => ({ kind: 'rewrite', url: url.pathname }) }
  const query = { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: artist }) }
  const exports = {}
  vm.runInNewContext(source, { exports, process: { env }, URL, require: name => name === 'next/server' ? { NextResponse: response } : { createClient: () => ({ from: () => query }) } })
  return host => exports.proxy({ headers: { get: () => host }, nextUrl: { pathname: '/', clone: () => ({ pathname: '/' }) } })
}

test('development exception matches only configured host', async () => {
  const run = setup({ NODE_ENV: 'development', DJHQ_DEV_LAN_HOST: '192.168.1.105' })
  assert.equal((await run('192.168.1.105:3000')).kind, 'next')
  assert.equal((await run('192.168.1.106:3000')).kind, 'redirect')
  assert.equal((await run('localhost:3000')).kind, 'next')
  assert.equal((await run('127.0.0.1:3000')).kind, 'next')
  assert.equal((await setup({ NODE_ENV: 'development' })('192.168.1.105:3000')).kind, 'redirect')
})

test('production retains unknown and artist domain routing', async () => {
  const env = { NODE_ENV: 'production', DJHQ_DEV_LAN_HOST: '192.168.1.105', NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test' }
  assert.equal((await setup(env)('192.168.1.105:3000')).kind, 'redirect')
  const result = await setup(env, { artists: { handle: 'artist', is_published: true, plan: 'pro' } })('artist.example')
  assert.equal(result.kind, 'rewrite')
  assert.equal(result.url, '/artist')
})
