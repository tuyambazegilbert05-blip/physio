import { requestClaimOtpSchema } from '@/features/auth/schemas/auth.schema'
import { readJson, requireApiUser } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assertEmailVerificationOtpConfigured,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  hashRequestIp,
} from '@/lib/security/email-verification-otp'
import { sendEmailVerificationOtp } from '@/lib/email/service'
import { normalizeEmail } from '@/lib/security/email-normalization'

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response

  const parsed = await readJson(request, requestClaimOtpSchema)
  if (parsed.response) return parsed.response

  try {
    assertEmailVerificationOtpConfigured()
  } catch {
    return Response.json(
      { error: { message: 'Email verification service is temporarily unavailable.' } },
      { status: 503 },
    )
  }

  const normalized = normalizeEmail(parsed.data.newEmail)
  const admin = createAdminClient()

  // Ensure new email is not already taken by another account
  const { data: existing, error: lookupErr } = await admin
    .from('profiles')
    .select('id')
    .eq('normalized_email', normalized)
    .neq('id', auth.user!.id)
    .maybeSingle()

  if (lookupErr) {
    return Response.json({ error: { message: 'Account lookup failed.' } }, { status: 500 })
  }
  if (existing) {
    return Response.json(
      { error: { message: 'An account already exists with this email address.' } },
      { status: 409 },
    )
  }

  // Generate OTP code
  const code = generateEmailVerificationCode()
  const codeHash = hashEmailVerificationCode(normalized, code)
  const ipHash = hashRequestIp(request)

  const { data: allowed, error: issueErr } = await auth.supabase.rpc('issue_account_claim_code', {
    target_new_email: normalized,
    target_code_hash: codeHash,
    target_ip_hash: ipHash,
  })

  if (issueErr) {
    console.error('[Account Claim OTP] issue_account_claim_code error:', issueErr.message)
    return Response.json(
      { error: { message: issueErr.message || 'Could not issue verification code.' } },
      { status: 400 },
    )
  }

  if (!allowed) {
    return Response.json(
      { error: { message: 'Too many verification code attempts. Please wait a few minutes before trying again.' } },
      { status: 429 },
    )
  }

  let emailSent = false
  try {
    const delivery = await sendEmailVerificationOtp({ toEmail: normalized, code })
    emailSent = delivery.success
  } catch (err) {
    console.warn('[Account Claim OTP] Email dispatch failed:', err)
  }

  return Response.json({
    data: {
      message: emailSent
        ? 'Verification code sent to your real email.'
        : 'Verification code generated. If email delivery is not configured locally, check development server logs.',
      emailSent,
    },
  })
}
