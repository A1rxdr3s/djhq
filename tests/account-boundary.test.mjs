import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('account checks the server user and does not depend on artist onboarding', () => {
  const source = readFileSync('app/account/page.tsx', 'utf8')
  assert.match(source, /auth\.getUser\(\)/)
  assert.match(source, /if \(error \|\| !user\) redirect\('\/login'\)/)
  assert.doesNotMatch(source, /artist|onboarding|service.role/i)
})

test('login preview uses disabled controls with no auth calls', () => {
  const source = readFileSync('app/account-shell.tsx', 'utf8')
  assert.equal((source.match(/<button type="button" disabled>/g) ?? []).length, 2)
  assert.match(source, /<label htmlFor="login-email">/)
  assert.match(source, /<input id="login-email" type="email" autoComplete="email" placeholder=\{t\('loginPlaceholder'\)\} disabled\s*\/>/)
  assert.doesNotMatch(source, /supabase|fetch\(|<form|onSubmit/)
})

test('both public navigation variants link to login', () => {
  for (const path of ['app/site-shell.tsx', 'app/mobile-nav.tsx']) {
    assert.match(readFileSync(path, 'utf8'), /href="\/login"/)
  }
})
