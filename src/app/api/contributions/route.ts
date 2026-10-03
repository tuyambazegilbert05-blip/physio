import { contributionCreateSchema } from '@/features/contributions/schemas/contribution.schema'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { z } from 'zod'

const contributionReviewSchema = z.object({ id: uuidSchema, status: z.enum(['verified', 'rejected']) })

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('contributions').select('*').eq('group_id', groupId!).order('period', { ascending: false }).limit(500)
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, contributionCreateSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('contributions').insert({ ...parsed.data, reference: parsed.data.reference ?? null }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, contributionReviewSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('contributions').update({ status: parsed.data.status, verified_by: parsed.data.status === 'verified' ? auth.user!.id : null, verified_at: parsed.data.status === 'verified' ? new Date().toISOString() : null }).eq('id', parsed.data.id).select().single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
