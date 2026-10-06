import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const moduleKeys = [
  'member_registration', 'technical_access', 'contributions', 'shares', 'loan_requests', 'loan_approvals',
  'loan_repayments', 'social_fund', 'profit_distribution', 'expenses', 'reconciliation',
  'savings_cycles', 'meetings', 'announcements', 'chat',
] as const
const technicalPermissions = ['system:configure', 'system:maintenance', 'system:lock', 'system:modules', 'system:monitor', 'support:manage', 'security:manage', 'security:audit'] as const
const saveSchema = z.object({
  group_id: uuidSchema,
  status: z.enum(['normal', 'limited', 'maintenance', 'locked']),
  message: z.string().trim().max(500).nullable(),
  disabled_modules: z.array(z.enum(moduleKeys)).max(moduleKeys.length),
})

async function getPermissions(supabase: SupabaseClient<Database>, groupId: string) {
  const { data, error } = await supabase.rpc('current_group_permissions', { target_group: groupId })
  if (error) return { permissions: null, response: databaseError(error) }
  const permissions = data ?? []
  if (!technicalPermissions.some((permission) => permissions.includes(permission))) {
    return { permissions: null, response: Response.json({ error: { message: 'Technical access is not assigned for this Ikimina.' } }, { status: 403 }) }
  }
  return { permissions, response: null }
}

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid Ikimina is required.' } }, { status: 400 })
  const access = await getPermissions(auth.supabase, groupId!)
  if (access.response) return access.response
  const { data, error } = await auth.supabase.from('group_system_controls')
    .select('group_id,status,message,disabled_modules,changed_by,updated_at')
    .eq('group_id', groupId!).maybeSingle()
  if (error) return databaseError(error)
  return Response.json({
    data: {
      controls: data ?? { group_id: groupId, status: 'normal', message: null, disabled_modules: [], changed_by: null, updated_at: null },
      permissions: access.permissions,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, saveSchema)
  if (parsed.response) return parsed.response
  const access = await getPermissions(auth.supabase, parsed.data.group_id)
  if (access.response) return access.response
  const { data, error } = await auth.supabase.rpc('set_group_system_controls', {
    target_group: parsed.data.group_id,
    target_status: parsed.data.status,
    target_message: parsed.data.message,
    target_disabled_modules: [...new Set(parsed.data.disabled_modules)],
  })
  if (error) {
    if (error.code === 'P0001' || error.code === '22023') {
      return Response.json({ error: { message: error.message } }, { status: 403 })
    }
    return databaseError(error)
  }
  return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
}
