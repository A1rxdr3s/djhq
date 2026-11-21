import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveLoginRedirect, sanitizeNextDestination } from '../lib/auth/login-redirect.ts'

test('sanitizeNextDestination accepts valid safe internal paths', () => {
  assert.equal(sanitizeNextDestination('/hq'), '/hq')
  assert.equal(sanitizeNextDestination('/set2go'), '/set2go')
  assert.equal(sanitizeNextDestination('/admin'), '/admin')
  assert.equal(sanitizeNextDestination('/hq/website'), '/hq/website')
  assert.equal(sanitizeNextDestination('/hq/website?section=releases&tab=1'), '/hq/website?section=releases&tab=1')
  assert.equal(sanitizeNextDestination('/account'), '/account')
})

test('sanitizeNextDestination rejects open-redirect vectors, control chars, and non-string inputs', () => {
  assert.equal(sanitizeNextDestination('https://evil.com'), undefined)
  assert.equal(sanitizeNextDestination('http://evil.com'), undefined)
  assert.equal(sanitizeNextDestination('//evil.com'), undefined)
  assert.equal(sanitizeNextDestination('/\\evil.com'), undefined)
  assert.equal(sanitizeNextDestination('/hq\r\nLocation: https://evil.com'), undefined)
  assert.equal(sanitizeNextDestination('javascript:alert(1)'), undefined)
  assert.equal(sanitizeNextDestination(''), undefined)
  assert.equal(sanitizeNextDestination(undefined), undefined)
  assert.equal(sanitizeNextDestination(['/hq']), undefined)
})

test('resolveLoginRedirect routes to /sign-in in all environments and preserves safe encoded next', () => {
  assert.equal(resolveLoginRedirect(), '/sign-in')
  assert.equal(resolveLoginRedirect(undefined), '/sign-in')
  assert.equal(resolveLoginRedirect('/hq'), '/sign-in?next=%2Fhq')
  assert.equal(resolveLoginRedirect('/set2go'), '/sign-in?next=%2Fset2go')
  assert.equal(resolveLoginRedirect('/hq/website?a=1&b=2'), '/sign-in?next=%2Fhq%2Fwebsite%3Fa%3D1%26b%3D2')
  assert.equal(resolveLoginRedirect('https://evil.com'), '/sign-in')
  assert.equal(resolveLoginRedirect('//evil.com'), '/sign-in')
})

test('login page redirects unconditionally in both development and production', () => {
  const loginSrc = readFileSync('app/login/page.tsx', 'utf8')
  assert.doesNotMatch(loginSrc, /process\.env\.NODE_ENV === ['"]development['"]/)
  assert.match(loginSrc, /redirect\(resolveLoginRedirect\(searchParams\?\.next\)\)/)
})

test('sign-in page reads djhq_locale cookie and passes sanitized next to SignInClient', () => {
  const signInPageSrc = readFileSync('app/sign-in/page.tsx', 'utf8')
  assert.match(signInPageSrc, /LOCALE_COOKIE/)
  assert.match(signInPageSrc, /resolveLocale/)
  assert.match(signInPageSrc, /sanitizeNextDestination\(searchParams\?\.next\)/)
  assert.match(signInPageSrc, /<SignInClient initialLocale=\{locale\} initialNext=\{safeNext\} \/>/)
})

test('Supabase OAuth and Magic Link handlers remain intact and preserve next end-to-end', () => {
  const signInSrc = readFileSync('app/sign-in/sign-in-client.tsx', 'utf8')
  assert.match(signInSrc, /supabase\.auth\.signInWithOAuth/)
  assert.match(signInSrc, /provider:\s*["']google["']/)
  assert.match(signInSrc, /\/auth\/callback\?next=\$\{encodeURIComponent\(nextPath\)\}/)
  assert.match(signInSrc, /`\$\{window\.location\.origin\}\/auth\/callback`/)
  assert.match(signInSrc, /supabase\.auth\.signInWithOtp/)
  assert.match(signInSrc, /`\$\{window\.location\.origin\}\/auth\/callback\?next=\/hq`/)
})

test('callback route handles code exchange, safe internal next sanitization, and origin resolution', () => {
  const callbackSrc = readFileSync('app/auth/callback/route.ts', 'utf8')
  assert.match(callbackSrc, /exchangeCodeForSession\(code\)/)
  assert.match(callbackSrc, /requestedNext\.startsWith\("\/"\)/)
  assert.match(callbackSrc, /!requestedNext\.startsWith\("\/\/"\)/)
  assert.match(callbackSrc, /NextResponse\.redirect\(new URL\(next, origin\)\)/)
})
