import { createAdminClient } from '@/lib/supabase/admin'
import { readJson } from '@/lib/supabase/route'
import { resetPasswordSchema } from '@/features/auth/schemas/auth.schema'
import { hashPassword } from '@/lib/security/password-hash'
import {
  consumeAuthRateLimit,
  getRequestIp,
  hashApplicationToken,
  logApplicationAuthEvent,
} from '@/lib/security/application-session'
import { z } from 'zod'

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
const bodySchema = resetPasswordSchema.extend({ token: tokenSchema })

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!tokenSchema.safeParse(token).success) {
    return Response.json({ data: { valid: false } }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('app_password_reset_tokens')
      .select('id')
      .eq('token_hash', hashApplicationToken(token))
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error) throw error
    return Response.json({ data: { valid: Boolean(data) } }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch {
    return Response.json({ error: { message: 'Password reset status is temporarily unavailable.' } }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  }
}

export async function POST(request: Request) {
  const parsed = await readJson(request, bodySchema)
  if (parsed.response) return parsed.response
  const tokenHash = hashApplicationToken(parsed.data.token)
  try {
    const [ipAllowed, tokenAllowed] = await Promise.all([
      consumeAuthRateLimit({ scope: 'reset:ip', value: getRequestIp(request), maxRequests: 20, windowSeconds: 60 * 60 }),
      consumeAuthRateLimit({ scope: 'reset:token', value: tokenHash, maxRequests: 8, windowSeconds: 60 * 60 }),
    ])
    if (!ipAllowed || !tokenAllowed) return Response.json({ error: { message: 'Too many reset attempts. Request a new link and try again later.' } }, { status: 429, headers: { 'Retry-After': '3600' } })

    const passwordHash = await hashPassword(parsed.data.password)
    const admin = createAdminClient()
    const { data: validToken, error: tokenError } = await admin
      .from('app_password_reset_tokens')
      .select('user_id')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (tokenError) throw tokenError
    if (!validToken) return Response.json({ error: { message: 'This reset link is invalid or expired. Request a new link.' } }, { status: 422 })

    const { data: completed, error } = await admin.rpc('consume_password_reset_token', {
      target_token_hash: tokenHash,
      target_password_hash: passwordHash,
    })
    if (error) throw error
    if (!completed) return Response.json({ error: { message: 'This reset link is invalid or expired. Request a new link.' } }, { status: 422 })
    await logApplicationAuthEvent('PASSWORD_RESET_COMPLETED', validToken.user_id)
    return Response.json({ data: { message: 'Password updated. Sign in with your new password.' } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Password recovery] Password reset could not be completed.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Password reset is temporarily unavailable. Try again shortly.' } }, { status: 503 })
  }
}
