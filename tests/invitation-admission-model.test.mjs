// Policy simulation only: not an Auth hook, database transaction, or provider test.
import test from 'node:test'
import assert from 'node:assert/strict'

function model(invite) {
  let claimed = false
  return async ({ existing = false, verifiedEmail = 'dj@example.com', metadata = {} } = {}) => {
    void metadata // User-controlled metadata has no authority.
    if (existing) return true
    if (!invite || invite.expired || invite.revoked || claimed || !verifiedEmail) return false
    if (invite.email && invite.email !== verifiedEmail) return false
    // This synchronous check-and-set models, but does not implement, a DB transaction.
    claimed = true
    return true
  }
}

for (const provider of ['Google', 'email OTP']) {
  test(`valid invitation with verified ${provider} identity`, async () => {
    assert.equal(await model({})(), true)
  })
}
test('no invitation and forged metadata are denied', async () => {
  assert.equal(await model(null)({ metadata: { hasInvitation: true } }), false)
})
for (const state of ['expired', 'revoked']) {
  test(`${state} invitation is denied`, async () => assert.equal(await model({ [state]: true })(), false))
}
test('an invitation cannot be reused', async () => {
  const admit = model({})
  assert.equal(await admit(), true)
  assert.equal(await admit(), false)
})
test('simulated simultaneous claims have one winner', async () => {
  const admit = model({})
  assert.deepEqual((await Promise.all([admit(), admit()])).sort(), [false, true])
})
test('existing identity does not need an invitation', async () => assert.equal(await model(null)({ existing: true }), true))
test('unbound invitation accepts a verified identity', async () => assert.equal(await model({})({ verifiedEmail: 'other@example.com' }), true))
test('bound invitation rejects a different verified email', async () => assert.equal(await model({ email: 'invited@example.com' })(), false))
test('opening an unbound link does not claim it; its holder can claim it', async () => {
  const admit = model({})
  assert.equal(await admit({ verifiedEmail: 'recipient-of-forwarded-link@example.com' }), true)
  assert.equal(await admit({ verifiedEmail: 'original-recipient@example.com' }), false)
})
test('unverified identity cannot claim a bound invitation', async () => {
  const admit = model({ email: 'invited@example.com' })
  assert.equal(await admit({ verifiedEmail: '' }), false)
  assert.equal(await admit({ verifiedEmail: 'invited@example.com' }), true)
})
test('failed identity attempt does not consume an invitation', async () => {
  const admit = model({ email: 'invited@example.com' })
  assert.equal(await admit({ verifiedEmail: 'wrong@example.com' }), false)
  assert.equal(await admit({ verifiedEmail: 'invited@example.com' }), true)
})
