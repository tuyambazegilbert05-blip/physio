import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applicationSessionCookie,
  clearApplicationSessionCookie,
  getCurrentApplicationSession,
  logApplicationAuthEvent,
} from '@/lib/security/application-session'

export async function POST() {
  try {
    const session = await getCurrentApplicationSession()
    if (session) {
      const admin = createAdminClient()
      const { error } = await admin
        .from('app_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', session.id)
        .is('revoked_at', null)
      if (error) throw error
      await logApplicationAuthEvent('LOGOUT', session.user.id)
    }
    await clearApplicationSessionCookie()
    return NextResponse.json({ data: { message: 'Signed out.' } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    const response = NextResponse.json({ error: { message: 'Unable to sign out right now.' } }, { status: 503 })
    response.cookies.set(applicationSessionCookie, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  }
}
