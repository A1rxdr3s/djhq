import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveProductAccess } from '../lib/products/access.ts'

const developer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const base = { userId: other, platformAdmin: false, ownsWebsite: false, development: true, set2goDeveloperId: developer }

test('only website ownership grants Website access; platform administration does not', () => {
  assert.deepEqual(resolveProductAccess({ ...base, ownsWebsite: true }), { platformAdmin: false, website: true, set2go: false })
  assert.deepEqual(resolveProductAccess({ ...base, platformAdmin: true }), { platformAdmin: true, website: false, set2go: false })
})

test('development Set2Go identity does not inherit Website access', () => {
  assert.deepEqual(resolveProductAccess({ ...base, userId: developer }), { platformAdmin: false, website: false, set2go: true })
  assert.deepEqual(resolveProductAccess({ ...base, userId: developer, ownsWebsite: true }), { platformAdmin: false, website: true, set2go: true })
})

test('no entitlement fails closed and production has no Set2Go entitlement', () => {
  assert.deepEqual(resolveProductAccess(base), { platformAdmin: false, website: false, set2go: false })
  assert.equal(resolveProductAccess({ ...base, userId: developer, development: false }).set2go, false)
  assert.equal(resolveProductAccess({ ...base, userId: developer, set2goDeveloperId: 'bad' }).set2go, false)
})

test('private testing gate explicitly authorizes Set2Go for allowlisted developer in production', () => {
  assert.equal(resolveProductAccess({ ...base, userId: developer, development: false, privateTesting: true }).set2go, true)
  assert.equal(resolveProductAccess({ ...base, userId: other, development: false, privateTesting: true }).set2go, false)
  assert.equal(resolveProductAccess({ ...base, userId: developer, development: false, privateTesting: false }).set2go, false)
})
