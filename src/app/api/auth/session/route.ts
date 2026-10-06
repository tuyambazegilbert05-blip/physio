import { getCurrentApplicationUser } from '@/lib/security/application-session'

export async function GET() {
  try {
    const user = await getCurrentApplicationUser()
    return Response.json({
      data: {
        authenticated: Boolean(user),
        user: user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: { message: 'Account session status is temporarily unavailable.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
