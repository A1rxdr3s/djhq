import assert from 'node:assert/strict'
import { interpretReport } from '../lib/set2go/jobs.ts'

const tiers = ['accepted_clean', 'accepted_with_warnings', 'unresolved_needs_review', 'failed']
const tracks = tiers.map((tier, index) => ({ stored: `track-${index}.wav`, name: tier, size: 1 }))
const entries = Object.fromEntries(tracks.map((track, index) => {
  const eligible = index < 2
  return [track.stored, { bpm: { value: 120 }, key: { effective: null, provenance: null }, grid: { status: eligible ? 'accepted' : 'failed' }, review_reasons: [], failures: index === 3 ? { audio: '/private/audio' } : {}, export_eligibility: { tier: tiers[index], eligible, exported: eligible, excluded: !eligible, warning_reasons: index === 1 ? ['review'] : [], blocking_reasons: eligible ? [] : ['requires review'] } }]
}))
const report = { contract_version: '1.0', tracks: entries }
interpretReport(tracks, report, '/private')
assert.deepEqual(tracks.map(track => track.tier), tiers)
assert.deepEqual(tracks[1].warnings, ['review'])
assert.deepEqual(tracks[3].errors, ['requires review', 'audio analysis failed'])
entries['track-2.wav'].export_eligibility.eligible = true
assert.throws(() => interpretReport(tracks, report, '/private'), /inconsistent/)
assert.throws(() => interpretReport(tracks, { ...report, contract_version: '2.0' }, '/private'), /incomplete/)
console.log('Contract classification and exclusion checks passed')
