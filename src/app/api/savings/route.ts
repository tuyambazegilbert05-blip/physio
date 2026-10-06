import { uuidSchema } from '@/lib/validations'
import { databaseError, requireApiUser } from '@/lib/supabase/route'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success)
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { data: canReadGroupFinances, error: permissionError } = await auth.supabase.rpc(
    'has_group_permission',
    {
      target_group: groupId!,
      required_permission: 'financial:read',
    },
  )
  if (permissionError) return databaseError(permissionError)
  if (!canReadGroupFinances)
    return Response.json(
      { error: { message: 'You do not have permission to view group-wide savings.' } },
      { status: 403 },
    )
  const { data, error } = await auth.supabase
    .from('savings_summary')
    .select('*')
    .eq('group_id', groupId!)
    .single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
