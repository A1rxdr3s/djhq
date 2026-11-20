// Shared by the server-only store and the CLI. Callers supply the established
// privileged Supabase client; this module never loads credentials.
export function createCleanupStore(db) {
  async function rpc(name, args) { const { data, error } = await db.rpc(name, args); if (error) throw error; return data }
  return {
    async recoveryCandidates(limit) { const { data,error } = await db.from('set2go_upload_sessions').select('id,owner_id,completion_track_id,set2go_upload_tracks(*)').eq('completion_unreconciled',true).or('completion_next_retry.is.null,completion_next_retry.lte.'+new Date().toISOString()).limit(limit); if(error) throw error; return data },
    async acquireRecovery(id, owner) { return (await rpc('set2go_acquire_lease',{p_session:id,p_owner:owner,p_seconds:120}))?.[0] ?? null },
    async resolveRecovery(id, owner, track, lease, size) { return rpc('set2go_resolve_completion',{p_session:id,p_owner:owner,p_track:track,p_lease:lease.lease_id,p_generation:lease.generation,p_verified:size}) },
    async releaseRecovery(id, owner, lease) { return rpc('set2go_release_lease',{p_session:id,p_owner:owner,p_lease:lease.lease_id,p_generation:lease.generation}) },
    async candidates(limit) { const { data, error } = await db.from('set2go_upload_sessions').select('id').eq('state', 'CLEANUP_PENDING').limit(limit); if (error) throw error; return data },
    async claim(seconds) { return (await rpc('set2go_claim_cleanup', { p_seconds: seconds }))?.[0] ?? null },
    async snapshot(sessionId) { const { data, error } = await db.from('set2go_upload_sessions').select('id,state,cleanup_retry_count').eq('id',sessionId).single(); if (error) throw error; return data },
    async finish(sessionId, claimId, success, delay = 60) { return rpc('set2go_finish_cleanup', { p_session: sessionId, p_claim: claimId, p_success: success, p_category: success ? null : 'storage_or_confirmation', p_delay: delay }) },
    async authorizeCompletion(sessionId, ownerId, trackId) { return rpc('set2go_begin_remote_completion', { p_session: sessionId, p_owner: ownerId, p_track: trackId }) },
    async authorizePart(sessionId, ownerId, ttl) { return rpc('set2go_record_upload_capability', { p_session: sessionId, p_owner: ownerId, p_seconds: ttl }) },
  }
}
