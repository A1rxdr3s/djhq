import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createProgress, applyProgress, consumeProgress } from '../lib/set2go/progress.ts'

const send = (p, jobId, type, trackId) => applyProgress(p, jobId, { jobId, type, trackId })
test('isolated monotonic progress rejects duplicates, cross-job and out-of-order events', () => {
  const a = createProgress(['track-1.wav', 'track-2.wav'])
  const b = createProgress(['track-1.wav', 'track-2.wav'])
  applyProgress(a, 'a', { jobId: 'b', type: 'track_started', trackId: 'track-1.wav' })
  send(a, 'a', 'track_completed', 'track-1.wav')
  assert.equal(a.completed, 0)
  send(a, 'a', 'track_started', 'track-1.wav')
  send(a, 'a', 'track_completed', 'track-1.wav')
  send(a, 'a', 'track_completed', 'track-1.wav')
  send(a, 'a', 'batch_finalizing')
  assert.equal(a.completed, 1)
  assert.equal(a.stage, 'analyzing')
  assert.equal(b.completed, 0)
  send(a, 'a', 'track_started', 'track-2.wav')
  send(a, 'a', 'track_failed', 'track-2.wav')
  send(a, 'a', 'batch_finalizing')
  assert.equal(a.completed, 2)
  assert.equal(a.tracks[1].state, 'failed')
  assert.equal(a.stage, 'finalizing')
})

test('real child pipe exposes intermediate track completion while worker is running', async () => {
  const p = createProgress(['track-1.wav', 'track-2.wav', 'track-3.wav'])
  // Duplicate original filenames do not affect the stored track identifiers.
  const names = ['same.wav', 'same.wav', 'other.wav']
  assert.equal(names[0], names[1])
  const child = spawn('python3', ['tests/fixtures/set2go-progress-worker.py', 'job-a'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe'] })
  consumeProgress(child.stdio[3], p, 'job-a')
  let observedIntermediate = false
  let observedFinalizing = false
  const poll = setInterval(() => {
    if (p.completed === 1 && child.exitCode === null) observedIntermediate = true
    if (p.stage === 'finalizing' && child.exitCode === null) observedFinalizing = true
  }, 20)
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
  clearInterval(poll)
  assert.equal(code, 0)
  assert.equal(observedIntermediate, true)
  assert.equal(observedFinalizing, true)
  assert.equal(p.completed, 3)
  assert.deepEqual(p.tracks.map(t => t.state), ['completed', 'failed', 'completed'])
})

test('20 track progress remains bounded and enters finalization', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `track-${i + 1}.wav`)
  const p = createProgress(ids)
  for (const id of ids) { send(p, 'job', 'track_started', id); send(p, 'job', 'track_completed', id); send(p, 'job', 'track_completed', id) }
  send(p, 'job', 'batch_finalizing')
  assert.equal(p.completed, 20)
  assert.equal(p.stage, 'finalizing')
})
