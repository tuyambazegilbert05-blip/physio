import { contributionCreateSchema } from '@/features/contributions/schemas/contribution.schema'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { z } from 'zod'

const contributionReviewSchema = z.object({ id: uuidSchema, status: z.enum(['verified', 'rejected']) })

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('contributions').select('*').eq('group_id', groupId!).order('period', { ascending: false }).limit(500)
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, contributionCreateSchema)
  if (parsed.response) return parsed.response
  const input = parsed.data
  const [{ data: member, error: memberError }, { data: permissions, error: permissionError }] =
    await Promise.all([
      auth.supabase
        .from('members')
        .select('id,status')
        .eq('id', input.member_id)
        .eq('group_id', input.group_id)
        .eq('user_id', auth.user!.id)
        .maybeSingle(),
      auth.supabase.rpc('current_group_permissions', { target_group: input.group_id }),
    ])
  if (memberError) return databaseError(memberError)
  if (permissionError) return databaseError(permissionError)
  const canRecordForGroup = permissions?.includes('contributions:record') ?? false
  const isOwnActiveMembership = member?.status === 'active'
  if (!isOwnActiveMembership && !canRecordForGroup) {
    return Response.json({ error: { message: 'You can only submit a payment for your own active membership.' } }, { status: 403 })
  }
  if (member && member.status !== 'active') {
    return Response.json({ error: { message: 'Inactive memberships cannot submit new contributions.' } }, { status: 409 })
  }
  if (input.contribution_type === 'special' && !canRecordForGroup) {
    return Response.json({ error: { message: 'Special contributions require an authorized financial operator.' } }, { status: 403 })
  }
  const period = `${input.period.slice(0, 7)}-01`
  const { data: cycle, error: cycleError } = await auth.supabase
    .from('group_cycles')
    .select('id')
    .eq('group_id', input.group_id)
    .eq('status', 'open')
    .maybeSingle()
  if (cycleError) return databaseError(cycleError)
  if (!cycle) return Response.json({ error: { message: 'There is no open financial cycle for this payment.' } }, { status: 409 })

  let obligationId: string | null = null
  if (input.contribution_type !== 'special') {
    const { data: obligation, error: obligationError } = await auth.supabase
      .from('contribution_obligations')
      .select('id')
      .eq('group_id', input.group_id)
      .eq('cycle_id', cycle.id)
      .eq('member_id', input.member_id)
      .eq('period', period)
      .maybeSingle()
    if (obligationError) return databaseError(obligationError)
    if (!obligation) return Response.json({ error: { message: 'No obligation exists for this member and month. Ask an authorized operator to generate monthly obligations.' } }, { status: 409 })
    obligationId = obligation.id
  }

  const { data, error } = await auth.supabase.from('contributions').insert({
    ...input,
    period,
    cycle_id: cycle.id,
    obligation_id: obligationId,
    reference: input.reference ?? null,
  }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, contributionReviewSchema)
  if (parsed.response) return parsed.response
  const reviewedAt = new Date().toISOString()
  const { data, error } = await auth.supabase.from('contributions').update({ status: parsed.data.status, verified_by: auth.user!.id, verified_at: reviewedAt }).eq('id', parsed.data.id).select().single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
