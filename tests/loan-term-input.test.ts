import test from 'node:test'
import assert from 'node:assert/strict'
import { loanCreateSchema } from '../src/features/loans/schemas/loan.schema.ts'

test('loan applications ignore client-supplied interest rates', () => {
  const parsed = loanCreateSchema.safeParse({
    group_id: '11111111-1111-4111-8111-111111111111',
    member_id: '22222222-2222-4222-8222-222222222222',
    principal: 250000,
    interest_rate: 0,
    term_months: 4,
    purpose: 'School fees',
  })

  assert.equal(parsed.success, true)
  if (parsed.success) assert.equal('interest_rate' in parsed.data, false)
})

test('loan term and amount must stay within server-validated input bounds', () => {
  const base = {
    group_id: '11111111-1111-4111-8111-111111111111',
    member_id: '22222222-2222-4222-8222-222222222222',
    principal: 250000,
    term_months: 4,
    purpose: 'School fees',
  }

  assert.equal(loanCreateSchema.safeParse({ ...base, principal: 0 }).success, false)
  assert.equal(loanCreateSchema.safeParse({ ...base, term_months: 0 }).success, false)
  assert.equal(loanCreateSchema.safeParse({ ...base, term_months: 121 }).success, false)
})
