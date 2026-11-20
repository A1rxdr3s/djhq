import { test } from 'node:test'
import assert from 'node:assert/strict'
import { en, es, message } from '../lib/i18n/messages.ts'
import { resolveLocale, localeCookie } from '../lib/i18n/locale.ts'

test('homepage dictionary keys match and English fallback exists', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort())
  for (const key of Object.keys(en)) {
    assert.ok(message('en', key))
    assert.ok(message('es', key))
  }
})

test('explicit preference wins; browser preference and English fallback work', () => {
  assert.equal(resolveLocale('en', 'es-CL,es;q=0.9'), 'en')
  assert.equal(resolveLocale('es', 'en-US'), 'es')
  assert.equal(resolveLocale(undefined, 'fr,es;q=0.8,en;q=0.6'), 'es')
  assert.equal(resolveLocale(undefined, 'fr'), 'en')
  assert.match(localeCookie('es'), /^djhq_locale=es; Path=\/; Max-Age=31536000; SameSite=Lax$/)
})

test('public pages reference every dictionary message', async () => {
  const { readFileSync } = await import('node:fs')
  const source = ['app/page.tsx', 'app/home-client.tsx', 'app/site-shell.tsx', 'app/mobile-nav.tsx', 'app/language-switch.tsx', 'app/about/page.tsx', 'app/about/about-client.tsx', 'app/account-shell.tsx'].map(path => readFileSync(path, 'utf8')).join('\n')
  for (const key of Object.keys(en)) assert.match(source, new RegExp(`["']${key}["']`), `unused message: ${key}`)
})

test('invalid preference falls back to the supported browser languages', () => {
  assert.equal(resolveLocale('fr', 'es;q=0,en;q=0.7'), 'en')
  assert.equal(resolveLocale('', null), 'en')
  assert.match(localeCookie('en'), /^djhq_locale=en;/)
})
