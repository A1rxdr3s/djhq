import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { destinations, visibleDestinations, isAvailableDestination } from '../app/set2go/destinations.ts'
import { text } from '../lib/i18n/set2go.ts'

test('only Rekordbox is available and destination text exists in both locales', () => {
  assert.deepEqual(destinations.filter(item => item.available).map(item => item.id), ['rekordbox'])
  assert.deepEqual(visibleDestinations.map(item => item.id), ['rekordbox', 'audio-folder', 'engine-dj'])
  assert.equal(destinations.find(item => item.id === 'serato-dj').visible, false)
  assert.equal(isAvailableDestination('serato-dj'), false)
  assert.equal(text('es', destinations.find(item => item.id === 'serato-dj').status), 'Próximamente')
  for (const item of destinations) {
    assert.equal(isAvailableDestination(item.id), item.available)
    for (const locale of ['en', 'es']) { assert.ok(text(locale, item.name)); assert.ok(text(locale, item.description)); assert.ok(text(locale, item.status)) }
    if (!item.available) assert.equal(item.status, 'Coming soon')
  }
})
test('chooser and language changes preserve mounted workspace state', () => {
  const source = readFileSync('app/set2go/set2go-client.tsx', 'utf8')
  assert.match(source, /<div hidden=\{!destination\}>/)
  assert.match(source, /disabled=\{!item.available\}/)
  for (const file of ['rekordbox.svg', 'engine-dj.svg', 'serato.svg']) {
    assert.match(readFileSync(`public/images/set2go/destinations/${file}`, 'utf8'), /<svg\b/)
    assert.ok(source.includes(`/images/set2go/destinations/${file}`))
  }
  assert.match(source, /aria-pressed=\{item.available \? selected : undefined\}/)
  assert.match(source, /if \(isAvailableDestination\(item.id\)\) setChoice\(item.id\)/)
  assert.match(source, /if \(!busy\) setDestination\(null\)/)
  assert.match(source, /function changeLocale\(next: Locale\) \{ document.cookie = localeCookie\(next\); setLocale\(next\) \}/)
})
