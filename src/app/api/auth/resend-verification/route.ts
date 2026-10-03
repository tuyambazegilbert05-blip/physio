import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAuthConfirmationEmail } from '@/lib/email/brevo'

const schema = z.object({
  email: z.string().trim().email('Invalid email address'),
})

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const result = schema.safeParse(json)
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
    const redirectTo = `${origin}/auth/callback?next=/verify-email`

    const supabaseAdmin = createAdminClient()

    let actionUrl: string | null = null

    // Generate magiclink verification link for existing user
    const { data: magicData, error: magicError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })

    if (!magicError && magicData?.properties?.action_link) {
      actionUrl = magicData.properties.action_link
    }

    if (actionUrl) {
      await sendAuthConfirmationEmail({
        toEmail: email,
        actionUrl,
      })
    }

    return NextResponse.json({
      data: { message: 'If an account is awaiting verification, a new link has been dispatched.' },
    })
  } catch (error) {
    console.error('[Resend Verification] Error:', error)
    return NextResponse.json(
      { error: { message: 'Failed to resend verification email' } },
      { status: 500 }
    )
  }
}
