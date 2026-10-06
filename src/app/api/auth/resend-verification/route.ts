import { issueAndSendEmailVerificationCode } from '@/lib/security/email-verification-otp'
import { requireApiUser } from '@/lib/supabase/route'

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response

  try {
    const result = await issueAndSendEmailVerificationCode({
      supabase: auth.supabase,
      email: auth.user!.email ?? '',
      request,
    })
    if (result.reason === 'rate_limit') {
      return Response.json(
        {
          error: {
            message: 'Too many verification codes were requested. Wait before trying again.',
          },
        },
        { status: 429 },
      )
    }
    if (!result.sent) {
      return Response.json(
        { error: { message: 'Verification email is temporarily unavailable.' } },
        { status: 503 },
      )
    }
    return Response.json({
      data: { message: 'If this account still needs verification, a new code has been sent.' },
    })
  } catch (error) {
    console.error('[Resend verification] Could not issue the app verification code.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json(
      { error: { message: 'Verification email is temporarily unavailable.' } },
      { status: 503 },
    )
  }
}
