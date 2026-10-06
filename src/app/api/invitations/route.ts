import { z } from 'zod'
import { sendGroupInvitationEmail } from '@/lib/email/service'
import { createGroupInvitationToken, hashGroupInvitationToken, normalizeInvitationEmail } from '@/lib/security/group-invitation-token'
import { invitationSiteUrl } from '@/lib/security/group-invitations'
import { createAdminClient } from '@/lib/supabase/admin'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const createSchema = z.object({
  group_id: uuidSchema,
  email: z.email().trim().toLowerCase(),
  invitee_name: z.string().trim().min(2).max(120).optional().nullable(),
})
const updateSchema = z.object({
  invitation_id: uuidSchema,
  action: z.enum(['resend', 'revoke']),
})

function invitationError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase()
  if (error.code === '42501' || message.includes('permission required')) {
    return Response.json({ error: { message: 'You do not have permission to invite people to this group.' } }, { status: 403 })
  }
  if (error.code === '23505' || message.includes('already a member') || message.includes('already been invited')) {
    return Response.json({ error: { message: message.includes('member') ? 'This person is already a member of the group.' : 'A current invitation already exists or this email was invited recently.' } }, { status: 409 })
  }
  if (message.includes('rate limit') || message.includes('wait before retrying')) {
    return Response.json({ error: { message: 'Please wait before trying this invitation again.' } }, { status: 429 })
  }
  if (message.includes('not found')) return Response.json({ error: { message: 'The group or invitation could not be found.' } }, { status: 404 })
  if (message.includes('cannot') || message.includes('not accepting') || message.includes('no longer')) {
    return Response.json({ error: { message: 'This invitation can no longer be sent or changed.' } }, { status: 409 })
  }
  if (message.includes('valid invitation email') || message.includes('invitee name')) {
    return Response.json({ error: { message: 'Check the email address and optional name.' } }, { status: 400 })
  }
  return databaseError(error)
}

async function loadInvitationMailData(invitationId: string) {
  const admin = createAdminClient()
  const { data: invitation, error } = await admin
    .from('group_invitations')
    .select('id,group_id,email,invitee_name,invited_by,expires_at')
    .eq('id', invitationId)
    .single()
  if (error) throw error
  const [{ data: group, error: groupError }, { data: inviter, error: inviterError }] = await Promise.all([
    admin.from('groups').select('name').eq('id', invitation.group_id).single(),
    admin.from('profiles').select('full_name').eq('id', invitation.invited_by).single(),
  ])
  if (groupError) throw groupError
  if (inviterError) throw inviterError
  return { admin, invitation, group, inviter }
}

async function sendInvitation(invitationId: string, token: string, request: Request) {
  const { admin, invitation, group, inviter } = await loadInvitationMailData(invitationId)
  const siteUrl = invitationSiteUrl(request)
  let deliverySucceeded = false
  let reason: string | undefined
  if (!siteUrl) {
    reason = 'site_url_missing'
  } else {
    const inviteUrl = new URL(`/invitation/${encodeURIComponent(token)}`, siteUrl)
    const result = await sendGroupInvitationEmail({
      toEmail: invitation.email,
      toName: invitation.invitee_name,
      inviterName: inviter.full_name,
      groupName: group.name,
      expiresAt: invitation.expires_at,
      acceptUrl: inviteUrl.toString(),
      declineUrl: `${inviteUrl.toString()}?action=decline`,
    })
    deliverySucceeded = result.success
    if (!result.success) reason = result.reason
  }

  const { error: markError } = await admin.rpc('mark_group_invitation_delivery', {
    target_invitation: invitationId,
    delivery_succeeded: deliverySucceeded,
  })
  if (markError) {
    console.warn('[Invitations] Delivery result could not be saved.', { code: markError.code ?? 'unknown' })
  }
  if (!deliverySucceeded) {
    console.warn('[Invitations] Invitation email was not delivered.', { reason: reason ?? 'unknown' })
  }
  return { deliverySucceeded, statusSaved: !markError }
}

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json({ error: { message: 'A valid group is required.' } }, { status: 400 })
  }
  const { data: permissions, error: permissionError } = await auth.supabase.rpc('current_group_permissions', {
    target_group: groupId!,
  })
  if (permissionError) return databaseError(permissionError)
  if (!permissions?.includes('members:invite')) {
    return Response.json({ error: { message: 'Invitation permission is required for this group.' } }, { status: 403 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error: expireError } = await admin
    .from('group_invitations')
    .update({ status: 'expired' })
    .eq('group_id', groupId!)
    .in('status', ['pending', 'sent', 'delivery_failed'])
    .lte('expires_at', now)
  if (expireError) return databaseError(expireError)

  const { data: invitations, error } = await admin
    .from('group_invitations')
    .select('id,group_id,email,invitee_name,status,expires_at,accepted_at,declined_at,revoked_at,sent_at,last_delivery_attempt_at,created_at,invited_by')
    .eq('group_id', groupId!)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return databaseError(error)
  const inviterIds = [...new Set((invitations ?? []).map((row) => row.invited_by))]
  const { data: profiles, error: profilesError } = inviterIds.length
    ? await admin.from('profiles').select('id,full_name').in('id', inviterIds)
    : { data: [], error: null }
  if (profilesError) return databaseError(profilesError)
  const profileNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  return Response.json({
    data: {
      invitations: (invitations ?? []).map(({ invited_by, ...row }) => ({
        ...row,
        inviter_name: profileNames.get(invited_by) ?? 'Group official',
      })),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, createSchema)
  if (parsed.response) return parsed.response

  const token = createGroupInvitationToken()
  const { data: invitationId, error } = await auth.supabase.rpc('create_group_invitation', {
    target_group: parsed.data.group_id,
    target_email: normalizeInvitationEmail(parsed.data.email),
    target_token_hash: hashGroupInvitationToken(token),
    target_invitee_name: parsed.data.invitee_name?.trim() || null,
  })
  if (error) return invitationError(error)

  try {
    const delivery = await sendInvitation(invitationId, token, request)
    return Response.json({
      data: {
        invitation_id: invitationId,
        email_sent: delivery.deliverySucceeded,
        status_saved: delivery.statusSaved,
        message: delivery.deliverySucceeded
          ? 'Invitation email sent.'
          : 'The invitation was recorded, but the email could not be delivered. Retry it from the invitation list.',
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    const admin = createAdminClient()
    await admin.rpc('mark_group_invitation_delivery', { target_invitation: invitationId, delivery_succeeded: false })
    console.warn('[Invitations] Invitation details could not be loaded for delivery.', {
      reason: cause instanceof Error ? cause.name : 'UnknownError',
    })
    return Response.json({ data: { invitation_id: invitationId, email_sent: false, message: 'The invitation is saved and can be retried.' } }, { status: 201 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, updateSchema)
  if (parsed.response) return parsed.response
  if (parsed.data.action === 'revoke') {
    const { error } = await auth.supabase.rpc('revoke_group_invitation', {
      target_invitation: parsed.data.invitation_id,
    })
    if (error) return invitationError(error)
    return Response.json({ data: { status: 'revoked' } })
  }

  const token = createGroupInvitationToken()
  const { data: invitationId, error } = await auth.supabase.rpc('resend_group_invitation', {
    target_invitation: parsed.data.invitation_id,
    target_token_hash: hashGroupInvitationToken(token),
  })
  if (error) return invitationError(error)
  try {
    const delivery = await sendInvitation(invitationId, token, request)
    return Response.json({
      data: {
        email_sent: delivery.deliverySucceeded,
        status_saved: delivery.statusSaved,
        message: delivery.deliverySucceeded ? 'A new invitation link was sent.' : 'The new link is saved, but email delivery failed. Retry after one minute.',
      },
    })
  } catch (cause) {
    const admin = createAdminClient()
    await admin.rpc('mark_group_invitation_delivery', { target_invitation: invitationId, delivery_succeeded: false })
    console.warn('[Invitations] Invitation resend failed before delivery.', {
      reason: cause instanceof Error ? cause.name : 'UnknownError',
    })
    return Response.json({ data: { email_sent: false, message: 'The new invitation link is saved and can be retried.' } })
  }
}
