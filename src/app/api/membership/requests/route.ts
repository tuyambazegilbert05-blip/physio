import { z } from 'zod'
import { sendMembershipDecisionEmail } from '@/lib/email/service'
import { uuidSchema } from '@/lib/validations'
import { createAdminClient } from '@/lib/supabase/admin'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const requestSchema = z.object({
  group_id: uuidSchema,
  message: z.string().trim().max(1000).optional().default(''),
})
const reviewSchema = z.object({
  request_id: uuidSchema,
  decision: z.enum(['approved', 'rejected']),
  message: z.string().trim().max(1000).optional().default(''),
})

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response

  const groupId = new URL(request.url).searchParams.get('group_id')
  const admin = createAdminClient()

  if (groupId) {
    if (!uuidSchema.safeParse(groupId).success) {
      return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
    }
    const { data: permissions, error: permissionError } = await auth.supabase.rpc(
      'current_group_permissions',
      { target_group: groupId },
    )
    if (permissionError) return databaseError(permissionError)
    if (!permissions?.includes('membership:requests_review')) {
      return Response.json(
        { error: { message: 'Membership request review permission is required.' } },
        { status: 403 },
      )
    }
    const { data, error } = await admin
      .from('join_requests')
      .select(
        'id,group_id,user_id,message,status,reviewed_by,reviewed_at,decision_message,applicant_name,applicant_email,created_at',
      )
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) return databaseError(error)
    return Response.json({ data: { requests: data ?? [] } })
  }

  const { data: requests, error: requestsError } = await auth.supabase
    .from('join_requests')
    .select('id,group_id,message,status,reviewed_at,decision_message,created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (requestsError) return databaseError(requestsError)

  const requestGroupIds = [...new Set((requests ?? []).map((item) => item.group_id))]
  const [
    { data: requestGroups, error: requestGroupsError },
    { data: discoverable, error: groupsError },
  ] = await Promise.all([
    requestGroupIds.length
      ? admin.from('groups').select('id,name').in('id', requestGroupIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('groups')
      .select('id,name,description,location,currency,contribution_frequency')
      .eq('discoverable', true)
      .order('name'),
  ])
  if (requestGroupsError) return databaseError(requestGroupsError)
  if (groupsError) return databaseError(groupsError)

  const { data: memberships, error: membershipError } = await auth.supabase
    .from('members')
    .select('group_id')
    .eq('user_id', auth.user!.id)
    .eq('status', 'active')
  if (membershipError) return databaseError(membershipError)

  const groupNames = new Map((requestGroups ?? []).map((group) => [group.id, group.name]))
  const activeMemberships = new Set((memberships ?? []).map((membership) => membership.group_id))
  return Response.json({
    data: {
      profile: {
        full_name: auth.user!.user_metadata.full_name ?? '',
        email: auth.user!.email ?? '',
      },
      requests: (requests ?? []).map((item) => ({
        ...item,
        group_name: groupNames.get(item.group_id) ?? 'Ikimina group',
      })),
      groups: (discoverable ?? []).filter((group) => !activeMemberships.has(group.id)),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, requestSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.rpc('request_group_join', {
    target_group: parsed.data.group_id,
    request_message: parsed.data.message || null,
  })
  if (error) return databaseError(error)
  return Response.json({ data: { request_id: data, status: 'pending' } }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, reviewSchema)
  if (parsed.response) return parsed.response
  const { data: memberId, error } = await auth.supabase.rpc('review_group_join_request', {
    target_request: parsed.data.request_id,
    decision: parsed.data.decision,
    applicant_message: parsed.data.message || null,
  })
  if (error) return databaseError(error)

  const admin = createAdminClient()
  const { data: requestRecord, error: requestError } = await admin
    .from('join_requests')
    .select('id,status,group_id,applicant_name,applicant_email,decision_message')
    .eq('id', parsed.data.request_id)
    .single()
  if (requestError) {
    console.warn('[Membership] Decision committed, but its email details could not be loaded.')
    return Response.json({
      data: {
        request_id: parsed.data.request_id,
        status: parsed.data.decision,
        member_id: memberId,
      },
    })
  }
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('name')
    .eq('id', requestRecord.group_id)
    .single()
  if (groupError)
    console.warn('[Membership] Group name could not be loaded for the decision email.')

  let emailSent = false
  if (requestRecord.applicant_email) {
    try {
      const emailResult = await sendMembershipDecisionEmail({
        toEmail: requestRecord.applicant_email,
        toName: requestRecord.applicant_name ?? 'Ikimina applicant',
        groupName: group?.name ?? 'the Ikimina group',
        groupId: requestRecord.group_id,
        approved: parsed.data.decision === 'approved',
        message: requestRecord.decision_message,
      })
      emailSent = emailResult.success
      if (!emailResult.success) {
        console.warn('[Membership] Decision email could not be dispatched.', {
          reason: emailResult.reason,
        })
      }
    } catch (emailError) {
      console.warn('[Membership] Decision email dispatch failed unexpectedly.', {
        reason: emailError instanceof Error ? emailError.name : 'UnknownError',
      })
    }
  }

  return Response.json({
    data: {
      request_id: requestRecord.id,
      status: requestRecord.status,
      member_id: memberId,
      email_sent: emailSent,
    },
  })
}
