import 'server-only'
import { createCleanupStore } from './cleanup-store.mjs'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Upload signing remains disabled. Callers must independently establish identity
// and Set2Go entitlement before constructing or invoking this privileged store.
export function createUploadStore() {
  const db = createSupabaseAdminClient()
  return {
    cleanup: createCleanupStore(db),
    async create(ownerId: string, expiresAt: string) {
      const { data, error } = await db.rpc('set2go_create_upload_session', { p_owner: ownerId, p_expires: expiresAt })
      if (error) throw error
      return Array.isArray(data) ? data[0] : data
    },
    async get(ownerId: string, sessionId: string) {
      const { data, error } = await db.from('set2go_upload_sessions').select('id,state,expires_at,completion_unreconciled,set2go_upload_tracks(*)').eq('owner_id', ownerId).eq('id', sessionId).maybeSingle()
      if (error) throw error
      return data
    },
    async reserve(ownerId: string, sessionId: string, requestKey: string, name: string, size: number) {
      const { data, error } = await db.rpc('set2go_reserve_track', { p_session: sessionId, p_owner: ownerId, p_request: requestKey, p_name: name, p_size: size })
      if (error) throw error
      return Array.isArray(data) ? data[0] : data
    },
    async enqueueCleanup(ownerId: string, sessionId: string, reason: string) {
      const { data, error } = await db.rpc('set2go_enqueue_cleanup', { p_owner: ownerId, p_session: sessionId, p_reason: reason })
      if (error) throw error
      return data
    },
    async claimCleanup(seconds: number) {
      const { data, error } = await db.rpc('set2go_claim_cleanup', { p_seconds: seconds })
      if (error) throw error
      return data
    },
    async finishCleanup(sessionId: string, claimId: string, success: boolean, category: string | null = null, delaySeconds = 60) {
      const { data, error } = await db.rpc('set2go_finish_cleanup', { p_session: sessionId, p_claim: claimId, p_success: success, p_category: category, p_delay: delaySeconds })
      if (error) throw error
      return data
    },
    async acquireLease(ownerId: string, sessionId: string, seconds: number) {
      const { data, error } = await db.rpc('set2go_acquire_lease', { p_owner: ownerId, p_session: sessionId, p_seconds: seconds })
      if (error) throw error
      return data
    },
    async renewLease(ownerId: string, sessionId: string, leaseId: string, generation: number, seconds: number) {
      const { data, error } = await db.rpc('set2go_renew_lease', { p_owner: ownerId, p_session: sessionId, p_lease: leaseId, p_generation: generation, p_seconds: seconds })
      if (error) throw error
      return data
    },
    async releaseLease(ownerId: string, sessionId: string, leaseId: string, generation: number) {
      const { data, error } = await db.rpc('set2go_release_lease', { p_owner: ownerId, p_session: sessionId, p_lease: leaseId, p_generation: generation })
      if (error) throw error
      return data
    },
    async recordCleanupRetry(ownerId: string, sessionId: string, trackId: string, category: string, nextRetry: string, leaseId: string | null = null, generation: number | null = null) {
      const { data, error } = await db.rpc('set2go_cleanup_retry', { p_session: sessionId, p_owner: ownerId, p_track: trackId, p_category: category, p_next: nextRetry, p_lease: leaseId, p_generation: generation })
      if (error) throw error
      return data
    },
    async pendingCleanup(ownerId: string, sessionId: string) {
      const { data, error } = await db.from('set2go_upload_sessions').select('id,state,set2go_upload_tracks(*)').eq('owner_id', ownerId).eq('id', sessionId).eq('set2go_upload_tracks.state', 'CLEANUP_PENDING').maybeSingle()
      if (error) throw error
      return data
    },
    // verifiedBytes must originate from an authenticated R2 HEAD operation.
    async transition(ownerId: string, sessionId: string, trackId: string, next: string, uploadId: string | null = null, verifiedBytes: number | null = null, category: string | null = null, leaseId: string | null = null, generation: number | null = null) {
      const { data, error } = await db.rpc('set2go_transition_track', { p_session: sessionId, p_owner: ownerId, p_track: trackId, p_next: next, p_upload_id: uploadId, p_verified_bytes: verifiedBytes, p_error: category, p_lease: leaseId, p_generation: generation })
      if (error) throw error
      return Array.isArray(data) ? data[0] : data
    },
  }
}
