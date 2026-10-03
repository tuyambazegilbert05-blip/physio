import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const minutesSchema = z.object({ minutes: z.string().trim().max(20000).nullable() })

export async function GET(_request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })
  const { data, error } = await auth.supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle()
  if (error) return databaseError(error)
  if (!data) return Response.json({ error: { message: 'The requested meeting was not found.' } }, { status: 404 })
  return Response.json({ data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })
  const parsed = await readJson(request, minutesSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('meetings').update({ minutes: parsed.data.minutes }).eq('id', meetingId).select('*').single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
