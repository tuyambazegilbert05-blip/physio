import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const repaymentSchema = z.object({
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  principal_amount: z.number().int().min(0).optional(),
  interest_amount: z.number().int().min(0).optional(),
  payment_method: z.enum(['cash', 'bank', 'mobile_money', 'other']).default('other'),
  reference: z.string().trim().max(160).nullable().optional(),
})
const repaymentReviewSchema = z.object({ id: uuidSchema, status: z.enum(['verified', 'rejected']), principal_amount: z.number().int().min(0).optional(), interest_amount: z.number().int().min(0).optional() })

export async function GET(_request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { loanId } = await params
  if (!uuidSchema.safeParse(loanId).success) return Response.json({ error: { message: 'A valid loan id is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('loan_repayments').select('*').eq('loan_id', loanId).order('received_at', { ascending: false }).limit(100)
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const { loanId } = await params
  if (!uuidSchema.safeParse(loanId).success) return Response.json({ error: { message: 'A valid loan id is required.' } }, { status: 400 })
  const parsed = await readJson(request, repaymentSchema)
  if (parsed.response) return parsed.response

  const { data: loan, error: loanError } = await auth.supabase.from('loans').select('group_id,member_id,status,outstanding_amount,outstanding_interest').eq('id', loanId).maybeSingle()
  if (loanError) return databaseError(loanError)
  if (!loan || !['active', 'defaulted'].includes(loan.status)) return Response.json({ error: { message: 'Repayments can only be recorded against a disbursed loan with a remaining balance.' } }, { status: 409 })
  const [memberResult, permissionsResult] = await Promise.all([
    auth.supabase.from('members').select('id').eq('id', loan.member_id).eq('user_id', auth.user!.id).eq('status', 'active').maybeSingle(),
    auth.supabase.rpc('current_group_permissions', { target_group: loan.group_id }),
  ])
  if (memberResult.error) return databaseError(memberResult.error)
  if (permissionsResult.error) return databaseError(permissionsResult.error)
  const isBorrower = Boolean(memberResult.data)
  const canRecord = permissionsResult.data?.includes('repayments:record') ?? false
  if (!isBorrower && !canRecord) return Response.json({ error: { message: 'Only the borrower or an authorized treasurer can record a repayment.' } }, { status: 403 })

  const interest = parsed.data.interest_amount ?? Math.min(parsed.data.amount, Number(loan.outstanding_interest))
  const principal = parsed.data.principal_amount ?? parsed.data.amount - interest
  if (principal + interest !== parsed.data.amount) return Response.json({ error: { message: 'The repayment amount must equal its principal and interest parts.' } }, { status: 400 })
  if (principal > Number(loan.outstanding_amount) || interest > Number(loan.outstanding_interest)) return Response.json({ error: { message: 'The repayment exceeds the current principal or interest due.' } }, { status: 422 })

  const directRecord = !isBorrower && canRecord
  const { data, error } = await auth.supabase.from('loan_repayments').insert({
    loan_id: loanId,
    group_id: loan.group_id,
    amount: parsed.data.amount,
    principal_amount: principal,
    interest_amount: interest,
    status: directRecord ? 'verified' : 'pending',
    created_by: auth.user!.id,
    received_by: auth.user!.id,
    verified_by: directRecord ? auth.user!.id : null,
    verified_at: directRecord ? new Date().toISOString() : null,
    payment_method: parsed.data.payment_method,
    reference: parsed.data.reference ?? null,
  }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, repaymentReviewSchema)
  if (parsed.response) return parsed.response

  const { data: repayment, error: repaymentError } = await auth.supabase.from('loan_repayments').select('amount,principal_amount,interest_amount,status').eq('id', parsed.data.id).maybeSingle()
  if (repaymentError) return databaseError(repaymentError)
  if (!repayment || repayment.status !== 'pending') return Response.json({ error: { message: 'This repayment is no longer awaiting review.' } }, { status: 409 })

  const principal = parsed.data.principal_amount ?? repayment.principal_amount
  const interest = parsed.data.interest_amount ?? repayment.interest_amount
  const amount = parsed.data.status === 'verified' ? principal + interest : repayment.amount
  const { data, error } = await auth.supabase.from('loan_repayments').update({ amount, principal_amount: principal, interest_amount: interest, status: parsed.data.status, verified_by: auth.user!.id, verified_at: new Date().toISOString() }).eq('id', parsed.data.id).select().single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
