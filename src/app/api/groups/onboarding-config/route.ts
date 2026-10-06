import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { uuidSchema } from '@/lib/validations'

const fieldSchema = z.object({
  id: uuidSchema.optional(),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  type: z.enum(['text', 'textarea', 'number', 'date', 'phone', 'select', 'radio', 'checkbox']),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  active: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
})

const saveSchema = z.object({
  group_id: uuidSchema,
  terms_title: z.string().trim().max(160).default(''),
  terms_body: z.string().trim().max(12000).default(''),
  terms_required: z.boolean().default(true),
  fields: z.array(fieldSchema).max(30),
})

async function requireOnboardingManager(supabase: SupabaseClient<Database>, groupId: string) {
  const { data: permissions, error } = await supabase.rpc('current_group_permissions', { target_group: groupId })
  if (error) return { response: databaseError(error) }
  if (!permissions?.some((permission) => ['groups:manage', 'onboarding:manage'].includes(permission))) {
    return { response: Response.json({ error: { message: 'Member onboarding settings permission is required.' } }, { status: 403 }) }
  }
  return { response: null }
}

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group is required.' } }, { status: 400 })
  const access = await requireOnboardingManager(auth.supabase, groupId!)
  if (access.response) return access.response
  const admin = createAdminClient()
  const [termsResult, fieldsResult] = await Promise.all([
    admin.from('group_membership_terms').select('id,version,title,body,is_required').eq('group_id', groupId!).eq('is_current', true).maybeSingle(),
    admin.from('group_member_fields').select('id,label,description,field_type,is_required,options,is_active,display_order').eq('group_id', groupId!).order('display_order').order('created_at'),
  ])
  if (termsResult.error) return databaseError(termsResult.error)
  if (fieldsResult.error) return databaseError(fieldsResult.error)
  return Response.json({ data: { terms: termsResult.data, fields: fieldsResult.data ?? [] } }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, saveSchema)
  if (parsed.response) return parsed.response
  const access = await requireOnboardingManager(auth.supabase, parsed.data.group_id)
  if (access.response) return access.response
  const { data, error } = await auth.supabase.rpc('save_group_onboarding_config', {
    target_group: parsed.data.group_id,
    target_terms_title: parsed.data.terms_title,
    target_terms_body: parsed.data.terms_body,
    target_terms_required: parsed.data.terms_required,
    target_fields: parsed.data.fields,
  })
  if (error) {
    if (error.code === 'P0001' || error.code === '22023') {
      return Response.json({ error: { message: error.message } }, { status: 422 })
    }
    return databaseError(error)
  }
  return Response.json({ data })
}
