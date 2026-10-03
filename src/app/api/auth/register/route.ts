import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { readJson } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAuthConfirmationEmail } from '@/lib/email/brevo'

export async function POST(request: Request) {
  const parsed = await readJson(request, registerSchema)
  if (parsed.response) return parsed.response

  const { email, password, fullName } = parsed.data
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  const redirectTo = `${origin}/auth/callback?next=/verify-email`

  try {
    const supabaseAdmin = createAdminClient()

    // Create user & generate confirmation link without hitting Supabase GoTrue SMTP
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName },
        redirectTo,
      },
    })

    if (error) {
      return Response.json({ error: { message: error.message } }, { status: 400 })
    }

    const actionUrl = data.properties.action_link

    // Dispatch branded confirmation email directly through Brevo REST API
    const emailResult = await sendAuthConfirmationEmail({
      toEmail: email,
      actionUrl,
    })

    if (!emailResult.success) {
      console.warn('[Register] Brevo email dispatch warning:', emailResult.error)
    }

    return Response.json(
      { data: { message: 'Account created. Check your email to verify it.' } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Register] Unexpected error during registration:', error)
    return Response.json(
      { error: { message: 'Internal server error during registration.' } },
      { status: 500 }
    )
  }
}
