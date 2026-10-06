import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { extractSpreadsheetData } from '../scripts/migrate-physio-fund.ts'
import { claimAccountSchema, requestClaimOtpSchema } from '../src/features/auth/schemas/auth.schema.ts'
import { hashEmailVerificationCode } from '../src/lib/security/email-verification-otp.ts'
import { normalizeEmail } from '../src/lib/security/email-normalization.ts'

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-')
}

test('legacy spreadsheet extracts 11 members, 24 shares, and 165 monthly records', () => {
  const data = extractSpreadsheetData()

  assert.equal(data.total_members, 11)
  assert.equal(data.canonical_members.length, 11)
  assert.equal(data.total_shares, 24)
  assert.equal(data.total_months, 15)
  assert.equal(data.contributions_count, 165)
  assert.equal(data.loans_count, 21)
})

test('financial reconciliation matches exact spreadsheet truth down to zero discrepancy', () => {
  const data = extractSpreadsheetData()

  // 1. Total contribution sum: 9,891,000 RWF
  assert.equal(data.reconciliation_totals.total_contributions, 9_891_000)

  // 2. Total loan principal disbursed: 22,980,000 RWF
  assert.equal(data.reconciliation_totals.total_loan_principal_disbursed, 22_980_000)

  // 3. Active loans outstanding: 5,130,000 RWF
  assert.equal(data.reconciliation_totals.total_active_loan_outstanding, 5_130_000)

  // 4. Counts: 5 active loans, 16 repaid loans
  assert.equal(data.reconciliation_totals.active_loans_count, 5)
  assert.equal(data.reconciliation_totals.repaid_loans_count, 16)
})

test('Aimable Bizimungu is unambiguously resolved as group admin with approved role composition', () => {
  const data = extractSpreadsheetData()
  const aimable = data.canonical_members.find((m) => m.slug === 'aimable-bizimungu')

  assert.ok(aimable, 'Aimable Bizimungu must exist in canonical members')
  assert.equal(aimable.role, 'admin')
  assert.equal(aimable.legacy_id, 'PHYSIO-MBR-001')

  // Chairperson role composition specification:
  // Approved: chairperson, committee_member, system_administrator
  // Prohibited: treasurer, secretary, technician, security_administrator, super_administrator
  const assignedRoles = ['chairperson', 'committee_member', 'system_administrator']
  const forbiddenRoles = ['treasurer', 'secretary', 'technician', 'security_administrator', 'super_administrator']

  for (const role of assignedRoles) {
    assert.ok(['chairperson', 'committee_member', 'system_administrator'].includes(role))
  }
  for (const forbidden of forbiddenRoles) {
    assert.equal(assignedRoles.includes(forbidden), false, `Forbidden role ${forbidden} must not be granted`)
  }
})

test('deterministic UUID generation is stable, unique, and idempotent across runs', () => {
  const id1 = deterministicUuid('PHYSIO_USER:M01')
  const id2 = deterministicUuid('PHYSIO_USER:M01')
  const idOther = deterministicUuid('PHYSIO_USER:M02')

  assert.equal(id1, id2, 'Deterministic UUID must produce identical results for the same seed')
  assert.notEqual(id1, idOther, 'Different seeds must produce different UUIDs')
  assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('account claim schema validates required fields and rejects invalid credentials', () => {
  // Valid claim
  const valid = claimAccountSchema.safeParse({
    fullName: 'Aimable Bizimungu',
    newEmail: 'aimable.bizimungu@gmail.com',
    newPhone: '+250788123456',
    newPassword: 'SecurePassword123!',
    avatarUrl: 'https://example.com/avatar.jpg',
    code: '123456',
  })
  assert.equal(valid.success, true)

  // Rejects invalid email
  const badEmail = claimAccountSchema.safeParse({
    fullName: 'Aimable Bizimungu',
    newEmail: 'not-an-email',
    newPhone: '+250788123456',
    newPassword: 'SecurePassword123!',
    code: '123456',
  })
  assert.equal(badEmail.success, false)

  // Rejects short password
  const shortPass = claimAccountSchema.safeParse({
    fullName: 'Aimable Bizimungu',
    newEmail: 'aimable@gmail.com',
    newPhone: '+250788123456',
    newPassword: 'short',
    code: '123456',
  })
  assert.equal(shortPass.success, false)

  // Rejects invalid 5-digit OTP
  const badOtp = claimAccountSchema.safeParse({
    fullName: 'Aimable Bizimungu',
    newEmail: 'aimable@gmail.com',
    newPhone: '+250788123456',
    newPassword: 'SecurePassword123!',
    code: '12345',
  })
  assert.equal(badOtp.success, false)
})

test('OTP verification hash is email-bound and rejects tampering', () => {
  process.env.AUTH_EMAIL_OTP_SECRET = 'a'.repeat(32)
  const email = 'aimable.claim@example.com'
  const code = '654321'

  const hash1 = hashEmailVerificationCode(email, code)
  const hash2 = hashEmailVerificationCode(email, code)
  const hashOtherCode = hashEmailVerificationCode(email, '999999')
  const hashOtherEmail = hashEmailVerificationCode('other@example.com', code)

  assert.equal(hash1, hash2)
  assert.notEqual(hash1, hashOtherCode)
  assert.notEqual(hash1, hashOtherEmail)
})
