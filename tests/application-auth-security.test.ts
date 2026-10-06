import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { normalizeEmail } from '../src/lib/security/email-normalization.ts'
import { hashPassword, verifyPassword } from '../src/lib/security/password-hash.ts'
import {
  decodeBase32,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotp,
} from '../src/lib/security/application-totp.ts'

const previousMfaKey = process.env.AUTH_MFA_ENCRYPTION_KEY

afterEach(() => {
  if (previousMfaKey === undefined) delete process.env.AUTH_MFA_ENCRYPTION_KEY
  else process.env.AUTH_MFA_ENCRYPTION_KEY = previousMfaKey
})

test('password credentials are salted, verifiable, and reject a different password', async () => {
  const firstHash = await hashPassword('a-secure-long-password-4821')
  const secondHash = await hashPassword('a-secure-long-password-4821')

  assert.match(firstHash, /^scrypt\$32768\$8\$1\$/)
  assert.notEqual(firstHash, secondHash)
  assert.equal(await verifyPassword('a-secure-long-password-4821', firstHash), true)
  assert.equal(await verifyPassword('another-password-4821', firstHash), false)
  assert.equal(await verifyPassword('password', 'invalid-hash'), false)
})

test('email normalization is consistent for account lookup', () => {
  assert.equal(normalizeEmail('  Member.Name@Example.TEST '), 'member.name@example.test')
})

test('TOTP secrets encrypt at rest and reject tampering', () => {
  process.env.AUTH_MFA_ENCRYPTION_KEY = '11'.repeat(32)
  const secret = 'JBSWY3DPEHPK3PXP'
  const ciphertext = encryptTotpSecret(secret)

  assert.notEqual(ciphertext, secret)
  assert.equal(decryptTotpSecret(ciphertext), secret)
  const [iv, tag, payload] = ciphertext.split('.')
  const changedTag = `${tag[0] === 'A' ? 'B' : 'A'}${tag.slice(1)}`
  assert.throws(() => decryptTotpSecret(`${iv}.${changedTag}.${payload}`))
})

test('TOTP verification accepts the RFC 6238 SHA-1 test vector', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  assert.equal(decodeBase32(secret).toString(), '12345678901234567890')
  assert.equal(verifyTotp(secret, '287082', 59_000), 1)
})
