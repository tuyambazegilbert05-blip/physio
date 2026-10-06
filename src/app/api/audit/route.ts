import { databaseError, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'
import { canReadAuditView, securityAuditEntities } from '@/lib/audit-access'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const url = new URL(request.url)
  const groupId = url.searchParams.get('group_id')
  const securityView = url.searchParams.get('view') === 'security'
  if (!uuidSchema.safeParse(groupId).success)
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })

  const { data: permissions, error: permissionError } = await auth.supabase.rpc(
    'current_group_permissions',
    { target_group: groupId! },
  )
  if (permissionError) return databaseError(permissionError)
  if (!canReadAuditView(securityView ? 'security' : 'group', permissions)) {
    return Response.json(
      { error: { message: 'You do not have permission to review this group’s audit history.' } },
      { status: 403 },
    )
  }

  let query = auth.supabase
    .from('audit_logs')
    .select(
      'id,group_id,actor_id,action,entity,entity_id,details,permission_used,authority_roles,before_data,after_data,created_at',
    )
    .eq('group_id', groupId!)
    .order('created_at', { ascending: false })
    .limit(200)
  if (securityView) query = query.in('entity', [...securityAuditEntities])
  const { data, error } = await query
  if (error) return databaseError(error)
  return Response.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
