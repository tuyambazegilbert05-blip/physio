import { loanCreateSchema } from '@/features/loans/schemas/loan.schema'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { z } from 'zod'

const loanActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('decision'), id: uuidSchema, status: z.enum(['approved', 'rejected', 'active']), rejection_reason: z.string().trim().min(3).max(2000).nullable().optional(), due_date: z.iso.date().nullable().optional(), disbursement_reference: z.string().trim().max(160).nullable().optional() }),
  z.object({ action: z.literal('submit_draft'), id: uuidSchema }),
  z.object({ action: z.literal('cancel_approved'), id: uuidSchema, reason: z.string().trim().max(2000).nullable().optional() }),
  z.object({ action: z.literal('extend'), id: uuidSchema, due_date: z.iso.date() }),
  z.object({ action: z.literal('update_draft'), id: uuidSchema, principal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), interest_rate: z.number().min(0).max(100), term_months: z.number().int().min(1).max(120), purpose: z.string().trim().min(5).max(1000) }),
])

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const [loans, ownMembers] = await Promise.all([
    auth.supabase.from('loans').select('*').eq('group_id', groupId!).order('created_at', { ascending: false }).limit(500),
    auth.supabase.from('members').select('id').eq('group_id', groupId!).eq('user_id', auth.user!.id),
  ])
  if (loans.error) return databaseError(loans.error)
  if (ownMembers.error) return databaseError(ownMembers.error)
  const ownMemberIds = new Set((ownMembers.data ?? []).map((member) => member.id))
  return Response.json({ data: (loans.data ?? []).map((loan) => ({ ...loan, is_own: ownMemberIds.has(loan.member_id) })) })
}

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, loanCreateSchema)
  if (parsed.response) return parsed.response

  const { data: member, error: memberError } = await auth.supabase.from('members').select('id').eq('id', parsed.data.member_id).eq('group_id', parsed.data.group_id).eq('user_id', auth.user!.id).eq('status', 'active').maybeSingle()
  if (memberError) return databaseError(memberError)
  if (!member) return Response.json({ error: { message: 'An active member can apply only for their own account.' } }, { status: 403 })

  const { data: cycle, error: cycleError } = await auth.supabase.from('group_cycles').select('id,loan_limit').eq('group_id', parsed.data.group_id).eq('status', 'open').maybeSingle()
  if (cycleError) return databaseError(cycleError)
  if (!cycle) return Response.json({ error: { message: 'The group needs an open savings cycle before accepting loan applications.' } }, { status: 409 })
  if (cycle.loan_limit !== null && parsed.data.principal > cycle.loan_limit) return Response.json({ error: { message: 'The requested amount is above this cycle’s loan limit.' } }, { status: 422 })

  const { data, error } = await auth.supabase.from('loans').insert({
    group_id: parsed.data.group_id,
    member_id: parsed.data.member_id,
    cycle_id: cycle.id,
    principal: parsed.data.principal,
    outstanding_amount: parsed.data.principal,
    interest_rate: parsed.data.interest_rate,
    term_months: parsed.data.term_months,
    purpose: parsed.data.purpose,
    is_draft: parsed.data.is_draft,
    status: 'pending',
  }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, loanActionSchema)
  if (parsed.response) return parsed.response
  const input = parsed.data

  if (input.action === 'decision') {
    const { data, error } = await auth.supabase.rpc('decide_loan', {
      target_loan: input.id,
      next_status: input.status,
      target_due_date: input.due_date ?? null,
      decision_note: input.rejection_reason ?? null,
      disbursement_ref: input.disbursement_reference ?? null,
    })
    if (error) return databaseError(error)
    return Response.json({ data })
  }
  if (input.action === 'submit_draft') {
    const { data, error } = await auth.supabase.rpc('submit_loan_draft', { target_loan: input.id })
    if (error) return databaseError(error)
    return Response.json({ data })
  }
  if (input.action === 'cancel_approved') {
    const { data, error } = await auth.supabase.rpc('cancel_approved_loan', { target_loan: input.id, cancellation_note: input.reason ?? null })
    if (error) return databaseError(error)
    return Response.json({ data })
  }
  if (input.action === 'extend') {
    const { data, error } = await auth.supabase.rpc('extend_active_loan', { target_loan: input.id, new_due_date: input.due_date })
    if (error) return databaseError(error)
    return Response.json({ data })
  }

  const { data, error } = await auth.supabase.rpc('update_loan_draft', { target_loan: input.id, requested_principal: input.principal, requested_rate: input.interest_rate, requested_term: input.term_months, requested_purpose: input.purpose })
  if (error) return databaseError(error)
  return Response.json({ data })
}
