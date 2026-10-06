import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { sendNotificationEmail } from '@/lib/email/service'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const emailTestSchema = z.object({ email: z.email().optional() }).optional()

export async function POST(request: NextRequest) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, emailTestSchema)
  if (parsed.response) return parsed.response

  const { data: assignments, error: assignmentError } = await auth.supabase
    .from('group_role_assignments')
    .select('group_id')
    .eq('user_id', auth.user!.id)
  if (assignmentError) return databaseError(assignmentError)

  let canConfigureSystem = false
  for (const groupId of [...new Set((assignments ?? []).map((assignment) => assignment.group_id))]) {
    const { data: permissions, error } = await auth.supabase.rpc('current_group_permissions', {
      target_group: groupId,
    })
    if (error) return databaseError(error)
    if (permissions?.includes('system:configure')) {
      canConfigureSystem = true
      break
    }
  }
  if (!canConfigureSystem) {
    return NextResponse.json(
      { error: { message: 'System configuration permission is required.' } },
      { status: 403 },
    )
  }

  const user = auth.user!
  const targetEmail = parsed.data?.email ?? user.email
  if (!targetEmail) {
    return NextResponse.json({ error: { message: 'A recipient email is required.' } }, { status: 400 })
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
    return NextResponse.json(
      { error: { message: 'The email service could not send the test message.' } },
      { status: 503 },
    )
  }

  return NextResponse.json({ data: { success: true, messageId: result.messageId } })
}
