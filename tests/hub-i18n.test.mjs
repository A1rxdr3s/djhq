import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hub } from '../lib/i18n/hub.ts'
import { resolveLocale, localeCookie, LOCALE_COOKIE } from '../lib/i18n/locale.ts'

const keys = ['title', 'welcome', 'subtitle', 'empty', 'websiteDesc', 'set2goAction', 'signOut']

test('hub has distinct Spanish copy and never returns empty text', () => {
  for (const k of keys) { assert.ok(hub('es', k)); assert.notEqual(hub('es', k), hub('en', k)) }
})

test('cookie preference wins; browser language is the first-visit default; English fallback', () => {
  assert.equal(resolveLocale('es', 'en-US'), 'es')
  assert.equal(resolveLocale(undefined, 'es-CL,es;q=0.9,en;q=0.8'), 'es')
  assert.equal(resolveLocale(undefined, 'fr-FR'), 'en')
  assert.equal(resolveLocale('xx', null), 'en')
})

test('shared cookie is long-lived, site-wide and holds only the locale', () => {
  const c = localeCookie('es')
  assert.equal(c, `${LOCALE_COOKIE}=es; Path=/; Max-Age=31536000; SameSite=Lax`)
})

import { wm } from '../lib/i18n/website.ts'
test('website manager shell translates known labels, passes artist content through', () => {
  assert.equal(wm('es', 'Releases'), 'Lanzamientos')
  assert.equal(wm('en', 'Releases'), 'Releases')
  assert.equal(wm('es', 'Some Artist Name'), 'Some Artist Name')
})
test('cookie adds Secure on HTTPS only', () => {
  assert.ok(localeCookie('en', true).endsWith('; Secure'))
  assert.ok(!localeCookie('en', false).includes('Secure'))
})

import { readFileSync } from 'node:fs'
import { websiteKeys } from '../lib/i18n/website.ts'
const client = readFileSync(new URL('../app/dashboard/dashboard-client.tsx', import.meta.url), 'utf8')
const onboarding = readFileSync(new URL('../app/dashboard/onboarding-form.tsx', import.meta.url), 'utf8')
const identical = new Set(['Pro', 'PRO', 'Shows', 'Sets', 'Videos', 'Original Mix', 'Extended Mix', 'Radio Edit', 'Remix', 'Club Mix', 'Dub Mix', 'Instrumental', 'VIP Mix', 'Mashup', 'Festival', 'Mono', 'Remixer', 'Demos', 'Favicon', 'Video', 'Set', 'URL', 'Zoom', 'Logo', 'Open Graph', 'Twitter / X', 'Stay Connected', 'House, Techno, Melodic', 'House, Tech House, Melodic', 'HRS', 'Horizontal', 'Vertical', 'Color *', 'Editorial', 'Hero Logo'.length ? 'Cinemático' : ''])

test('every tr("…") literal in the Website Manager has a Spanish entry', () => {
  const known = new Set(websiteKeys())
  const used = new Set()
  for (const src of [client, onboarding]) for (const m of src.matchAll(/\btr\(("(?:[^"\\]|\\.)*")\)/g)) used.add(JSON.parse(m[1]))
  const missing = [...used].filter(k => k && !known.has(k))
  assert.deepEqual(missing, [])
  assert.ok(used.size > 400, `expected broad coverage, got ${used.size}`)
})

test('Spanish text differs from English except for deliberate identity entries', () => {
  const same = websiteKeys().filter(k => wm('es', k) === k && !identical.has(k) && /[a-z]{4,}/i.test(k) && !/^https?:|^e\.g\./.test(k))
  assert.ok(same.length < 15, `suspicious untranslated entries: ${same.join(' | ')}`)
})

test('interpolation-sensitive message keys keep their punctuation', () => {
  assert.equal(wm('es', 'Processing failed:'), 'Falló el procesamiento:')
  assert.equal(wm('es', 'Upcoming\nShows'), 'Próximos\nShows')
  assert.equal(wm('es', 'Artist name: unknown'), 'Artist name: unknown')
})

import { message } from '../lib/i18n/messages.ts'
const signInKeys = ['signInTitle', 'signInDescription', 'signInMetaTitle', 'signInRedirecting', 'signInOrEmail', 'signInSending', 'signInMagicLink', 'signInSent', 'signInGenericError']
test('sign-in copy exists in both languages', () => {
  for (const k of signInKeys) { assert.ok(message('en', k)); assert.ok(message('es', k)); assert.notEqual(message('en', k), message('es', k)) }
})
test('sign-in keeps the original Supabase auth calls and callbacks', () => {
  const src = readFileSync(new URL('../app/sign-in/sign-in-client.tsx', import.meta.url), 'utf8')
  assert.match(src, /signInWithOAuth\(\{\s*provider: "google",\s*options: \{\s*redirectTo/)
  assert.match(src, /\$\{window\.location\.origin\}\/auth\/callback/)
  assert.match(src, /signInWithOtp\(\{\s*email,\s*options: \{\s*emailRedirectTo/)
  assert.match(src, /\$\{window\.location\.origin\}\/auth\/callback\?next=\/hq/)
})

test('hub status labels: Set2Go stays an accurate development status, Website has none', () => {
  assert.equal(hub('en', 'set2goStatus'), 'In development')
  assert.equal(hub('es', 'set2goStatus'), 'En desarrollo')
  assert.ok(!/active|live|activo/i.test(hub('en', 'set2goStatus') + hub('es', 'set2goStatus')))
  const page = readFileSync(new URL('../app/hq/page.tsx', import.meta.url), 'utf8')
  assert.ok(page.indexOf("id: 'set2go'") < page.indexOf("id: 'website'"))
  assert.match(page, /id: 'website'[\s\S]*?hasStatus: false/)
  assert.match(page, /products\.filter\(product => workspace\.access\[product\.id\]\)/)
})
