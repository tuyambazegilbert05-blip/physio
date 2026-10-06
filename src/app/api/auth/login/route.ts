import { NextResponse } from 'next/server'
import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { readJson } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applicationSessionCookieOptions,
  applicationSessionCookie,
  assertApplicationDatabaseAuthConfigured,
  consumeAuthRateLimit,
  createApplicationDatabaseClient,
  createApplicationSession,
  createRawApplicationSessionToken,
  getRequestIp,
  hashApplicationToken,
  logApplicationAuthEvent,
} from '@/lib/security/application-session'
import { verifyPassword } from '@/lib/security/password-hash'
import { normalizeEmail } from '@/lib/security/email-normalization'

const invalidCredentials = 'Email, phone, or password is incorrect.'

export async function POST(request: Request) {
  const parsed = await readJson(request, loginSchema)
  if (parsed.response) return parsed.response
  const { identifier, password } = parsed.data
  const isEmail = identifier.includes('@')
  const normalizedIdentifier = isEmail
    ? normalizeEmail(identifier)
    : identifier.startsWith('+')
      ? `+${identifier.replace(/\D/g, '')}`
      : identifier.startsWith('0')
        ? `+250${identifier.slice(1).replace(/\D/g, '')}`
        : `+${identifier.replace(/\D/g, '')}`
  const ip = getRequestIp(request)

  try {
    assertApplicationDatabaseAuthConfigured()
    const [allowedIp, allowedAccount] = await Promise.all([
      consumeAuthRateLimit({ scope: 'login:ip', value: ip, maxRequests: 60, windowSeconds: 15 * 60 }),
      consumeAuthRateLimit({ scope: 'login:account', value: normalizedIdentifier, maxRequests: 12, windowSeconds: 15 * 60 }),
    ])
    if (!allowedIp || !allowedAccount) {
      return Response.json({ error: { message: 'Too many sign-in attempts. Wait a few minutes and try again.' } }, { status: 429, headers: { 'Retry-After': '900' } })
    }

    const admin = createAdminClient()
    let accountQuery = admin
      .from('profiles')
      .select('id,email,normalized_email,full_name,email_verified_at,account_status,phone,is_migrated,must_change_password,temporary_migration_email')
      .limit(1)
    accountQuery = isEmail
      ? accountQuery.eq('normalized_email', normalizedIdentifier)
      : accountQuery.eq('phone', normalizedIdentifier)
    const { data: accounts, error: accountError } = await accountQuery
    if (accountError) throw new Error('Account lookup is unavailable.')
    const account = accounts?.[0]
    if (!account || !account.email || !account.account_status || !['active', 'pending_verification'].includes(account.account_status)) {
      return Response.json({ error: { message: invalidCredentials } }, { status: 401 })
    }

    const { data: credential, error: credentialError } = await admin
      .from('app_password_credentials')
      .select('password_hash')
      .eq('user_id', account.id)
      .maybeSingle()
    if (credentialError) throw new Error('Credential lookup is unavailable.')
    if (!credential || !(await verifyPassword(password, credential.password_hash))) {
      await logApplicationAuthEvent('LOGIN_FAILED', account.id)
      return Response.json({ error: { message: invalidCredentials } }, { status: 401 })
    }

    const { data: factor, error: factorError } = await admin.from('app_totp_factors').select('status').eq('user_id', account.id).maybeSingle()
    if (factorError) throw new Error('Authenticator status lookup is unavailable.')
    if (factor?.status === 'verified') {
      const challengeToken = createRawApplicationSessionToken()
      const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      const { error: challengeError } = await admin.from('app_login_challenges').insert({
        user_id: account.id,
        token_hash: hashApplicationToken(challengeToken),
        expires_at: challengeExpiresAt,
        remember_me: parsed.data.keepSignedIn ?? true,
      })
      if (challengeError) throw new Error('Could not create a sign-in challenge.')
      const response = NextResponse.json({ data: { message: 'Enter your authenticator code to finish signing in.', requiresMfa: true } }, { headers: { 'Cache-Control': 'no-store' } })
      response.cookies.set('ikimina_login_challenge', challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60,
      })
      response.cookies.set(applicationSessionCookie, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    const session = await createApplicationSession(account.id, request, parsed.data.keepSignedIn ?? true)
    await admin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', account.id)
    await logApplicationAuthEvent('LOGIN_SUCCESS', account.id)
    const response = NextResponse.json({
      data: {
        message: account.email_verified_at ? 'Signed in.' : 'Verify your email with the code we sent before opening Physio Fund Circle.',
        requiresMfa: false,
        requiresEmailVerification: !account.email_verified_at,
        email: account.email,
        mustChangePassword: Boolean(account.must_change_password),
        isMigrated: Boolean(account.is_migrated),
        temporaryMigrationEmail: Boolean(account.temporary_migration_email),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('ikimina_session', session.rawToken, applicationSessionCookieOptions(session.expiresAt))

    if (account.email_verified_at) {
      try {
        const userDb = await createApplicationDatabaseClient({ id: account.id })
        await userDb.rpc('notify_security_sign_in')
      } catch {
        // Notification failure must not undo successful authentication.
      }
    }
    return response
  } catch (error) {
    console.error('[Login] Application sign-in is temporarily unavailable.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: { message: 'Sign-in is temporarily unavailable. Try again shortly.' } }, { status: 503 })
  }
}
