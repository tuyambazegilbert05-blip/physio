import { createHmac, randomInt } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { sendEmailVerificationOtp } from '../email/service.ts'

function getOtpSecret() {
  const secret = process.env.AUTH_EMAIL_OTP_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_EMAIL_OTP_SECRET must contain at least 32 characters.')
  }
  return secret
}

export function assertEmailVerificationOtpConfigured() {
  getOtpSecret()
}

export function generateEmailVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashEmailVerificationCode(email: string, code: string) {
  return createHmac('sha256', getOtpSecret())
    .update(`ikimina-email-verification:v1:${email.trim().toLowerCase()}:${code}`)
    .digest('hex')
}

export function hashRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = request.headers.get('x-real-ip')?.trim() || forwarded || 'unknown'
  return createHmac('sha256', getOtpSecret()).update(`ikimina-email-otp-ip:${ip}`).digest('hex')
}

export async function issueAndSendEmailVerificationCode({
  supabase,
  email,
  request,
}: {
  supabase: SupabaseClient<Database>
  email: string
  request: Request
}) {
  const normalizedEmail = email.trim().toLowerCase()
  const code = generateEmailVerificationCode()
  const { data: allowed, error } = await supabase.rpc('issue_email_verification_code', {
    target_code_hash: hashEmailVerificationCode(normalizedEmail, code),
    target_ip_hash: hashRequestIp(request),
  })

  if (error) {
    console.error('[Email verification] Could not issue the app verification code:', error.message)
    return { issued: false, sent: false, reason: 'unavailable' as const }
  }
  if (!allowed) return { issued: false, sent: false, reason: 'rate_limit' as const }

  let result: Awaited<ReturnType<typeof sendEmailVerificationOtp>>
  try {
    result = await sendEmailVerificationOtp({ toEmail: normalizedEmail, code })
  } catch {
    console.error('[Email verification] Application email dispatch failed.')
    return { issued: true, sent: false, reason: 'delivery' as const }
  }
  if (!result.success) {
    console.error('[Email verification] Application email dispatch failed.', {
      reason: result.reason,
    })
  }
  return result.success
    ? { issued: true, sent: true, reason: null }
    : { issued: true, sent: false, reason: 'delivery' as const }
}
