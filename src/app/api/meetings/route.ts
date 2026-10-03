import { meetingCreateSchema } from '@/features/meetings/schemas/meeting.schema'
import { uuidSchema } from '@/lib/validations'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('meetings').select('*').eq('group_id', groupId!).order('starts_at', { ascending: false }).limit(250)
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, meetingCreateSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('meetings').insert({ ...parsed.data, created_by: auth.user!.id, ends_at: parsed.data.ends_at ?? null, agenda: parsed.data.agenda ?? null, location: parsed.data.location ?? null }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}
