import { NextResponse, type NextRequest } from 'next/server'
import { sendNotificationEmail } from '@/lib/email/brevo'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const targetEmail = body.email || user.email

  if (!targetEmail) {
    return NextResponse.json({ error: 'No target email specified' }, { status: 400 })
  }

  const result = await sendNotificationEmail({
    toEmail: targetEmail,
    toName: user.user_metadata?.full_name || 'Member',
    title: 'Brevo Delivery Test Successful',
    message: 'Your Brevo email carrier integration is now live and working seamlessly on Phyaio Cycle.',
    actionUrl: `${request.nextUrl.origin}/dashboard`,
    actionLabel: 'Return to Dashboard',
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
