import { z } from 'zod'
import type { MeetingDecisionRecord } from '@/types/meeting'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const decisionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    title: z.string().trim().min(3).max(240),
    description: z.string().trim().max(3000).nullable().optional(),
    voting_closes_at: z.iso.datetime().nullable().optional(),
  }),
  z.object({ action: z.literal('vote'), decision_id: uuidSchema, vote: z.enum(['yes', 'no', 'abstain']) }),
  z.object({ action: z.literal('finalize'), decision_id: uuidSchema }),
])

type RouteContext = { params: Promise<{ meetingId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })

  const { data: meeting, error: meetingError } = await auth.supabase.from('meetings').select('id').eq('id', meetingId).maybeSingle()
  if (meetingError) return databaseError(meetingError)
  if (!meeting) return Response.json({ error: { message: 'The requested meeting was not found.' } }, { status: 404 })

  const [{ data: decisions, error: decisionsError }, { data: summaries, error: summariesError }] = await Promise.all([
    auth.supabase.from('meeting_decisions').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
    auth.supabase.rpc('meeting_vote_summary', { target_meeting: meetingId }),
  ])
  if (decisionsError) return databaseError(decisionsError)
  if (summariesError) return databaseError(summariesError)

  const summariesById = new Map((summaries ?? []).map((summary) => [summary.decision_id, summary]))
  const data: MeetingDecisionRecord[] = (decisions ?? []).map((decision) => ({
    ...decision,
    voting_deadline_passed: Boolean(
      decision.voting_closes_at && Date.parse(decision.voting_closes_at) <= Date.now(),
    ),
    ...(summariesById.get(decision.id) ?? { decision_id: decision.id, yes_count: 0, no_count: 0, abstain_count: 0, my_vote: null }),
  }))
  return Response.json({ data })
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })
  const parsed = await readJson(request, decisionActionSchema)
  if (parsed.response) return parsed.response
  const action = parsed.data

  const { data: meeting, error: meetingError } = await auth.supabase.from('meetings').select('id, group_id').eq('id', meetingId).maybeSingle()
  if (meetingError) return databaseError(meetingError)
  if (!meeting) return Response.json({ error: { message: 'The requested meeting was not found.' } }, { status: 404 })

  if (action.action === 'create') {
    if (action.voting_closes_at && Date.parse(action.voting_closes_at) <= Date.now()) {
      return Response.json({ error: { message: 'The voting close time must be in the future.' } }, { status: 422 })
    }
    const { data, error } = await auth.supabase.from('meeting_decisions').insert({
      meeting_id: meetingId,
      title: action.title,
      description: action.description || null,
      voting_open: true,
      voting_closes_at: action.voting_closes_at ?? null,
      created_by: auth.user!.id,
    }).select().single()
    if (error) return databaseError(error)
    return Response.json({ data }, { status: 201 })
  }

  if (action.action === 'vote') {
    const [{ data: member, error: memberError }, { data: decision, error: decisionError }] = await Promise.all([
      auth.supabase.from('members').select('id').eq('group_id', meeting.group_id).eq('user_id', auth.user!.id).eq('status', 'active').maybeSingle(),
      auth.supabase.from('meeting_decisions').select('id').eq('id', action.decision_id).eq('meeting_id', meetingId).maybeSingle(),
    ])
    if (memberError) return databaseError(memberError)
    if (decisionError) return databaseError(decisionError)
    if (!member) return Response.json({ error: { message: 'Only active group members can vote.' } }, { status: 403 })
    if (!decision) return Response.json({ error: { message: 'The requested decision was not found for this meeting.' } }, { status: 404 })
    const { data, error } = await auth.supabase.from('meeting_votes').insert({ decision_id: action.decision_id, member_id: member.id, vote: action.vote }).select().single()
    if (error) return databaseError(error)
    return Response.json({ data }, { status: 201 })
  }

  const { data, error } = await auth.supabase.rpc('finalize_meeting_vote', { target_decision: action.decision_id })
  if (error) return databaseError(error)
  return Response.json({ data: { id: data } })
}
