import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'
import { z } from 'zod'

const dateSchema = z.iso.date()
const cycleCreateSchema = z
  .object({
    action: z.literal('create_cycle'),
    group_id: uuidSchema,
    name: z.string().trim().min(2).max(120),
    starts_on: dateSchema,
    ends_on: dateSchema,
    share_price: z.number().int().positive().default(25000),
    contribution_amount: z.number().int().min(0).optional(),
    contribution_due_day: z.number().int().min(1).max(28),
    social_contribution_amount: z.number().int().min(0).default(5000),
    member_share_selection_enabled: z.boolean().default(false),
    member_share_min_units: z.number().positive().max(1000000).default(1),
    member_share_max_units: z.number().positive().max(1000000).nullable().default(null),
    member_share_required_units: z.number().positive().max(1000000).default(1),
    late_penalty: z.number().int().min(0),
    loan_limit: z.number().int().positive().default(2000000),
  })
  .superRefine((cycle, context) => {
    if (!cycle.member_share_selection_enabled) return
    if (cycle.share_price <= 0)
      context.addIssue({
        code: 'custom',
        path: ['share_price'],
        message: 'Set a positive share price to enable member share selection.',
      })
    if (
      cycle.member_share_max_units !== null &&
      cycle.member_share_max_units < cycle.member_share_min_units
    )
      context.addIssue({
        code: 'custom',
        path: ['member_share_max_units'],
        message: 'Maximum share units must be at least the minimum.',
      })
    if (
      cycle.member_share_required_units < cycle.member_share_min_units ||
      (cycle.member_share_max_units !== null &&
        cycle.member_share_required_units > cycle.member_share_max_units)
    )
      context.addIssue({
        code: 'custom',
        path: ['member_share_required_units'],
        message: 'Required share units must be within the selected range.',
      })
  })
const operationSchema = z.discriminatedUnion('action', [
  cycleCreateSchema,
  z.object({
    action: z.literal('cycle_status'),
    group_id: uuidSchema,
    cycle_id: uuidSchema,
    status: z.enum(['open', 'closing', 'closed', 'archived']),
    ends_on: dateSchema.nullable().optional(),
  }),
  z.object({
    action: z.literal('generate_obligations'),
    group_id: uuidSchema,
    cycle_id: uuidSchema,
    period: dateSchema,
  }),
  z.object({ action: z.literal('apply_penalties'), group_id: uuidSchema, period: dateSchema }),
  z.object({
    action: z.literal('record_share'),
    group_id: uuidSchema,
    cycle_id: uuidSchema,
    member_id: uuidSchema,
    direction: z.enum(['purchase', 'sale']),
    units: z.number().positive().max(1_000_000),
    unit_price: z.number().int().min(0).optional(),
    reference: z.string().trim().max(160).nullable().optional(),
  }),
  z.object({
    action: z.literal('verify_share'),
    id: uuidSchema,
    status: z.enum(['verified', 'rejected']),
  }),
  z.object({
    action: z.literal('record_bank_transaction'),
    group_id: uuidSchema,
    account_label: z.string().trim().min(1).max(120),
    transaction_date: z.iso.datetime(),
    description: z.string().trim().min(1).max(500),
    amount: z
      .number()
      .int()
      .refine((value) => value !== 0),
    reference: z.string().trim().min(1).max(160),
  }),
  z.object({
    action: z.literal('reconcile_bank_transaction'),
    id: uuidSchema,
    entity: z.enum(['contributions', 'loan_repayments', 'expenses', 'share_transactions']),
    entity_id: uuidSchema,
  }),
  z.object({
    action: z.literal('request_social_fund'),
    group_id: uuidSchema,
    member_id: uuidSchema,
    amount: z.number().int().positive(),
    reason: z.string().trim().min(5).max(2000),
  }),
  z.object({
    action: z.literal('decide_social_fund'),
    id: uuidSchema,
    status: z.enum(['approved', 'rejected', 'disbursed']),
    decision_note: z.string().trim().max(2000).nullable().optional(),
    reference: z.string().trim().max(160).nullable().optional(),
  }),
  z.object({
    action: z.literal('create_expense'),
    group_id: uuidSchema,
    cycle_id: uuidSchema.nullable(),
    category: z.enum(['operations', 'meeting', 'social_fund', 'profit_distribution', 'other']),
    description: z.string().trim().min(3).max(1000),
    funding_source: z.enum(['group', 'social_fund', 'profit']),
    amount: z.number().int().positive(),
    spent_on: dateSchema,
    payment_method: z.enum(['cash', 'bank', 'mobile_money', 'other']),
    reference: z.string().trim().max(160).nullable().optional(),
  }),
  z.object({
    action: z.literal('update_expense'),
    id: uuidSchema,
    status: z.enum(['approved', 'rejected', 'paid']),
  }),
  z.object({ action: z.literal('accrue_interest'), group_id: uuidSchema, period: dateSchema }),
  z.object({
    action: z.literal('close_month'),
    group_id: uuidSchema,
    cycle_id: uuidSchema.nullable(),
    period: dateSchema,
  }),
  z.object({ action: z.literal('approve_month_close'), closing_id: uuidSchema }),
  z.object({
    action: z.literal('calculate_profit'),
    group_id: uuidSchema,
    cycle_id: uuidSchema,
    period: dateSchema.nullable(),
  }),
  z.object({
    action: z.literal('set_profit_status'),
    id: uuidSchema,
    status: z.literal('distributed'),
  }),
  z.object({
    action: z.literal('record_profit_decision'),
    id: uuidSchema,
    decision: z.enum(['distribute', 'retain']),
    decision_reference: z.string().trim().min(2).max(160),
    reason: z.string().trim().min(5).max(2000),
    allocations: z.array(z.object({
      member_id: uuidSchema,
      amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      reference: z.string().trim().min(3).max(160),
    })).max(1000).default([]),
  }),
  z.object({
    action: z.literal('request_correction'),
    group_id: uuidSchema,
    closing_id: uuidSchema,
    entity: z.enum(['contributions', 'loans', 'loan_repayments', 'expenses', 'share_transactions']),
    entity_id: uuidSchema,
    reason: z.string().trim().min(5).max(2000),
    proposed_values: z.record(z.string(), z.unknown()),
  }),
])

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success)
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })

  const [
    cycles,
    shares,
    obligations,
    bankTransactions,
    socialRequests,
    expenses,
    interestCharges,
    closings,
    profits,
    corrections,
    members,
  ] = await Promise.all([
    auth.supabase
      .from('group_cycles')
      .select('*')
      .eq('group_id', groupId!)
      .order('cycle_number', { ascending: false }),
    auth.supabase
      .from('share_transactions')
      .select('*')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false })
      .limit(300),
    auth.supabase
      .from('contribution_obligations')
      .select('*')
      .eq('group_id', groupId!)
      .order('period', { ascending: false })
      .limit(500),
    auth.supabase
      .from('bank_transactions')
      .select('*')
      .eq('group_id', groupId!)
      .order('transaction_date', { ascending: false })
      .limit(300),
    auth.supabase
      .from('social_fund_requests')
      .select('*')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false })
      .limit(300),
    auth.supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId!)
      .order('spent_on', { ascending: false })
      .limit(300),
    auth.supabase
      .from('loan_interest_charges')
      .select('*')
      .eq('group_id', groupId!)
      .order('period', { ascending: false })
      .limit(300),
    auth.supabase
      .from('financial_period_closings')
      .select('*')
      .eq('group_id', groupId!)
      .order('period', { ascending: false })
      .limit(120),
    auth.supabase
      .from('profit_calculations')
      .select('*')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false })
      .limit(120),
    auth.supabase
      .from('financial_correction_requests')
      .select('*')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false })
      .limit(120),
    auth.supabase
      .from('members')
      .select('id,full_name,user_id,status')
      .eq('group_id', groupId!)
      .eq('status', 'active')
      .order('full_name'),
  ])
  const failed = [
    cycles,
    shares,
    obligations,
    bankTransactions,
    socialRequests,
    expenses,
    interestCharges,
    closings,
    profits,
    corrections,
    members,
  ].find((result) => result.error)
  if (failed?.error) return databaseError(failed.error)
  return Response.json({
    data: {
      cycles: cycles.data ?? [],
      shares: shares.data ?? [],
      obligations: obligations.data ?? [],
      bankTransactions: bankTransactions.data ?? [],
      socialRequests: socialRequests.data ?? [],
      expenses: expenses.data ?? [],
      interestCharges: interestCharges.data ?? [],
      closings: closings.data ?? [],
      profits: profits.data ?? [],
      corrections: corrections.data ?? [],
      members: members.data ?? [],
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, operationSchema)
  if (parsed.response) return parsed.response
  const userId = auth.user!.id
  const input = parsed.data
  let result: { data: unknown; error: { code?: string; message: string } | null }

  switch (input.action) {
    case 'create_cycle':
      result = await auth.supabase.rpc('create_group_cycle', {
        target_group: input.group_id,
        cycle_name: input.name,
        cycle_start: input.starts_on,
        cycle_end: input.ends_on,
        share_unit_price: input.share_price,
        monthly_contribution: input.contribution_amount ?? input.share_price,
        due_day: input.contribution_due_day,
        late_penalty_amount: input.late_penalty,
        max_loan: input.loan_limit,
        business_rules: {
          social_contribution_amount: input.social_contribution_amount,
          member_share_selection: {
            enabled: input.member_share_selection_enabled,
            min_units: input.member_share_min_units,
            max_units: input.member_share_max_units,
            required_units: input.member_share_required_units,
          },
        },
      })
      break
    case 'cycle_status':
      result = await auth.supabase.rpc('set_group_cycle_status', {
        target_group: input.group_id,
        target_cycle: input.cycle_id,
        next_status: input.status,
        cycle_end: input.ends_on ?? null,
      })
      break
    case 'generate_obligations':
      result = await auth.supabase.rpc('generate_monthly_obligations', {
        target_group: input.group_id,
        target_cycle: input.cycle_id,
        obligation_period: input.period,
      })
      break
    case 'apply_penalties':
      result = await auth.supabase.rpc('apply_contribution_penalties', {
        target_group: input.group_id,
        obligation_period: input.period,
      })
      break
    case 'record_share': {
      const { data: permissions, error: permissionError } = await auth.supabase.rpc(
        'current_group_permissions',
        { target_group: input.group_id },
      )
      if (permissionError) return databaseError(permissionError)
      const canManageShares = permissions?.includes('shares:manage') ?? false
      if (!canManageShares) {
        if (input.direction !== 'purchase') {
          return Response.json(
            { error: { message: 'Members can submit share purchases for their own account.' } },
            { status: 403 },
          )
        }
        const [memberResult, cycleResult] = await Promise.all([
          auth.supabase
            .from('members')
            .select('id')
            .eq('id', input.member_id)
            .eq('group_id', input.group_id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle(),
          auth.supabase
            .from('group_cycles')
            .select('id')
            .eq('id', input.cycle_id)
            .eq('group_id', input.group_id)
            .eq('status', 'open')
            .maybeSingle(),
        ])
        if (memberResult.error) return databaseError(memberResult.error)
        if (cycleResult.error) return databaseError(cycleResult.error)
        if (!memberResult.data)
          return Response.json(
            {
              error: {
                message: 'Share purchases can be submitted only for your active membership.',
              },
            },
            { status: 403 },
          )
        if (!cycleResult.data)
          return Response.json(
            { error: { message: 'The selected savings cycle is not open.' } },
            { status: 409 },
          )
      }
      result = await auth.supabase
        .from('share_transactions')
        .insert({
          group_id: input.group_id,
          cycle_id: input.cycle_id,
          member_id: input.member_id,
          direction: input.direction,
          units: input.units,
          reference: input.reference ?? null,
          created_by: userId,
        })
        .select()
        .single()
      break
    }
    case 'verify_share':
      result = await auth.supabase
        .from('share_transactions')
        .update({
          status: input.status,
          verified_by: userId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()
      break
    case 'record_bank_transaction':
      result = await auth.supabase
        .from('bank_transactions')
        .insert({
          group_id: input.group_id,
          account_label: input.account_label,
          transaction_date: input.transaction_date,
          description: input.description,
          amount: input.amount,
          reference: input.reference,
          imported_by: userId,
        })
        .select()
        .single()
      break
    case 'reconcile_bank_transaction':
      result = await auth.supabase.rpc('reconcile_bank_transaction', {
        target_transaction: input.id,
        target_entity: input.entity,
        target_entity_id: input.entity_id,
      })
      break
    case 'request_social_fund':
      result = await auth.supabase
        .from('social_fund_requests')
        .insert({
          group_id: input.group_id,
          member_id: input.member_id,
          amount_requested: input.amount,
          reason: input.reason,
          requested_by: userId,
        })
        .select()
        .single()
      break
    case 'decide_social_fund':
      result = await auth.supabase
        .from('social_fund_requests')
        .update({
          status: input.status,
          decision_note: input.decision_note ?? null,
          decided_by: userId,
          decided_at: new Date().toISOString(),
          disbursed_at: input.status === 'disbursed' ? new Date().toISOString() : null,
          disbursement_reference: input.reference ?? null,
        })
        .eq('id', input.id)
        .select()
        .single()
      break
    case 'create_expense':
      result = await auth.supabase
        .from('expenses')
        .insert({
          group_id: input.group_id,
          cycle_id: input.cycle_id,
          category: input.category,
          description: input.description,
          funding_source: input.funding_source,
          amount: input.amount,
          spent_on: input.spent_on,
          payment_method: input.payment_method,
          reference: input.reference ?? null,
          created_by: userId,
        })
        .select()
        .single()
      break
    case 'update_expense':
      result = await auth.supabase
        .from('expenses')
        .update({
          status: input.status,
          approved_by:
            input.status === 'approved' || input.status === 'rejected' ? userId : undefined,
          approved_at:
            input.status === 'approved' || input.status === 'rejected'
              ? new Date().toISOString()
              : undefined,
          paid_at: input.status === 'paid' ? new Date().toISOString() : undefined,
        })
        .eq('id', input.id)
        .select()
        .single()
      break
    case 'accrue_interest':
      result = await auth.supabase.rpc('accrue_monthly_interest', {
        target_group: input.group_id,
        interest_period: input.period,
      })
      break
    case 'close_month':
      result = await auth.supabase.rpc('close_financial_month', {
        target_group: input.group_id,
        closing_period: input.period,
        target_cycle: input.cycle_id,
      })
      break
    case 'approve_month_close':
      result = await auth.supabase.rpc('approve_financial_month', {
        target_closing: input.closing_id,
      })
      break
    case 'calculate_profit':
      result = await auth.supabase.rpc('calculate_cycle_profit', {
        target_group: input.group_id,
        target_cycle: input.cycle_id,
        profit_period: input.period,
      })
      break
    case 'set_profit_status':
      result = await auth.supabase.rpc('set_profit_calculation_status', {
        target_calculation: input.id,
        next_status: input.status,
      })
      break
    case 'record_profit_decision':
      result = await auth.supabase.rpc('record_committee_profit_decision', {
        target_calculation: input.id,
        decision_kind: input.decision,
        decision_reference: input.decision_reference,
        decision_reason: input.reason,
        proposed_allocations: input.allocations,
      })
      break
    case 'request_correction':
      result = await auth.supabase
        .from('financial_correction_requests')
        .insert({
          group_id: input.group_id,
          closing_id: input.closing_id,
          entity: input.entity,
          entity_id: input.entity_id,
          reason: input.reason,
          proposed_values: input.proposed_values,
          requested_by: userId,
        })
        .select()
        .single()
      break
  }

  if (result.error) return databaseError(result.error)
  return Response.json(
    { data: result.data },
    {
      status:
        input.action.startsWith('create_') ||
        input.action.startsWith('request_') ||
        input.action === 'record_share' ||
        input.action === 'record_bank_transaction'
          ? 201
          : 200,
    },
  )
}
