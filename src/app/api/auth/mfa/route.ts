import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { readJson, requireApiUser } from '@/lib/supabase/route'
import { createTotpSetupUrl, decryptTotpSecret, encryptTotpSecret, generateTotpSecret, verifyTotp } from '@/lib/security/application-totp'
import { consumeAuthRateLimit, logApplicationAuthEvent } from '@/lib/security/application-session'

const disableSchema = z.object({ currentPassword: z.string().min(8).max(72), code: z.string().regex(/^\d{6}$/) })

export async function GET() {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const admin = createAdminClient()
  const { data, error } = await admin.from('app_totp_factors').select('status,created_at,verified_at').eq('user_id', auth.user!.id).maybeSingle()
  if (error) return Response.json({ error: { message: 'Authenticator settings are temporarily unavailable.' } }, { status: 503 })
  return Response.json({ data: { enabled: data?.status === 'verified', pending: data?.status === 'pending', createdAt: data?.created_at ?? null } }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST() {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  try {
    if (!await consumeAuthRateLimit({ scope: 'mfa:enroll', value: auth.user!.id, maxRequests: 5, windowSeconds: 60 * 60 })) return Response.json({ error: { message: 'Too many authenticator setup attempts. Try again later.' } }, { status: 429 })
    const admin = createAdminClient()
    const { data: current, error: currentError } = await admin.from('app_totp_factors').select('status').eq('user_id', auth.user!.id).maybeSingle()
    if (currentError) throw currentError
    if (current?.status === 'verified') return Response.json({ error: { message: 'Two-factor authentication is already enabled.' } }, { status: 409 })
    const secret = generateTotpSecret()
    const { error } = await admin.from('app_totp_factors').upsert({
      user_id: auth.user!.id,
      secret_ciphertext: encryptTotpSecret(secret),
      status: 'pending',
      created_at: new Date().toISOString(),
      verified_at: null,
      last_used_step: null,
    }, { onConflict: 'user_id' })
    if (error) throw error
    return Response.json({ data: { secret, otpauthUrl: createTotpSetupUrl(secret, auth.user!.email) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[MFA] Enrollment could not be started.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Authenticator setup is temporarily unavailable.' } }, { status: 503 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, disableSchema)
  if (parsed.response) return parsed.response
  try {
    if (!await consumeAuthRateLimit({ scope: 'mfa:disable', value: auth.user!.id, maxRequests: 5, windowSeconds: 60 * 60 })) return Response.json({ error: { message: 'Too many authenticator attempts. Try again later.' } }, { status: 429 })
    const admin = createAdminClient()
    const [{ data: credential, error: credentialError }, { data: factor, error: factorError }] = await Promise.all([
      admin.from('app_password_credentials').select('password_hash').eq('user_id', auth.user!.id).maybeSingle(),
      admin.from('app_totp_factors').select('secret_ciphertext,last_used_step,status').eq('user_id', auth.user!.id).maybeSingle(),
    ])
    if (credentialError || factorError) throw new Error('Security settings lookup failed.')
    if (!credential || !factor || factor.status !== 'verified') return Response.json({ error: { message: 'Two-factor authentication is not enabled.' } }, { status: 409 })
    const { verifyPassword } = await import('@/lib/security/password-hash')
    if (!(await verifyPassword(parsed.data.currentPassword, credential.password_hash))) return Response.json({ error: { message: 'Current password is incorrect.' } }, { status: 401 })
    const step = verifyTotp(decryptTotpSecret(factor.secret_ciphertext), parsed.data.code)
    if (step === null) return Response.json({ error: { message: 'Authenticator code is invalid or expired.' } }, { status: 422 })
    const { data: removed, error } = await admin.rpc('disable_application_totp_factor', { target_user: auth.user!.id, target_totp_step: step })
    if (error) throw error
    if (!removed) return Response.json({ error: { message: 'That authenticator code was already used. Enter the current code and try again.' } }, { status: 422 })
    await logApplicationAuthEvent('MFA_DISABLED', auth.user!.id)
    return Response.json({ data: { enabled: false } })
  } catch (error) {
    console.error('[MFA] Authenticator could not be removed.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Authenticator settings are temporarily unavailable.' } }, { status: 503 })
  }
}
