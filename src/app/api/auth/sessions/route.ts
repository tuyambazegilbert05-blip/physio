import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentApplicationSession, logApplicationAuthEvent } from '@/lib/security/application-session'
import { requireApiUser } from '@/lib/supabase/route'

export async function DELETE() {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response
  try {
    const current = await getCurrentApplicationSession()
    if (!current || current.user.id !== auth.user!.id) return Response.json({ error: { message: 'Sign in again to manage sessions.' } }, { status: 401 })
    const { error } = await createAdminClient().from('app_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', auth.user!.id)
      .neq('id', current.id)
      .is('revoked_at', null)
    if (error) throw error
    await logApplicationAuthEvent('OTHER_SESSIONS_REVOKED', auth.user!.id)
    return Response.json({ data: { message: 'Other sessions have been signed out.' } })
  } catch {
    return Response.json({ error: { message: 'Other sessions could not be signed out.' } }, { status: 503 })
  }
}
