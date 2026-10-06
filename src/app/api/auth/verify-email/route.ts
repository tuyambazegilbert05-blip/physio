import { z } from 'zod'
import { hashEmailVerificationCode } from '@/lib/security/email-verification-otp'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const schema = z.object({
  email: z.string().trim().email().max(254),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export async function GET() {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response
  const { data: verified, error } = await auth.supabase.rpc('current_account_email_verified')
  if (error) return databaseError(error)
  return Response.json({
    data: { email: auth.user!.email ?? '', verified: Boolean(verified) },
  })
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser({ requireVerifiedEmail: false })
    if (auth.response) return auth.response
    const parsed = await readJson(request, schema)
    if (parsed.response) return parsed.response

    const email = parsed.data.email.toLowerCase()
    if (email !== (auth.user!.email ?? '').toLowerCase()) {
      return Response.json(
        { error: { message: 'Sign in to the account for this email address to verify it.' } },
        { status: 403 },
      )
    }

    const codeHash = hashEmailVerificationCode(email, parsed.data.code)
    const { data: verified, error } = await auth.supabase.rpc('verify_email_verification_code', {
      target_email: email,
      target_code_hash: codeHash,
    })
    if (error) {
      console.error('[Email verification] Verification RPC failed.', {
        code: error.code || 'unknown',
      })
      return databaseError(error)
    }
    if (!verified) {
      return Response.json(
        { error: { message: 'That code is invalid or expired. Request a new code and try again.' } },
        { status: 422 },
      )
    }

    return Response.json({ data: { verified: true } })
  } catch (error) {
    console.error('[Email verification] Request failed.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json(
      { error: { message: 'Email verification is temporarily unavailable. Try again shortly.' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
