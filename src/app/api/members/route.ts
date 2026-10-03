import { memberCreateSchema } from '@/features/members/schemas/member.schema'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { z } from 'zod'

const memberStatusSchema = z.object({
  group_id: uuidSchema,
  status: z.enum(['active', 'inactive', 'suspended']),
})

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('members').select('id,group_id,user_id,full_name,email,phone,status,joined_at,created_at,updated_at').eq('group_id', groupId!).order('full_name')
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, memberCreateSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('members').insert({ ...parsed.data, email: parsed.data.email ?? null, phone: parsed.data.phone ?? null }).select('id,group_id,user_id,full_name,email,phone,status,joined_at,created_at,updated_at').single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const memberId = new URL(request.url).searchParams.get('member_id')
  if (!uuidSchema.safeParse(memberId).success) return Response.json({ error: { message: 'A valid member_id is required.' } }, { status: 400 })
  const parsed = await readJson(request, memberStatusSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('members').update({ status: parsed.data.status }).eq('id', memberId!).eq('group_id', parsed.data.group_id).select('id,group_id,user_id,full_name,email,phone,status,joined_at,created_at,updated_at').single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
