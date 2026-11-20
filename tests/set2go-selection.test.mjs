import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSelection, removeSelection, selectionSize, analyzeLabel } from '../app/set2go/selection.ts'

test('selection, addition, removal and size preserve ordering', () => {
  const a = { name: 'a.wav', size: 3 }, b = { name: 'b.flac', size: 5 }
  const initial = validateSelection([], [a], false)
  const added = validateSelection(initial.files, [b], true)
  assert.deepEqual(added.files, [a, b]); assert.equal(selectionSize(added.files), 8)
  assert.deepEqual(removeSelection(added.files, 0), [b]); assert.deepEqual(removeSelection([b], 0), [])
})
test('invalid additions retain prior selection and enforce limits', () => {
  const a = { name: 'a.wav', size: 1 }
  for (const incoming of [[{ name: 'bad.mp3', size: 1 }], Array(20).fill(a), [{ name: 'big.wav', size: 200 * 1024 * 1024 }]]) {
    const result = validateSelection([a], incoming, true)
    assert.ok(result.error); assert.deepEqual(result.files, [a])
  }
})
test('analysis labels use correct locale and number', () => {
  assert.equal(analyzeLabel('en', 1), 'Analyze 1 track'); assert.equal(analyzeLabel('en', 3), 'Analyze 3 tracks')
  assert.equal(analyzeLabel('es', 1), 'Analizar 1 pista'); assert.equal(analyzeLabel('es', 3), 'Analizar 3 pistas')
})

test('20 tracks and the temporary byte ceiling are enforced consistently', () => {
  const files = Array.from({ length: 20 }, (_, i) => ({ name: 'duplicate.wav', size: i ? 1 : 200 * 1024 * 1024 - 19 }))
  assert.equal(validateSelection([], files, false).error, '')
  assert.ok(validateSelection([], [...files, files[0]], false).error)
  assert.ok(validateSelection([], [{ name: 'large.wav', size: 200 * 1024 * 1024 + 1 }], false).error)
  assert.ok(validateSelection([], [{ name: 'empty.wav', size: 0 }], false).error)
  assert.ok(validateSelection([], [{ name: 'target.wav', size: 2_000_000_000 }], false).error)
})
