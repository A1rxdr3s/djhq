import { accessForUser } from '@/lib/products/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createUploadStore } from '@/lib/set2go/cloud/postgres-store'
import { authorizeDevelopmentUpload } from '@/lib/set2go/cloud/dev-access.mjs'
import { developmentR2FromEnv } from '@/lib/set2go/cloud/r2.mjs'

export const runtime = 'nodejs'
const uuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
async function metadata(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw Error('metadata')
  let total = 0; const chunks: Uint8Array[] = []
  while (true) { const {done,value} = await reader.read(); if(done) break; total += value.byteLength; if(total>32768) { await reader.cancel(); throw Error('metadata') } chunks.push(value) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export async function POST(request: Request) {
  try {
    const owner = await authorizeDevelopmentUpload(request, process.env, async () => {
      const db = await createSupabaseServerClient()
      const { data, error } = await db.auth.getUser()
      if (error || !data.user) return null
      return accessForUser(data.user, false).set2go ? data.user : null
    })
    if (!owner) return Response.json({error:'Cloud upload access unavailable.'},{status:404})
    const body = await metadata(request)
    const store = createUploadStore()
    if (body.action === 'create') {
      const s = await store.create(owner,new Date(Date.now()+2*60*60*1000).toISOString())
      return Response.json({id:s.id})
    }
    if (!uuid(body.session)) return Response.json({error:'Invalid cloud upload metadata.'},{status:400})
    const session = await store.get(owner,body.session)
    if (!session) return Response.json({error:'Upload session unavailable.'},{status:404})
    if (body.action === 'status') return Response.json({id:session.id,state:session.state,uncertain:session.completion_unreconciled,tracks:(session.set2go_upload_tracks ?? []).map((t: {id:string;original_name:string;declared_bytes:number;state:string}) => ({id:t.id,name:t.original_name,size:t.declared_bytes,state:t.state}))})
    if (body.action === 'cancel') {
      try { await store.enqueueCleanup(owner,body.session,'developer_cancel'); return Response.json({state:'CLEANUP_PENDING'}) }
      catch (error) {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
        if (message === 'active processing lease' || message === 'remote completion unresolved') return Response.json({error:'Cleanup is waiting for an active or unresolved operation.'},{status:409})
        throw error
      }
    }
    const leases = await store.acquireLease(owner,body.session,120)
    const lease = leases?.[0]
    if (!lease) return Response.json({error:'Upload operation busy or unavailable.'},{status:409})
    try {
      if (body.action === 'reserve') {
        if (!uuid(body.request) || typeof body.name !== 'string' || body.name.length>255 || !Number.isSafeInteger(body.size) || body.size<12 || body.size>2_000_000_000) throw Error('metadata')
        const track = await store.reserve(owner,body.session,body.request,body.name,body.size)
        return Response.json({id:track.id})
      }
      const track = (session.set2go_upload_tracks ?? []).find((t: {id:string}) => t.id === body.track)
      if (!track || !uuid(body.track)) throw Error('metadata')
      const scoped = {id:session.id,ownerId:owner,stage:session.state,tracks:(session.set2go_upload_tracks ?? []).map((t: {id:string;original_name:string;declared_bytes:number;multipart_upload_id:string|null;state:string}) => ({id:t.id,name:t.original_name,size:t.declared_bytes,uploadId:t.multipart_upload_id ?? undefined,uploaded:t.state==='UPLOADED'}))}
      const storage = developmentR2FromEnv(process.env, {
        authorizePart: async (_id: string, _owner: string, ttl: number) => store.cleanup.authorizePart(session.id,owner,ttl),
        authorizeCompletion: async () => store.cleanup.authorizeCompletion(session.id,owner,track.id),
      })
      if (body.action === 'initiate') {
        if (track.state !== 'RESERVED') return Response.json({error:'Upload initialization needs recovery.'},{status:409})
        await store.transition(owner,session.id,track.id,'INITIATING',null,null,null,lease.lease_id,lease.generation)
        const result = await storage.initiate(scoped,owner,track.id)
        const remote = scoped.tracks.find(t=>t.id===track.id)!
        await store.transition(owner,session.id,track.id,'UPLOADING',remote.uploadId ?? null,null,null,lease.lease_id,lease.generation)
        return Response.json(result)
      }
      if (body.action === 'sign') {
        if (track.state !== 'UPLOADING') throw Error('metadata')
        return Response.json(await storage.signPart(scoped,owner,track.id,body.part))
      }
      if (body.action === 'complete') {
        if(track.state==='UPLOADED') return Response.json({state:'UPLOADED'})
        if(track.state!=='UPLOADING' || !Array.isArray(body.parts) || body.parts.length !== Math.ceil(track.declared_bytes/(16*1024*1024)) || body.parts.some((p: {PartNumber: number; ETag: string} | null,i: number)=>!p || p.PartNumber!==i+1 || typeof p.ETag!=='string' || !p.ETag || p.ETag.length>256)) throw Error('metadata')
        await store.transition(owner,session.id,track.id,'VERIFYING',null,null,null,lease.lease_id,lease.generation)
        await storage.complete(scoped,owner,track.id,body.parts)
        await storage.validateHeader(scoped,owner,track.id)
        const ok = await store.cleanup.resolveRecovery(session.id,owner,track.id,lease,track.declared_bytes)
        if (!ok) throw Error('verification')
        return Response.json({state:'UPLOADED'})
      }
      throw Error('metadata')
    } finally { await store.releaseLease(owner,body.session,lease.lease_id,lease.generation).catch(()=>{}) }
  } catch { return Response.json({error:'Cloud upload operation failed. Check session status before retrying.'},{status:400}) }
}
