import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  issueAndSendEmailVerificationCode,
} from '../src/lib/security/email-verification-otp.ts'

const originalFetch = globalThis.fetch
const previousSecret = process.env.AUTH_EMAIL_OTP_SECRET
const previousApiKey = process.env.BREVO_API_KEY
const previousSender = process.env.BREVO_SENDER_EMAIL

afterEach(() => {
  globalThis.fetch = originalFetch
  if (previousSecret === undefined) delete process.env.AUTH_EMAIL_OTP_SECRET
  else process.env.AUTH_EMAIL_OTP_SECRET = previousSecret
  if (previousApiKey === undefined) delete process.env.BREVO_API_KEY
  else process.env.BREVO_API_KEY = previousApiKey
  if (previousSender === undefined) delete process.env.BREVO_SENDER_EMAIL
  else process.env.BREVO_SENDER_EMAIL = previousSender
})

test('generates six-digit codes and email-bound HMACs', () => {
  process.env.AUTH_EMAIL_OTP_SECRET = 'a'.repeat(32)
  const code = generateEmailVerificationCode()
  assert.match(code, /^\d{6}$/)
  assert.equal(
    hashEmailVerificationCode('Member@Example.test', code),
    hashEmailVerificationCode('member@example.test', code),
  )
  assert.match(hashEmailVerificationCode('member@example.test', code), /^[0-9a-f]{64}$/)
})

test('does not send email when the existing database issuance limiter denies a code', async () => {
  process.env.AUTH_EMAIL_OTP_SECRET = 'b'.repeat(32)
  let fetchCalled = false
  globalThis.fetch = async () => {
    fetchCalled = true
    return Response.json({ messageId: 'unused' })
  }
  const supabase = {
    rpc: async (name: string, args: Record<string, string>) => {
      assert.equal(name, 'issue_email_verification_code')
      assert.match(args.target_code_hash, /^[0-9a-f]{64}$/)
      assert.match(args.target_ip_hash, /^[0-9a-f]{64}$/)
      return { data: false, error: null }
    },
  }

  const result = await issueAndSendEmailVerificationCode({
    supabase: supabase as never,
    email: 'MEMBER@example.test',
    request: new Request('https://ikimina.example.test/register', {
      headers: { 'x-real-ip': '192.0.2.10' },
    }),
  })

  assert.deepEqual(result, { issued: false, sent: false, reason: 'rate_limit' })
  assert.equal(fetchCalled, false)
})
