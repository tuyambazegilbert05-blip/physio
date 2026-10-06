import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { readJson } from '@/lib/supabase/route'
import { createRawApplicationSessionToken, getRequestIp, hashApplicationToken, consumeAuthRateLimit, applicationSessionExpiry, applicationSessionCookieOptions, logApplicationAuthEvent } from '@/lib/security/application-session'
import { decryptTotpSecret, verifyTotp } from '@/lib/security/application-totp'

const challengeCookie = 'ikimina_login_challenge'
const schema = z.object({ code: z.string().regex(/^\d{6}$/) })

export async function POST(request: Request) {
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  const cookieStore = await cookies()
  const rawChallenge = cookieStore.get(challengeCookie)?.value
  if (!rawChallenge || !/^[A-Za-z0-9_-]{43}$/.test(rawChallenge)) return Response.json({ error: { message: 'Sign in again to verify your authenticator.' } }, { status: 401 })
  const challengeHash = hashApplicationToken(rawChallenge)

  try {
    const [ipAllowed, challengeAllowed] = await Promise.all([
      consumeAuthRateLimit({ scope: 'mfa-login:ip', value: getRequestIp(request), maxRequests: 20, windowSeconds: 15 * 60 }),
      consumeAuthRateLimit({ scope: 'mfa-login:challenge', value: challengeHash, maxRequests: 5, windowSeconds: 15 * 60 }),
    ])
    if (!ipAllowed || !challengeAllowed) return Response.json({ error: { message: 'Too many verification attempts. Sign in again later.' } }, { status: 429, headers: { 'Retry-After': '900' } })
    const admin = createAdminClient()
    const { data: challenge, error: challengeError } = await admin.from('app_login_challenges').select('user_id,expires_at,attempts,remember_me,consumed_at').eq('token_hash', challengeHash).maybeSingle()
    if (challengeError) throw challengeError
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) {
      return Response.json({ error: { message: 'The sign-in challenge expired. Sign in again.' } }, { status: 401 })
    }
    const { data: profile, error: profileError } = await admin.from('profiles').select('email,email_verified_at,account_status').eq('id', challenge.user_id).maybeSingle()
    if (profileError) throw profileError
    if (!profile?.email || !profile.account_status || !['active', 'pending_verification'].includes(profile.account_status)) return Response.json({ error: { message: 'Sign-in is not available for this account.' } }, { status: 401 })
    const { data: factor, error: factorError } = await admin.from('app_totp_factors').select('secret_ciphertext,status').eq('user_id', challenge.user_id).maybeSingle()
    if (factorError) throw factorError
    const step = factor?.status === 'verified' && factor.secret_ciphertext
      ? verifyTotp(decryptTotpSecret(factor.secret_ciphertext), parsed.data.code)
      : null
    if (step === null) {
      const { error } = await admin.rpc('fail_application_login_challenge', { target_token_hash: challengeHash })
      if (error) throw error
      return Response.json({ error: { message: 'That authenticator code is invalid or expired.' } }, { status: 401 })
    }

    const rawSession = createRawApplicationSessionToken()
    const expiresAt = applicationSessionExpiry(challenge.remember_me)
    const { data: userId, error } = await admin.rpc('complete_application_login_challenge', {
      target_token_hash: challengeHash,
      target_totp_step: step,
      target_session_hash: hashApplicationToken(rawSession),
      target_session_expiry: expiresAt,
      target_ip: getRequestIp(request),
      target_user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? '',
    })
    if (error) throw error
    if (!userId) return Response.json({ error: { message: 'That authenticator code was already used. Enter the current code and try again.' } }, { status: 401 })
    const response = NextResponse.json({
      data: {
        message: profile.email_verified_at ? 'Signed in.' : 'Verify your email with the code we sent before opening Physio Fund Circle.',
        requiresMfa: false,
        requiresEmailVerification: !profile.email_verified_at,
        email: profile.email,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('ikimina_session', rawSession, applicationSessionCookieOptions(expiresAt))
    response.cookies.set(challengeCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
    await logApplicationAuthEvent('LOGIN_SUCCESS', userId)
    return response
  } catch (error) {
    console.error('[MFA] Login verification is unavailable.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Authenticator verification is temporarily unavailable.' } }, { status: 503 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  const rawChallenge = cookieStore.get(challengeCookie)?.value
  const response = NextResponse.json({ data: { cancelled: true } }, { headers: { 'Cache-Control': 'no-store' } })
  if (rawChallenge && /^[A-Za-z0-9_-]{43}$/.test(rawChallenge)) {
    try {
      await createAdminClient().from('app_login_challenges').update({ consumed_at: new Date().toISOString() }).eq('token_hash', hashApplicationToken(rawChallenge)).is('consumed_at', null)
    } catch {
      // Clearing the short-lived challenge cookie remains safe if cleanup fails.
    }
  }
  response.cookies.set(challengeCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
