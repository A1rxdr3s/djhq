export async function reconcileCompletions({ store, storage, limit, execute, log = () => {}, beforeResolve = async () => {} }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw Error('Invalid recovery limit')
  const sessions = await store.recoveryCandidates(limit)
  let unresolved = 0, resolved = 0
  if (!execute) { log({ event: 'recovery_dry_run', candidates: sessions.length }); return { unresolved, resolved } }
  for (const session of sessions) {
    const lease = await store.acquireRecovery(session.id, session.owner_id)
    if (!lease) continue
    try {
      const t = session.set2go_upload_tracks.find(t => t.id === session.completion_track_id)
      if (!t || t.object_key !== `temporary/${session.id}/input/${t.id}`) throw Error('Invalid recovery scope')
      const scoped = { id: session.id, ownerId: session.owner_id, tracks: [{ id: t.id, size: t.declared_bytes, uploadId: t.multipart_upload_id }] }
      const evidence = await storage.completionEvidence(scoped, session.owner_id, t.id)
      await beforeResolve(session.id)
      const ok = await store.resolveRecovery(session.id,session.owner_id,t.id,lease,evidence.state === 'completed' ? evidence.size : null)
      if (ok) resolved++; else unresolved++
      log({ event: ok ? 'completion_resolved' : 'completion_unresolved', session: session.id })
    } catch {
      unresolved++
      try { await store.resolveRecovery(session.id,session.owner_id,session.completion_track_id,lease,null) } catch { /* Lease expiration permits retry. */ }
      log({ event: 'completion_retry', session: session.id })
    } finally { try { await store.releaseRecovery(session.id,session.owner_id,lease) } catch { /* Expiring lease survives process loss. */ } }
  }
  return { unresolved, resolved }
}
