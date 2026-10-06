import { z } from 'zod'
import { readJson, requireApiUser } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentApplicationSession, logApplicationAuthEvent } from '@/lib/security/application-session'
import { verifyPassword, hashPassword } from '@/lib/security/password-hash'
import { passwordSchema } from '@/features/auth/schemas/password-policy'

const schema = z.object({ currentPassword: z.string().min(8).max(72), newPassword: passwordSchema })

export async function PUT(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  const session = await getCurrentApplicationSession()
  if (!session || session.user.id !== auth.user!.id) return Response.json({ error: { message: 'Sign in again to change your password.' } }, { status: 401 })
  try {
    const admin = createAdminClient()
    const { data: credential, error: credentialError } = await admin.from('app_password_credentials').select('password_hash').eq('user_id', auth.user!.id).maybeSingle()
    if (credentialError) throw credentialError
    if (!credential || !(await verifyPassword(parsed.data.currentPassword, credential.password_hash))) return Response.json({ error: { message: 'Current password is incorrect.' } }, { status: 401 })
    const passwordHash = await hashPassword(parsed.data.newPassword)
    const { data: changed, error } = await admin.rpc('change_application_password', {
      target_user: auth.user!.id,
      target_session: session.id,
      target_password_hash: passwordHash,
    })
    if (error) throw error
    if (!changed) return Response.json({ error: { message: 'Your session expired. Sign in again and retry.' } }, { status: 401 })
    await logApplicationAuthEvent('PASSWORD_CHANGED', auth.user!.id)
    return Response.json({ data: { message: 'Password updated. Other active sessions were signed out.' } })
  } catch (error) {
    console.error('[Password change] The password could not be updated.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Password change is temporarily unavailable.' } }, { status: 503 })
  }
}
