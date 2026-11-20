import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uploadFileParts } from '../lib/set2go/cloud/browser-upload.mjs'

test('retries a failed part, completes with ordered ETags and reports real progress', async () => {
  const file = new Blob([new Uint8Array(6 * 1024 * 1024)])
  let attempts = 0; const seen = []; let result
  await uploadFileParts({ file, partSize: 5 * 1024 * 1024, signPart: async n => String(n), wait: async () => {}, abortRemote: async () => assert.fail(), complete: async p => { result = p }, onProgress: n => seen.push(n), sendPart: async (url, blob, _signal, onProgress) => { if (url === '1' && attempts++ === 0) { onProgress(10); throw Error('network') } onProgress(blob.size); return `etag-${url}` } })
  assert.deepEqual(result, [{ PartNumber: 1, ETag: 'etag-1' }, { PartNumber: 2, ETag: 'etag-2' }])
  assert.equal(seen.at(-1), file.size)
  assert.ok(seen.includes(0))
})
test('cancellation aborts remotely and never completes', async () => {
  const controller = new AbortController(); let aborted = 0
  await assert.rejects(uploadFileParts({ file: new Blob(['audio']), partSize: 5 * 1024 * 1024, signal: controller.signal, signPart: async () => 'url', sendPart: async () => { controller.abort(); throw new DOMException('Canceled', 'AbortError') }, complete: async () => assert.fail(), abortRemote: async () => { aborted++ } }), { name: 'AbortError' })
  assert.equal(aborted, 1)
})

test('ambiguous completion does not abort a potentially completed object', async () => {
  let aborted = 0
  await assert.rejects(uploadFileParts({ file: new Blob(['audio']), partSize: 5 * 1024 * 1024, signPart: async () => 'url', sendPart: async () => 'etag', complete: async () => { throw Error('connection lost') }, abortRemote: async () => { aborted++ } }), /completion is unconfirmed/)
  assert.equal(aborted, 0)
})

test('parts stay bounded and permanent authorization failures are not retried', async () => {
  const file=new Blob([new Uint8Array(17*1024*1024)])
  file.arrayBuffer=async()=>assert.fail('whole-file buffering')
  let active=0,max=0,signs=0,largest=0
  await uploadFileParts({file,partSize:16*1024*1024,signPart:async()=>{signs++;return 'url'},sendPart:async(_url,part)=>{active++;max=Math.max(max,active);largest=Math.max(largest,part.size);await Promise.resolve();active--;return 'etag'},complete:async()=>{},abortRemote:async()=>assert.fail()})
  assert.equal(max,1);assert.equal(signs,2);assert.equal(largest,16*1024*1024)
  let denied=0
  await assert.rejects(uploadFileParts({file:new Blob(['data']),partSize:5*1024*1024,signPart:async()=>{denied++;throw Object.assign(Error('denied'),{retryable:false})},complete:async()=>assert.fail(),abortRemote:async()=>{}}))
  assert.equal(denied,1)
})

test('permanent signed-upload HTTP failures are not retried', async () => {
  const previous = globalThis.XMLHttpRequest
  let signs = 0, aborts = 0
  globalThis.XMLHttpRequest = class {
    upload = {}
    status = 403
    open() {}
    getResponseHeader() { return null }
    send() { this.onload() }
  }
  try {
    await assert.rejects(uploadFileParts({file:new Blob(['audio']),partSize:5*1024*1024,signPart:async()=>{signs++;return 'url'},complete:async()=>assert.fail(),abortRemote:async()=>{aborts++}}), /403/)
    assert.equal(signs,1)
    assert.equal(aborts,1)
  } finally {
    if (previous === undefined) delete globalThis.XMLHttpRequest
    else globalThis.XMLHttpRequest = previous
  }
})
