import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { es, text, diagnostic } from '../lib/i18n/set2go.ts'
import { summarizeTracks } from '../app/set2go/presentation.ts'

test('catalog provides English and Spanish for every Set2Go key', () => {
  for (const key of Object.keys(es)) { assert.ok(text('en', key)); assert.ok(text('es', key)) }
  for (const key of ['Select tracks', 'Analyze tracks', 'Technical details', 'Generate export', 'Download ZIP']) assert.notEqual(text('en', key), text('es', key))
})
test('known errors localize and unknown diagnostics remain visible', () => {
  assert.notEqual(diagnostic('es', 'Job not found.'), 'Job not found.')
  assert.equal(diagnostic('es', 'unknown technical diagnostic'), 'unknown technical diagnostic')
})
test('track workspace labels and guarded replacement are bilingual', () => {
  for (const key of ['Add tracks', 'Tracks selected. Analysis has not started.', 'Start new selection', 'Start a new selection? Current results will be cleared.']) assert.notEqual(text('en', key), text('es', key))
  const source = readFileSync('app/set2go/set2go-client.tsx', 'utf8')
  assert.match(source, /window\.confirm\(t\('Start a new selection\?/)
  assert.match(source, /if \(busy \|\| job\) return/)
  assert.match(source, /key=\{`\$\{job.id\}-\$\{index\}`\}/)
})
test('advanced options and upload wording are localized', () => {
  assert.equal(text('es', 'Advanced options'), 'Opciones avanzadas')
  assert.equal(text('es', 'Select your tracks'), 'Selecciona tus pistas')
  assert.equal(text('es', 'Drop your tracks here'), 'Arrastra tus pistas aquí')
  assert.equal(text('es', 'choose files'), 'selecciona archivos')
  const source = readFileSync('app/set2go/set2go-client.tsx', 'utf8')
  assert.match(source, /<details className="group border-t/)
  assert.match(source, /checked=\{gridcheck\}/)
  assert.match(source, /form\.append\('gridcheck', String\(gridcheck\)\)/)
  assert.doesNotMatch(source, /onToggle=/)
})
test('locale presentation leaves eligibility and API payload construction independent', () => {
  const tracks = [{ name: 'test.wav', size: 1, tier: 'accepted_with_warnings' }]
  const before = JSON.stringify(tracks)
  text('es', 'Analyze tracks'); text('en', 'Analyze tracks')
  assert.equal(JSON.stringify(tracks), before)
  assert.equal(summarizeTracks(tracks).eligible, 1)
  const source = readFileSync('app/set2go/set2go-client.tsx', 'utf8')
  assert.match(source, /files\.forEach\(file => form\.append\('files', file\)\)/)
  assert.match(source, /form\.append\('gridcheck', String\(gridcheck\)\)/)
  assert.match(source, /function changeLocale\(next: Locale\) \{ document\.cookie = localeCookie\(next\); setLocale\(next\) \}/)
})
test('summary counts warnings independently of eligibility and keeps unknown diagnostics', async () => {
  const { warningCount, warningSummaries } = await import('../app/set2go/presentation.ts')
  const tracks = [
    { name: 'same.wav', size: 1, tier: 'accepted_with_warnings', bpm: 128.123, key: '8A', warnings: ['unknown finding'] },
    { name: 'same.wav', size: 1, tier: 'unresolved_needs_review', warnings: ['other finding'] },
    { name: 'long'.repeat(100), size: 1, tier: 'failed', errors: ['specific failure'] },
  ]
  assert.deepEqual(summarizeTracks(tracks), { total: 3, eligible: 1, warnings: 2, excluded: 2, failed: 1, complete: true })
  assert.equal(warningCount(tracks), 2)
  assert.deepEqual(warningSummaries(tracks[2]), ['specific failure'])
  for (const key of ['Track', 'Export status', 'Warnings', 'No warnings']) assert.notEqual(text('en', key), text('es', key))
})

test('known beat loss and included warnings stay separate from eligibility', async () => {
  const { exclusionSummary, includedWarningCount } = await import('../app/set2go/presentation.ts')
  const summary = exclusionSummary('model lost the beat for 11 beats[path] in one stretch')
  assert.equal(text('es', summary), 'El análisis perdió la sincronización del ritmo durante un tramo.')
  assert.equal(exclusionSummary('unknown cause'), 'unknown cause')
  const tracks = [{ name: 'a', size: 1, bpm: 135.975, tier: 'accepted_with_warnings' }, { name: 'b', size: 1, tier: 'unresolved_needs_review', warnings: ['x'] }]
  assert.equal(includedWarningCount(tracks), 1)
  assert.equal(summarizeTracks(tracks).excluded, 1)
  assert.equal(tracks[0].bpm, 135.975)
})
