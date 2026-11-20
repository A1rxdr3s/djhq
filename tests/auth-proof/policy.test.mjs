import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Static fixture guards only: this neither runs SQL nor simulates Supabase.
const sql = readFileSync(new URL('./deny-hook.sql', import.meta.url), 'utf8')
test('test hook explicitly denies rather than trusts client metadata or email', () => {
  assert.match(sql, /'http_code', 403/)
  assert.doesNotMatch(sql, /event\s*->|verified_identity\s*=/)
})
test('test admission storage and hook are not granted to browser roles', () => {
  assert.match(sql, /revoke all on djhq_auth_proof\.admissions from public, anon, authenticated/i)
  assert.match(sql, /revoke all on function public\.djhq_proof_before_user_created\(jsonb\) from public, anon, authenticated/i)
})
