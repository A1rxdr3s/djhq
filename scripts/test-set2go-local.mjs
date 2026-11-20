import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { statusLabel, summarizeTracks, warningSummaries } from '../app/set2go/presentation.ts'

const base = process.env.SET2GO_TEST_BASE || 'http://127.0.0.1:3123'
const origin = { Origin: base }
const fixture = await readFile('services/set2go/tests/fixtures/track_a.wav')
const fixture2 = await readFile('services/set2go/tests/fixtures/track_b.wav')
async function submit(files, gridcheck = false) {
  const form = new FormData()
  for (const [name, data] of files) form.append('files', new Blob([data]), name)
  form.append('gridcheck', String(gridcheck))
  return fetch(`${base}/api/set2go/jobs`, { method: 'POST', headers: origin, body: form, signal: AbortSignal.timeout(30000) })
}
console.log('Checking page')
assert.equal((await fetch(`${base}/set2go`, { signal: AbortSignal.timeout(30000) })).status, 200)
console.log('Checking invalid uploads and access')
assert.equal((await submit([['bad.mp3', fixture]])).status, 400)
assert.equal((await submit([['bad.wav', Buffer.from('not audio bytes')]])).status, 400)
assert.equal((await fetch(`${base}/api/set2go/jobs/not-a-job?download=1`)).status, 404)
assert.equal((await fetch(`${base}/api/set2go/jobs`, { method: 'POST', headers: { Origin: 'http://evil.example' } })).status, 404)
console.log('Submitting real audio')
const extra = process.argv[2] ? await readFile(process.argv[2]) : null
const response = await submit(extra ? [['track-a.wav', fixture], ['music.aiff', extra]] : [['../../track-a.wav', fixture], ['track-b.wav', fixture2]], !!extra)
assert.equal(response.status, 202)
let job = await response.json()
console.log('Job created:', job.id)
assert.equal(job.tracks.length, 2)
assert(!JSON.stringify(job).includes('../'))
for (let attempt = 0; attempt < 300 && job.status === 'processing'; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  job = await (await fetch(`${base}/api/set2go/jobs/${job.id}`)).json()
}
console.log('Analysis:', JSON.stringify(job))
assert.notEqual(job.status, 'processing', 'analysis timed out')
if (job.status === 'ready' || job.status === 'blocked') {
  const summary = summarizeTracks(job.tracks)
  assert(summary.complete)
  assert.equal(summary.eligible + summary.excluded, summary.total)
  for (const track of job.tracks) {
    assert.notEqual(statusLabel(track.tier), 'Analysis pending')
    assert(Array.isArray(warningSummaries(track)))
  }
}
if (job.status === 'ready') {
  assert(job.tracks.some(track => ['accepted_clean', 'accepted_with_warnings'].includes(track.tier)))
  const start = await fetch(`${base}/api/set2go/jobs/${job.id}`, { method: 'POST', headers: origin })
  assert.equal(start.status, 202)
  job = await start.json()
  for (let attempt = 0; attempt < 30 && job.status === 'exporting'; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    job = await (await fetch(`${base}/api/set2go/jobs/${job.id}`)).json()
  }
  assert.equal(job.status, 'completed')
  const zip = await fetch(`${base}/api/set2go/jobs/${job.id}?download=1`)
  assert.equal(zip.status, 200)
  assert.equal(zip.headers.get('content-type'), 'application/zip')
  const directory = await mkdtemp(path.join(os.tmpdir(), 'set2go-test-'))
  const archive = path.join(directory, 'export.zip')
  await writeFile(archive, Buffer.from(await zip.arrayBuffer()))
  let list
  try { list = execFileSync('/usr/bin/unzip', ['-Z1', archive]).toString() }
  finally { await rm(directory, { recursive: true, force: true }) }
  assert(list.includes('PIONEER/rekordbox/export.pdb'))
  assert(list.includes('PIONEER/USBANLZ/'))
  console.log('ZIP hierarchy verified')
} else if (job.status === 'blocked') {
  assert(job.tracks.every(track => ['failed', 'unresolved_needs_review'].includes(track.tier)))
  assert.equal((await fetch(`${base}/api/set2go/jobs/${job.id}`, { method: 'POST', headers: origin })).status, 409)
  console.log('No eligible tracks: export blocked')
} else {
  throw new Error(`Engine job failed: ${job.error}`)
}
console.log('Focused HTTP checks passed')
