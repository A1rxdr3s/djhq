// The metadata API authorizes and persists every operation; only Blob slices reach R2.
/** @param {string} url @param {Blob} blob @param {AbortSignal|undefined} signal @param {(bytes:number)=>void} onProgress */
export function uploadPartXHR(url, blob, signal, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Canceled', 'AbortError'))
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const finish = () => signal?.removeEventListener('abort', abort)
    xhr.open('PUT', url)
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded) }
    xhr.onload = () => {
      finish()
      const etag = xhr.getResponseHeader('ETag')
      if (xhr.status >= 200 && xhr.status < 300 && etag) return resolve(etag)
      const error = new Error(xhr.status >= 200 && xhr.status < 300 ? 'Upload ETag is unavailable' : `Upload request failed (${xhr.status})`)
      error.retryable = xhr.status === 408 || xhr.status === 429 || xhr.status >= 500
      reject(error)
    }
    xhr.onerror = () => { finish(); reject(Object.assign(new Error('Upload network error'), { retryable: true })) }
    xhr.onabort = () => { finish(); reject(new DOMException('Canceled', 'AbortError')) }
    signal?.addEventListener('abort', abort, { once: true })
    xhr.send(blob)
  })
}

// Sequential parts avoid unbounded memory and simplify reliable retry/cancellation.
// Progress can fall after a failed attempt: it reflects the current transfer attempt.
/** @param {{file:Blob,partSize:number,signPart:(part:number,signal?:AbortSignal)=>Promise<string>,complete:(parts:Array<{PartNumber:number,ETag:string}>,signal?:AbortSignal)=>Promise<unknown>,abortRemote:()=>Promise<unknown>,signal?:AbortSignal,onProgress?:(bytes:number,total:number)=>void,sendPart?:(url:string,blob:Blob,signal:AbortSignal|undefined,onProgress:(bytes:number)=>void)=>Promise<string>,wait?:(ms:number)=>Promise<unknown>,maxAttempts?:number}} options */
export async function uploadFileParts({ file, partSize, signPart, complete, abortRemote, signal, onProgress = () => {}, sendPart = uploadPartXHR, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), maxAttempts = 3 }) {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || !Number.isSafeInteger(partSize) || partSize < 5 * 1024 * 1024 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new Error('Invalid upload parameters')
  const totalParts = Math.ceil(file.size / partSize)
  if (totalParts > 10000) throw new Error('Too many parts')
  const parts = []
  let completed = 0
  let completing = false
  try {
    for (let i = 1; i <= totalParts; i++) {
      const blob = file.slice((i - 1) * partSize, Math.min(i * partSize, file.size))
      let etag
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (signal?.aborted) throw new DOMException('Canceled', 'AbortError')
        try {
          const url = await signPart(i, signal)
          if (signal?.aborted) throw new DOMException('Canceled', 'AbortError')
          etag = await sendPart(url, blob, signal, loaded => onProgress(Math.min(file.size, completed + Math.min(blob.size, loaded)), file.size))
          if (!etag) throw new Error('Missing ETag')
          break
        } catch (error) {
          if (signal?.aborted || error?.name === 'AbortError' || error?.retryable === false || attempt === maxAttempts - 1) throw error
          onProgress(completed, file.size)
          await wait(250 * 2 ** attempt + Math.floor(Math.random()*100))
        }
      }
      completed += blob.size
      parts.push({ PartNumber: i, ETag: etag })
      onProgress(completed, file.size)
    }
    if (signal?.aborted) throw new DOMException('Canceled', 'AbortError')
    completing = true
    await complete(parts, signal)
  } catch (error) {
    // Completion can succeed remotely even when its response is lost. Preserve
    // the object for server-side reconciliation instead of deleting it.
    if (completing) throw new AggregateError([error], 'Upload completion is unconfirmed; reconciliation required')
    // A failed cleanup must be recorded and retried by the metadata service.
    try { await abortRemote() } catch { throw new AggregateError([error], 'Upload failed and cleanup could not be confirmed') }
    throw error
  }
}
