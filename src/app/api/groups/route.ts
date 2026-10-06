import { groupCreateSchema, groupUpdateSchema } from '@/features/groups/schemas/group.schema'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

function logGroupDatabaseError(operation: string, error: { code?: string; message: string }) {
  console.error(`[Groups] ${operation} failed`, {
    code: error.code ?? 'unknown',
    ...(error.code === 'P0001' ? { reason: error.message } : {}),
  })
  return databaseError(error)
}

export async function GET() {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase
    .from('groups')
    .select(
      'id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at,description,location,discoverable',
    )
    .order('created_at', { ascending: false })
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, groupCreateSchema)
  if (parsed.response) return parsed.response

  const sharePrice = parsed.data.share_unit_price ?? parsed.data.contribution_amount ?? 25000
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: initResult, error: createError } = await auth.supabase.rpc('initialize_new_group', {
    group_name: parsed.data.name,
    group_description: parsed.data.description ?? '',
    group_location: parsed.data.location ?? null,
    is_discoverable: parsed.data.discoverable ?? true,
    currency_code: parsed.data.currency ?? 'RWF',
    cycle_start_date: parsed.data.cycle_start_date ?? todayStr,
    cycle_name: parsed.data.cycle_name ?? 'Cycle 1',
    share_unit_price: sharePrice,
    social_contribution: parsed.data.social_contribution ?? 5000,
    loan_max: parsed.data.loan_max ?? 2000000,
    rate_up_to_4_months: parsed.data.rate_up_to_4_months ?? 3,
    rate_over_4_months: parsed.data.rate_over_4_months ?? 5,
    due_day: parsed.data.due_day ?? 1,
    rules_title: parsed.data.rules_title ?? null,
    rules_body: parsed.data.rules_body ?? null,
    member_fields: parsed.data.member_fields ?? [],
  })

  if (createError) return logGroupDatabaseError('initialize_new_group RPC', createError)

  const groupId = (initResult as { group_id?: string })?.group_id
  if (!groupId) {
    return Response.json(
      { error: { message: 'Group initialization did not return an identifier.' } },
      { status: 500 },
    )
  }

  const { data, error } = await auth.supabase
    .from('groups')
    .select(
      'id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at,description,location,discoverable',
    )
    .eq('id', groupId)
    .single()
  if (error) return logGroupDatabaseError('created group lookup', error)

  return Response.json({ data: { ...data, initialization: initResult } }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, groupUpdateSchema)
  if (parsed.response) return parsed.response
  const { data: authorized, error: authorizationError } = await auth.supabase.rpc(
    'has_group_permission',
    { target_group: parsed.data.group_id, required_permission: 'groups:manage' },
  )
  if (authorizationError) return databaseError(authorizationError)
  if (!authorized)
    return Response.json(
      { error: { message: 'You do not have permission to manage this group.' } },
      { status: 403 },
    )

  const { group_id, ...changes } = parsed.data
  const { data, error } = await auth.supabase
    .from('groups')
    .update(changes)
    .eq('id', group_id)
    .select(
      'id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at,description,location,discoverable',
    )
    .maybeSingle()
  if (error) return databaseError(error)
  if (!data)
    return Response.json({ error: { message: 'The group could not be found.' } }, { status: 404 })
  return Response.json({ data })
}
