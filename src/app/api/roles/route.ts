import { z } from 'zod'
import { groupRoles, type GroupAccess, type GroupRole, type RoleAssignment } from '@/types/role'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const assignableRoles = [
  'committee_member',
  'group_administrator',
  'treasurer',
  'secretary',
  'system_administrator',
  'technician',
  'security_administrator',
  'super_administrator',
] as const satisfies readonly GroupRole[]

const assignmentSchema = z.object({
  group_id: z.string().uuid(),
  email: z.email().trim().max(254),
  role: z.enum(assignableRoles),
})

const removalSchema = z.object({
  group_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(groupRoles),
})

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success)
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })

  const [
    { data: roles, error: rolesError },
    { data: permissions, error: permissionsError },
    { data: membership, error: membershipError },
    { data: rows, error: assignmentsError },
  ] = await Promise.all([
    auth.supabase.rpc('current_group_roles', { target_group: groupId! }),
    auth.supabase.rpc('current_group_permissions', { target_group: groupId! }),
    auth.supabase
      .from('members')
      .select('id,status')
      .eq('group_id', groupId!)
      .eq('user_id', auth.user!.id)
      .maybeSingle(),
    auth.supabase
      .from('group_role_assignments')
      .select('group_id,user_id,role_key,user_email,granted_at')
      .eq('group_id', groupId!)
      .order('role_key'),
  ])
  for (const error of [rolesError, permissionsError, membershipError, assignmentsError])
    if (error) return databaseError(error)

  const userIds = [...new Set((rows ?? []).map((row) => row.user_id))]
  const { data: profiles, error: profilesError } = userIds.length
    ? await auth.supabase.from('profiles').select('id,full_name').in('id', userIds)
    : { data: [], error: null }
  if (profilesError) return databaseError(profilesError)
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const assignments: RoleAssignment[] = (rows ?? []).map((row) => ({
    group_id: row.group_id,
    user_id: row.user_id,
    role_key: row.role_key as GroupRole,
    granted_at: row.granted_at,
    email: row.user_email,
    full_name: names.get(row.user_id) ?? row.user_email ?? 'Account',
  }))

  const data: GroupAccess = {
    group_id: groupId!,
    current_user_id: auth.user!.id,
    is_member: membership?.status === 'active',
    roles: (roles ?? []).filter((role): role is GroupRole =>
      groupRoles.includes(role as GroupRole),
    ),
    permissions: permissions ?? [],
    assignments,
  }
  return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, assignmentSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.rpc('assign_group_role', {
    target_group: parsed.data.group_id,
    target_email: parsed.data.email,
    target_role: parsed.data.role,
  })
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, removalSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.rpc('remove_group_role', {
    target_group: parsed.data.group_id,
    target_user: parsed.data.user_id,
    target_role: parsed.data.role,
  })
  if (error) return databaseError(error)
  return Response.json({ data })
}
