import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAuthRecoveryEmail } from '@/lib/email/brevo'

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
})

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const result = forgotPasswordSchema.safeParse(json)

    if (!result.success) {
      return NextResponse.json(
        { error: { message: result.error.issues[0]?.message || 'Invalid email address' } },
        { status: 400 }
      )
    }

    const { email } = result.data
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const redirectTo = `${origin}/auth/callback?next=/reset-password`

    const supabaseAdmin = createAdminClient()

    // Generate password recovery link without sending through Supabase GoTrue SMTP
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    })

    if (error) {
      // If user is not found, we don't expose it to avoid email enumeration
      if (
        error.message?.toLowerCase().includes('not found') ||
        (error as { status?: number }).status === 404
      ) {
        return NextResponse.json({
          data: {
            message:
              'If an account exists for this address, a password reset link has been dispatched.',
          },
        })
      }

      console.error('[Forgot Password] Supabase Admin error:', error)
      return NextResponse.json(
        { error: { message: error.message || 'Unable to generate password recovery link' } },
        { status: 400 }
      )
    }

    const actionUrl = data.properties.action_link

    // Dispatch recovery email via Brevo REST API
    const emailResult = await sendAuthRecoveryEmail({
      toEmail: email,
      actionUrl,
    })

    if (!emailResult.success) {
      console.error('[Forgot Password] Brevo dispatch error:', emailResult.error)
      return NextResponse.json(
        { error: { message: 'Failed to send recovery email. Please try again later.' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        message:
          'If an account exists for this address, a password reset link has been dispatched.',
      },
    })
  } catch (error) {
    console.error('[Forgot Password] Unexpected error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error processing recovery request' } },
      { status: 500 }
    )
  }
}
