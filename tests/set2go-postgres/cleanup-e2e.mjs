import { execFileSync, spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const sql = q => execFileSync('/opt/homebrew/opt/postgresql@17/bin/psql',['-X','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim()
const owner='00000000-0000-0000-0000-000000000001'
const file=process.env.SET2GO_FAKE_R2_STATE
function fixture(failOnce=false) {
 const id=sql(`select (public.set2go_create_upload_session('${owner}',now()+interval '1 hour')).id`)
 sql(`select public.set2go_reserve_track('${id}','${owner}','one','fixture.wav',12); select public.set2go_enqueue_cleanup('${id}','${owner}','test'); update public.set2go_upload_sessions set upload_capabilities_expire_at=clock_timestamp()-interval '1 second' where id='${id}'`)
 writeFileSync(file,JSON.stringify({id,present:true,multipart:true,abortCalls:0,deleteCalls:0,failOnce}))
 return id
}
function cli(extra={}) {
 const r=spawnSync(process.execPath,['services/set2go/scripts/cleanup-cloud.mjs','--execute','--limit','1','--test-runtime','tests/set2go-postgres/cleanup-runtime.mjs'],{env:{...process.env,...extra},encoding:'utf8'})
 process.stdout.write(r.stdout)
 return r
}
const state=id=>sql(`select state from public.set2go_upload_sessions where id='${id}'`)
let id=fixture();
const preview=spawnSync(process.execPath,['services/set2go/scripts/cleanup-cloud.mjs','--dry-run','--test-runtime','tests/set2go-postgres/cleanup-runtime.mjs'],{env:process.env,encoding:'utf8'})
assert.equal(preview.status,0);assert.equal(JSON.parse(readFileSync(file)).present,true)
assert.equal(cli().status,0);assert.equal(state(id),'CLEANED');assert.equal(JSON.parse(readFileSync(file)).present,false)
console.log('E2E success: PostgreSQL claim -> fake R2 abort/delete -> PostgreSQL CLEANED')
id=fixture(true);assert.equal(cli().status,1);assert.equal(state(id),'CLEANUP_PENDING');assert.equal(sql(`select cleanup_retry_count from public.set2go_upload_sessions where id='${id}'`),'1');sql(`update public.set2go_upload_sessions set cleanup_next_retry=clock_timestamp()-interval '1 second' where id='${id}'`);assert.equal(cli().status,0);assert.equal(state(id),'CLEANED')
console.log('E2E temporary deletion failure -> persisted retry -> successful retry')
id=fixture();assert.equal(cli({SET2GO_TEST_CRASH:'after-delete'}).status,88);assert.equal(state(id),'CLEANUP_PENDING');assert.equal(JSON.parse(readFileSync(file)).present,false);sql(`update public.set2go_upload_sessions set cleanup_claim_expires_at=clock_timestamp()-interval '1 second' where id='${id}'`);assert.equal(cli().status,0);assert.equal(state(id),'CLEANED')
console.log('E2E crash after deletion -> expired claim reclamation -> idempotent CLEANED')

function recoveryFixture(evidence, transient=false) {
 const id=sql(`select (public.set2go_create_upload_session('${owner}',now()+interval '1 hour')).id`)
 const track=sql(`select (public.set2go_reserve_track('${id}','${owner}','one','fixture.wav',12)).id`)
 sql(`select public.set2go_transition_track('${id}','${owner}','${track}','UPLOADING','upload-id'); select public.set2go_transition_track('${id}','${owner}','${track}','VERIFYING'); select public.set2go_begin_remote_completion('${id}','${owner}','${track}')`)
 writeFileSync(file,JSON.stringify({id,evidence,transient}))
 return {id,track}
}
function recover(extra={}) {
 const r=spawnSync(process.execPath,['services/set2go/scripts/cleanup-cloud.mjs','--execute','--reconcile','--limit','1','--test-runtime','tests/set2go-postgres/cleanup-runtime.mjs'],{env:{...process.env,...extra},encoding:'utf8'});process.stdout.write(r.stdout);return r
}
let f=recoveryFixture({state:'completed',size:12});assert.equal(recover().status,0);assert.equal(state(f.id),'UPLOADED');assert.equal(recover().status,0)
console.log('Recovery E2E: lost completion acknowledgment -> verified object -> UPLOADED; repeat idempotent')
f=recoveryFixture({state:'absent_unconfirmed'});assert.equal(recover().status,1);assert.equal(sql(`select completion_unreconciled from public.set2go_upload_sessions where id='${f.id}'`),'t')
for(const evidence of [{state:'incomplete'},{state:'ambiguous'}]) { f=recoveryFixture(evidence);assert.equal(recover().status,1);assert.equal(state(f.id),'UPLOADING') }
f=recoveryFixture({state:'completed',size:12},true);assert.equal(recover().status,1);sql(`update public.set2go_upload_sessions set completion_next_retry=clock_timestamp()-interval '1 second' where id='${f.id}'`);assert.equal(recover().status,0)
f=recoveryFixture({state:'completed',size:12});assert.equal(recover({SET2GO_TEST_CRASH:'before-resolve'}).status,89);sql(`update public.set2go_upload_sessions set lease_expires_at=clock_timestamp()-interval '1 second' where id='${f.id}'`);assert.equal(recover().status,0);assert.equal(state(f.id),'UPLOADED')
console.log('Recovery E2E: absent/incomplete/ambiguous stay blocked; transient error and crash-before-commit recover')
