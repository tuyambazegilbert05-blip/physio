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
      'id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at',
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
  const { data: id, error: createError } = await auth.supabase.rpc('create_group', {
    group_name: parsed.data.name,
    contribution: parsed.data.contribution_amount,
    frequency: parsed.data.contribution_frequency,
    currency_code: parsed.data.currency,
    group_description: parsed.data.description,
    group_location: parsed.data.location ?? null,
    is_discoverable: parsed.data.discoverable,
  })
  if (createError) return logGroupDatabaseError('create_group RPC', createError)
  const { data, error } = await auth.supabase
    .from('groups')
    .select('id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at')
    .eq('id', id)
    .single()
  if (error) return logGroupDatabaseError('created group lookup', error)
  return Response.json({ data }, { status: 201 })
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
    return Response.json({ error: { message: 'You do not have permission to manage this group.' } }, { status: 403 })

  const { group_id, ...changes } = parsed.data
  const { data, error } = await auth.supabase
    .from('groups')
    .update(changes)
    .eq('id', group_id)
    .select('id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at')
    .maybeSingle()
  if (error) return databaseError(error)
  if (!data) return Response.json({ error: { message: 'The group could not be found.' } }, { status: 404 })
  return Response.json({ data })
}
