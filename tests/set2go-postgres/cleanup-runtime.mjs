// Loaded only by the CLI's explicitly gated test-runtime path.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const file = process.env.SET2GO_FAKE_R2_STATE
const sql = query => JSON.parse(execFileSync('/opt/homebrew/opt/postgresql@17/bin/psql',['-X','-At','-v','ON_ERROR_STOP=1','-c',query],{encoding:'utf8'}).trim() || 'null')
const literal = value => { if (!/^[0-9a-f-]{36}$/i.test(value)) throw Error('Invalid fixture UUID'); return `'${value}'` }
function read() { return JSON.parse(readFileSync(file,'utf8')) }
function save(x) { writeFileSync(file,JSON.stringify(x)) }
export async function createRuntime() {
 return {
  store: {
   recoveryCandidates: async () => sql("select coalesce(json_agg(x),'[]') from (select s.id,s.owner_id,s.completion_track_id,(select json_agg(t) from public.set2go_upload_tracks t where t.session_id=s.id) as set2go_upload_tracks from public.set2go_upload_sessions s where completion_unreconciled and (completion_next_retry is null or completion_next_retry<=clock_timestamp())) x"),
   acquireRecovery: async (id,owner) => sql(`select row_to_json(x) from public.set2go_acquire_lease(${literal(id)},${literal(owner)},120) x`),
   resolveRecovery: async (id,owner,track,lease,size) => sql(`select to_json(public.set2go_resolve_completion(${literal(id)},${literal(owner)},${literal(track)},${literal(lease.lease_id)},${lease.generation},${size??'null'}))`),
   releaseRecovery: async (id,owner,lease) => sql(`select to_json(public.set2go_release_lease(${literal(id)},${literal(owner)},${literal(lease.lease_id)},${lease.generation}))`),
   candidates: async () => sql("select coalesce(json_agg(x),'[]') from (select id from public.set2go_upload_sessions where state='CLEANUP_PENDING') x"),
   claim: async seconds => sql(`select row_to_json(x) from public.set2go_claim_cleanup(${seconds}) x`),
   snapshot: async id => sql(`select row_to_json(x) from (select id,state,cleanup_retry_count from public.set2go_upload_sessions where id=${literal(id)}) x`),
   finish: async (id,claim,success,delay=60) => sql(`select to_json(public.set2go_finish_cleanup(${literal(id)},${literal(claim)},${success},${success?'null':"'storage_or_confirmation'"},${delay}))`),
  },
  storage: {
   completionEvidence: async session => { const x=read(); if(x.id!==session.id) throw Error('Cross-session'); if(x.transient) {x.transient=false;save(x);throw Error('temporary')} return x.evidence },
   abortMultipartForJob: async id => { const x=read(); if(x.id!==id) throw Error('Cross-session'); x.abortCalls++; x.multipart=false; save(x) },
   deleteJobObjects: async id => { const x=read(); if(x.id!==id) throw Error('Cross-session'); x.deleteCalls++; if(x.failOnce) {x.failOnce=false;save(x);throw Error('temporary')} x.present=false;save(x) },
   inspectJob: async id => { const x=read(); if(x.id!==id) throw Error('Cross-session'); return {objects:x.present?1:0,multipart:x.multipart?1:0} },
  },
  beforeResolve: async () => { if(process.env.SET2GO_TEST_CRASH==='before-resolve') process.exit(89) },
  afterDelete: async () => { if (process.env.SET2GO_TEST_CRASH==='after-delete') process.exit(88) },
 }
}
