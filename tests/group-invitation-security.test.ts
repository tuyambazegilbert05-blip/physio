import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createGroupInvitationToken,
  hashGroupInvitationToken,
  normalizeInvitationEmail,
} from '../src/lib/security/group-invitation-token.ts'
import { evaluatePasswordStrength, passwordSchema } from '../src/features/auth/schemas/password-policy.ts'
import { registerSchema } from '../src/features/auth/schemas/auth.schema.ts'

test('group invitation links use unpredictable URL-safe tokens and stored hashes', () => {
  const first = createGroupInvitationToken()
  const second = createGroupInvitationToken()

  assert.match(first, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(first, second)
  assert.match(hashGroupInvitationToken(first), /^[a-f0-9]{64}$/)
  assert.equal(hashGroupInvitationToken(first), hashGroupInvitationToken(first))
  assert.throws(() => hashGroupInvitationToken('predictable-id'))
})

test('invitation email normalization uses the same lowercase trim convention as signup', () => {
  assert.equal(normalizeInvitationEmail('  Alice@Example.COM  '), 'alice@example.com')
})

test('shared password policy rejects short and weak values but accepts fair passphrases', () => {
  assert.equal(evaluatePasswordStrength('12345678').level, 'weak')
  assert.equal(passwordSchema.safeParse('12345678').success, false)
  assert.equal(passwordSchema.safeParse('abcdefgh').success, false)
  assert.equal(passwordSchema.safeParse('quiet river meadow').success, true)
  assert.equal(passwordSchema.safeParse('abcdeFGH1!').success, true)
})

test('normal signup applies the same password policy as invitation signup', () => {
  const details = { fullName: 'Alice Member', email: 'ALICE@example.com', phone: '+250 788 123 456', password: 'abcdeFGH1!' }
  assert.equal(registerSchema.safeParse(details).success, true)
  assert.equal(registerSchema.safeParse({ ...details, password: 'password' }).success, false)
  assert.equal(registerSchema.parse(details).email, 'alice@example.com')
})
