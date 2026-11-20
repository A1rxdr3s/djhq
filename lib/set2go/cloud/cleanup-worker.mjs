// Claims authorize only irreversible, session-scoped cleanup. A reclaimed claim
// can repeat the same deletes; it cannot reactivate the session or reuse its keys.
export async function runCleanup({ store, storage, limit = 1, execute = false, log = () => {}, afterDelete = async () => {} }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw Error('Invalid batch limit')
  if (!execute) { const candidates = await store.candidates(limit); log({ event: 'dry_run', candidates: candidates.length }); return { failed: 0, completed: 0 } }
  let failed = 0, completed = 0
  for (let i = 0; i < limit; i++) {
    const claim = await store.claim(120)
    if (!claim) break
    const id = claim.session_id
    try {
      const session = await store.snapshot(id)
      if (session.id !== id || session.state !== 'CLEANUP_PENDING') throw Error('Invalid cleanup authorization')
      log({ event: 'claimed', session: id })
      await storage.abortMultipartForJob(id)
      await storage.deleteJobObjects(id)
      const remaining = await storage.inspectJob(id)
      if (remaining.objects !== 0 || remaining.multipart !== 0) throw Error('Remote cleanup incomplete')
      await afterDelete(id)
      if (!await store.finish(id, claim.claim_id, true)) throw Error('Cleanup claim expired')
      completed++
      log({ event: 'cleaned', session: id })
    } catch {
      failed++
      try {
        const session = await store.snapshot(id)
        await store.finish(id, claim.claim_id, false, Math.min(3600, 30 * 2 ** Math.min(session.cleanup_retry_count, 7)))
      } catch { /* Persisted claim expires; the next worker reclaims it. */ }
      log({ event: 'retry_pending', session: id })
    }
  }
  return { failed, completed }
}
