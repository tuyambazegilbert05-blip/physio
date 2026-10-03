import { groupCreateSchema } from '@/features/groups/schemas/group.schema'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

export async function GET() {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase.from('groups').select('id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at').order('created_at', { ascending: false })
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
  })
  if (createError) return databaseError(createError)
  const { data, error } = await auth.supabase.from('groups').select('id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at').eq('id', id).single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}
