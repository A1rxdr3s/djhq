import assert from 'node:assert/strict'
import { keySource, statusLabel, summarizeTracks, warningCount, warningSummaries } from '../app/set2go/presentation.ts'

const tracks = [
  { name: 'clean', size: 1, tier: 'accepted_clean', bpm: 126, key: '3A' },
  { name: 'warning', size: 1, tier: 'accepted_with_warnings', warnings: ['downbeat review required: model_predicted_unstable', 'unfamiliar engine diagnostic'] },
  { name: 'review', size: 1, tier: 'unresolved_needs_review', errors: ['fewer than 16 model beats'] },
  { name: 'failed', size: 1, tier: 'failed', errors: ['audio analysis failed'] },
]
assert.deepEqual(summarizeTracks(tracks), { total: 4, eligible: 2, warnings: 1, excluded: 2, failed: 1, complete: true })
assert.equal(summarizeTracks([{ name: 'pending', size: 1 }]).complete, false)
assert.deepEqual(summarizeTracks([]), { total: 0, eligible: 0, warnings: 0, excluded: 0, failed: 0, complete: false })
assert.deepEqual(summarizeTracks([{ name: 'processing', size: 1 }, tracks[1]]), { total: 2, eligible: 1, warnings: 1, excluded: 0, failed: 0, complete: false })
assert.equal(summarizeTracks([tracks[1], tracks[2]]).eligible, 1)
assert.equal(summarizeTracks([tracks[1], tracks[2]]).excluded, 1)
assert.equal(warningCount([tracks[1], { ...tracks[2], warnings: ['review'] }]), 2)
assert.equal(warningCount([{ name: 'pending', size: 1 }]), 0)
assert.equal(statusLabel('accepted_with_warnings'), 'Exportable — review recommended')
assert.equal(statusLabel('unresolved_needs_review'), 'Excluded — needs review')
assert.equal(statusLabel('failed'), 'Analysis failed — excluded')
assert.deepEqual(warningSummaries(tracks[1]), ['Beat-grid alignment may need review.', 'Additional analysis details need attention.'])
assert.deepEqual(tracks[1].warnings, ['downbeat review required: model_predicted_unstable', 'unfamiliar engine diagnostic'])
assert.equal(keySource('Mixed In Key payload (self-declared; reading metadata, not detection)'), 'Key read from file metadata (Mixed In Key).')
assert.equal(keySource('embedded tag (writer unknown; reading metadata, not detection)'), 'Key read from file metadata; original source unknown.')
assert.equal(keySource('audio prediction from libkeyfinder (unverified)'), 'Key predicted by analysis; not verified.')
assert.equal(keySource(null), 'Key source unavailable.')
assert.equal(keySource('unexpected source'), 'Key source unavailable.')
assert.equal(tracks[0].bpm, 126)
assert.equal(tracks[0].key, '3A')
console.log('Set2Go presentation checks passed')
