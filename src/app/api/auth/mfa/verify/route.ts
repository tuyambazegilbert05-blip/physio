import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { readJson, requireApiUser } from '@/lib/supabase/route'
import { decryptTotpSecret, verifyTotp } from '@/lib/security/application-totp'
import { consumeAuthRateLimit, logApplicationAuthEvent } from '@/lib/security/application-session'
import { verifyPassword } from '@/lib/security/password-hash'

const schema = z.object({ currentPassword: z.string().min(8).max(72), code: z.string().regex(/^\d{6}$/) })

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  try {
    if (!await consumeAuthRateLimit({ scope: 'mfa:verify', value: auth.user!.id, maxRequests: 8, windowSeconds: 15 * 60 })) return Response.json({ error: { message: 'Too many authenticator attempts. Try again later.' } }, { status: 429 })
    const admin = createAdminClient()
    const { data: credential, error: credentialError } = await admin.from('app_password_credentials').select('password_hash').eq('user_id', auth.user!.id).maybeSingle()
    if (credentialError) throw credentialError
    if (!credential || !(await verifyPassword(parsed.data.currentPassword, credential.password_hash))) return Response.json({ error: { message: 'Current password is incorrect.' } }, { status: 401 })
    const { data: factor, error: factorError } = await admin.from('app_totp_factors').select('secret_ciphertext,status').eq('user_id', auth.user!.id).maybeSingle()
    if (factorError) throw factorError
    if (!factor || factor.status !== 'pending') return Response.json({ error: { message: 'Start authenticator setup before verifying a code.' } }, { status: 409 })
    const step = verifyTotp(decryptTotpSecret(factor.secret_ciphertext), parsed.data.code)
    if (step === null) return Response.json({ error: { message: 'Authenticator code is invalid or expired.' } }, { status: 422 })
    const { data: updated, error } = await admin.from('app_totp_factors').update({ status: 'verified', verified_at: new Date().toISOString(), last_used_step: step }).eq('user_id', auth.user!.id).eq('status', 'pending').select('user_id').maybeSingle()
    if (error) throw error
    if (!updated) return Response.json({ error: { message: 'Authenticator setup changed. Start again.' } }, { status: 409 })
    await logApplicationAuthEvent('MFA_ENABLED', auth.user!.id)
    return Response.json({ data: { enabled: true } })
  } catch (error) {
    console.error('[MFA] Enrollment verification failed.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Authenticator verification is temporarily unavailable.' } }, { status: 503 })
  }
}
