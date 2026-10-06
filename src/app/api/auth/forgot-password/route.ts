import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAuthRecoveryEmail } from '@/lib/email/service'
import { normalizeEmail } from '@/lib/security/email-normalization'
import {
  consumeAuthRateLimit,
  getRequestIp,
  hashApplicationToken,
  hashRateLimitBucket,
  logApplicationAuthEvent,
} from '@/lib/security/application-session'

const forgotPasswordSchema = z.object({ email: z.string().trim().email('Please enter a valid email address').max(254) })
const genericMessage = 'If an account exists for this address, password reset instructions will be sent.'

function acceptedResponse() {
  return NextResponse.json({ data: { message: genericMessage } }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const result = forgotPasswordSchema.safeParse(json)
  if (!result.success) return NextResponse.json({ error: { message: result.error.issues[0]?.message || 'Invalid email address' } }, { status: 400 })
  const email = normalizeEmail(result.data.email)
  const ip = getRequestIp(request)

  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeAuthRateLimit({ scope: 'recovery:ip', value: ip, maxRequests: 15, windowSeconds: 60 * 60 }),
      consumeAuthRateLimit({ scope: 'recovery:email', value: email, maxRequests: 5, windowSeconds: 60 * 60 }),
    ])
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json({ data: { message: genericMessage } }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
    }

    const admin = createAdminClient()
    const { data: account, error: accountError } = await admin
      .from('profiles')
      .select('id,email,account_status')
      .eq('normalized_email', email)
      .maybeSingle()
    if (accountError) throw new Error('Recovery lookup failed.')
    if (account?.email && account.account_status && ['active', 'pending_verification'].includes(account.account_status)) {
      const rawToken = randomBytes(32).toString('base64url')
      const tokenHash = hashApplicationToken(rawToken)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const { error: invalidateError } = await admin
        .from('app_password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', account.id)
        .is('used_at', null)
      if (invalidateError) throw new Error('Recovery token invalidation failed.')
      const { error: tokenError } = await admin.from('app_password_reset_tokens').insert({
        user_id: account.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      if (tokenError) throw new Error('Recovery token creation failed.')

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
      const actionUrl = new URL('/reset-password', siteUrl)
      actionUrl.searchParams.set('token', rawToken)
      try {
        const delivery = await sendAuthRecoveryEmail({ toEmail: account.email, actionUrl: actionUrl.toString(), siteUrl })
        if (!delivery.success) console.warn('[Password recovery] App email dispatch failed.', { reason: delivery.reason })
      } catch (error) {
        console.warn('[Password recovery] App email dispatch failed unexpectedly.', { reason: error instanceof Error ? error.name : 'UnknownError' })
      }
      await logApplicationAuthEvent('PASSWORD_RESET_REQUESTED', account.id)
    } else {
      // Perform comparable server-side work for unknown addresses without exposing
      // an account lookup result to the caller.
      hashRateLimitBucket('recovery:unknown', email)
    }
    return acceptedResponse()
  } catch (error) {
    console.error('[Password recovery] Application recovery is unavailable.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: { message: 'The recovery request is temporarily unavailable. Try again later.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
