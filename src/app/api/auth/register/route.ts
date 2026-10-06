import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { readJson } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assertApplicationDatabaseAuthConfigured,
  applicationSessionCookieOptions,
  applicationSessionExpiry,
  consumeAuthRateLimit,
  createApplicationDatabaseClient,
  getRequestIp,
  hashApplicationToken,
  logApplicationAuthEvent,
} from '@/lib/security/application-session'
import { hashPassword } from '@/lib/security/password-hash'
import { normalizeEmail } from '@/lib/security/email-normalization'
import { createRawApplicationSessionToken } from '@/lib/security/application-session'
import {
  assertEmailVerificationOtpConfigured,
  issueAndSendEmailVerificationCode,
} from '@/lib/security/email-verification-otp'

export async function POST(request: Request) {
  const parsed = await readJson(request, registerSchema)
  if (parsed.response) return parsed.response
  const { password, fullName, phone } = parsed.data
  const email = normalizeEmail(parsed.data.email)

  try {
    assertEmailVerificationOtpConfigured()
  } catch {
    return Response.json({ error: { message: 'Email verification is not configured. Contact the administrator.' } }, { status: 503 })
  }
  try {
    assertApplicationDatabaseAuthConfigured()
  } catch {
    console.error('[Register] Application database identity is not configured.')
    return Response.json({ error: { message: 'The account service is temporarily unavailable. Contact the administrator.' } }, { status: 503 })
  }

  try {
    const ip = getRequestIp(request)
    const [allowedIp, allowedEmail] = await Promise.all([
      consumeAuthRateLimit({ scope: 'register:ip', value: ip, maxRequests: 20, windowSeconds: 60 * 60 }),
      consumeAuthRateLimit({ scope: 'register:email', value: email, maxRequests: 3, windowSeconds: 60 * 60 }),
    ])
    if (!allowedIp || !allowedEmail) {
      return Response.json({ error: { message: 'Too many registration attempts. Wait a while and try again.' } }, { status: 429, headers: { 'Retry-After': '3600' } })
    }

    const admin = createAdminClient()
    const { data: existing, error: lookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('normalized_email', email)
      .maybeSingle()
    if (lookupError) throw new Error('Account lookup is unavailable.')
    if (existing) {
      return Response.json({ error: { message: 'An account may already exist for this email. Sign in or request a password reset.' } }, { status: 409 })
    }

    const userId = randomUUID()
    const rawToken = createRawApplicationSessionToken()
    const expiresAt = applicationSessionExpiry(true)
    const passwordHash = await hashPassword(password)
    const { error: createError } = await admin.rpc('create_application_account', {
      target_user: userId,
      target_email: email,
      target_full_name: fullName,
      target_phone: phone,
      target_password_hash: passwordHash,
      target_session_hash: hashApplicationToken(rawToken),
      target_session_expiry: expiresAt,
      target_ip: ip,
      target_user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? '',
      email_is_preverified: false,
    })
    if (createError) {
      if (createError.code === '23505') {
        return Response.json({ error: { message: 'An account may already exist for this email. Sign in or request a password reset.' } }, { status: 409 })
      }
      console.error('[Register] Application account creation failed.', { code: createError.code ?? 'unknown' })
      return Response.json({ error: { message: 'The account could not be created right now. Try again shortly.' } }, { status: 503 })
    }

    const userDb = await createApplicationDatabaseClient({ id: userId })
    const delivery = await issueAndSendEmailVerificationCode({ supabase: userDb, email, request })
    const response = NextResponse.json({
      data: {
        message: delivery.sent
          ? 'Account created. Enter the one-time code sent to your email to continue.'
          : 'Account created, but the verification email was not delivered. Request a new code from the verification screen.',
        emailSent: delivery.sent,
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('ikimina_session', rawToken, applicationSessionCookieOptions(expiresAt))
    await logApplicationAuthEvent('ACCOUNT_CREATED', userId)
    if (!delivery.sent) console.warn('[Register] Verification email could not be delivered.', { reason: delivery.reason ?? 'unknown', accountCreated: true })
    return response
  } catch (error) {
    console.error('[Register] Application account creation is temporarily unavailable.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: { message: 'The account service is temporarily unavailable. Check your connection and try again.' } }, { status: 503 })
  }
}
